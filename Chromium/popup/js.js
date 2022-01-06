var activeQueue = document.querySelector('div#active');
var waitingQueue = document.querySelector('div#waiting');
var stoppedQueue = document.querySelector('div#stopped');
var currentTab = -1;

document.querySelectorAll('[tab]').forEach((tab, index, tabs) => {
    tab.addEventListener('click', event => {
        currentTab !== - 1 && tabs[currentTab].classList.remove('checked');
        currentTab = currentTab === index ? tab.classList.remove('checked') ?? -1 : tab.classList.add('checked') ?? index;
        activeQueue.style.display = [-1, 0].includes(currentTab) ? 'block' : 'none';
        waitingQueue.style.display = [-1, 1].includes(currentTab) ? 'block' : 'none';
        stoppedQueue.style.display = [-1, 2].includes(currentTab) ? 'block' : 'none';
    });
});

document.querySelectorAll('[module]').forEach(module => {
    module.addEventListener('click', event => {
        open(module.getAttribute('module') + '?popup', '_self');
    });
});

document.querySelector('#purdge_btn').addEventListener('click', event => {
    aria2RPCCall({method: 'aria2.purgeDownloadResult'}, result => {
        activeQueue.innerHTML = waitingQueue.innerHTML = stoppedQueue.innerHTML = '';
        aria2RPCRefresh();
    });
});

function aria2RPCClient() {
    aria2RPCCall([
        {method: 'aria2.getGlobalStat'}, {method: 'aria2.tellActive'},
        {method: 'aria2.tellWaiting', params: [0, 999]}, {method: 'aria2.tellStopped', params: [0, 999]}
    ], ([[global], [active], [waiting], [stopped]]) => {
        document.querySelector('#message').style.display = 'none';
        document.querySelector('#active.stats').innerText = global.numActive;
        document.querySelector('#waiting.stats').innerText = global.numWaiting;
        document.querySelector('#stopped.stats').innerText = global.numStopped;
        document.querySelector('#download.stats').innerText = bytesToFileSize(global.downloadSpeed) + '/s';
        document.querySelector('#upload.stats').innerText = bytesToFileSize(global.uploadSpeed) + '/s';
        active.forEach((active, index) => printTaskDetail(active, index, activeQueue));
        waiting.forEach((waiting, index) => printTaskDetail(waiting, index, waitingQueue));
        stopped.forEach((stopped, index) => printTaskDetail(stopped, index, stoppedQueue));
    }, error => {
        document.querySelector('#message').innerText = error;
        document.querySelector('#message').style.display = 'block';
        activeQueue.innerHTML = waitingQueue.innerHTML = stoppedQueue.innerHTML = '';
    }, true);
}

function printTaskDetail(result, index, queue) {
    var task = document.getElementById(result.gid) ?? appendTaskDetail(result);
    if (task.parentNode !== queue) {
        queue.insertBefore(task, queue.childNodes[index]);
        task.setAttribute('status', result.status);
        task.querySelector('#error').innerText = result.errorMessage ?? '';
        task.querySelector('#retry_btn').style.display = !result.bittorrent && ['error', 'removed'].includes(result.status) ? 'inline-block' : 'none';
        if (result.status !== 'active') {
            updateTaskDetail(task, result);
        }
    }
    if (result.status === 'active') {
        updateTaskDetail(task, result);
    }
}

function updateTaskDetail(task, {gid, status, files, bittorrent, completedLength, totalLength, downloadSpeed, uploadSpeed, connections, numSeeders}) {
    task.querySelector('#name').innerText = bittorrent && bittorrent.info ? bittorrent.info.name : files[0].path ? files[0].path.slice(files[0].path.lastIndexOf('/') + 1) : files[0].uris[0] ? files[0].uris[0].uri : gid;
    task.querySelector('#local').innerText = bytesToFileSize(completedLength);
    updateEstimated(task, (totalLength - completedLength) / downloadSpeed);
    task.querySelector('#connect').innerText = bittorrent ? numSeeders + ' (' + connections + ')' : connections;
    task.querySelector('#download').innerText = bytesToFileSize(downloadSpeed) + '/s';
    task.querySelector('#upload').innerText = bytesToFileSize(uploadSpeed) + '/s';
    task.querySelector('#ratio').innerText = task.querySelector('#ratio').style.width = ((completedLength / totalLength * 10000 | 0) / 100) + '%';
    task.querySelector('#ratio').className = status;
}

function appendTaskDetail({gid, bittorrent, totalLength}) {
    var task = document.querySelector('#template').cloneNode(true);
    task.id = gid;
    task.querySelector('#remote').innerText = bytesToFileSize(totalLength);
    task.querySelector('#upload').parentNode.style.display = bittorrent ? 'inline-block' : 'none';
    task.querySelector('#remove_btn').addEventListener('click', event => {
        aria2RPCCall({method: ['active', 'waiting', 'paused'].includes(task.getAttribute('status')) ? 'aria2.forceRemove' : 'aria2.removeDownloadResult', params: [gid]},
        result => ['complete', 'error', 'paused', 'removed'].includes(task.getAttribute('status')) ? task.remove() : task.querySelector('#name').innerText = '⏳');
    });
    task.querySelector('#invest_btn').addEventListener('click', event => open('task/index.html?' + (bittorrent ? 'bt' : 'http') + '#' + gid, '_self'));
    task.querySelector('#retry_btn').addEventListener('click', event => {
        aria2RPCCall([
            {method: 'aria2.getFiles', params: [gid]}, {method: 'aria2.getOption', params: [gid]},
            {method: 'aria2.removeDownloadResult', params: [gid]}
        ], ([[files], [options]]) => {
            aria2RPCCall({method: 'aria2.addUri', params: [files[0].uris.map(({uri}) => uri), options]},
            result => task.remove());
        });
    });
    task.querySelector('#meter').addEventListener('click', event => {
        aria2RPCCall({method: task.getAttribute('status') === 'paused' ? 'aria2.unpause' : 'aria2.pause', params: [gid]},
        result => task.querySelector('#name').innerText = '⏳');
    });
    return task;
}

function updateEstimated(task, number) {
    if (isNaN(number) || number === Infinity) {
        task.querySelector('#infinite').style.display = 'inline-block';
    }
    else {
        var days = number / 86400 | 0;
        var hours = number / 3600 - days * 24 | 0;
        var minutes = number / 60 - days * 1440 - hours * 60 | 0;
        var seconds = number - days * 86400 - hours * 3600 - minutes * 60 | 0;
        task.querySelector('#day').innerText = days;
        task.querySelector('#day').parentNode.style.display = days > 0 ? 'inline-block' : 'none';
        task.querySelector('#hour').innerText = hours;
        task.querySelector('#hour').parentNode.style.display = hours > 0 ? 'inline-block' : 'none';
        task.querySelector('#minute').innerText = minutes;
        task.querySelector('#minute').parentNode.style.display = minutes > 0 ? 'inline-block' : 'none';
        task.querySelector('#second').innerText = seconds;
        task.querySelector('#infinite').style.display = 'none';
    }
}
