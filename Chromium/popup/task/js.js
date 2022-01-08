var gid = location.hash.slice(1);
var type = location.search.slice(1);
var http = document.querySelector('[data-http] #form');
var bt = document.querySelector('[data-bt] #form');
var torrent = [];

document.body.setAttribute('data-aria2', type);

document.querySelector('#manager').addEventListener('change', event => {
    event.target.name && aria2RPCCall({method: 'aria2.changeOption', params: [gid, {[event.target.name]: event.target.value}]});
});

document.querySelector('#session').addEventListener('click', event => {
    history.back();
});

document.querySelectorAll('.block').forEach(block => {
    var field = block.parentNode.querySelector('input');
    block.addEventListener('click', event => {
        !field.disabled && (block.style.display = field.focus() ?? 'none');
    });
    field.addEventListener('blur', event => {
        block.style.display = 'block';
    });
});

document.querySelector('#append button').addEventListener('click', event => {
    aria2RPCCall({method: 'aria2.changeUri', params: [gid, 1, [], [document.querySelector('#append input').value]]}, result => document.querySelector('#append input').value = '');
});

http.addEventListener('click', event => {
    event.ctrlKey ? aria2RPCCall({method: 'aria2.changeUri', params: [gid, 1, [event.target.innerText], []]}) : navigator.clipboard.writeText(event.target.innerText);
});

bt.addEventListener('click', event => {
    if (event.target.id === 'index') {
        var index = torrent.indexOf(event.target.innerText);
        var files = index !== -1 ? [...torrent.slice(0, index), ...torrent.slice(index + 1)] : [...torrent, event.target.innerText];
        aria2RPCCall({method: 'aria2.changeOption', params: [gid, {'select-file': files.join()}]}, result => torrent = files);
    }
});

function aria2RPCClient() {
    printButton(document.querySelector('#manager [data-feed]'), (name, value) => aria2RPCCall({method: 'aria2.changeOption', params: [gid, {[name]: value}]}));
    aria2RPCCall({method: 'aria2.getOption', params: [gid]}, options => printOptions(document.querySelectorAll('#manager input[name]'), options));
    aria2RPCCall({method: 'aria2.tellStatus', params: [gid]}, ({status, bittorrent, completedLength, totalLength, downloadSpeed, uploadSpeed, files}) => {
        var disabled = ['complete', 'error'].includes(status);
        document.querySelector('#session').innerText = bittorrent && bittorrent.info ? bittorrent.info.name : files[0].path.slice(files[0].path.lastIndexOf('/') + 1) || files[0].uris[0].uri;
        document.querySelector('#session').className = status;
        document.querySelector('#local').innerText = bytesToFileSize(completedLength);
        document.querySelector('#ratio').innerText = ((completedLength / totalLength * 10000 | 0) / 100) + '%';
        document.querySelector('#remote').innerText = bytesToFileSize(totalLength);
        document.querySelector('#download').innerText = bytesToFileSize(downloadSpeed) + '/s';
        document.querySelector('#upload').innerText = bytesToFileSize(uploadSpeed) + '/s';
        document.querySelector('[name="max-download-limit"]').disabled = disabled;
        document.querySelector('[name="max-upload-limit"]').disabled = disabled || type === 'http';
        document.querySelector('[name="all-proxy"]').disabled = disabled;
        type === 'http' && printTaskUris(http, files[0].uris) || type === 'bt' && printTaskFiles(bt, files);
    }, null, true);
}

function printTableCell(table, resolve) {
    var cell = table.parentNode.querySelector('#template').cloneNode(true);
    cell.removeAttribute('id');
    typeof resolve === 'function' && resolve(cell);
    table.appendChild(cell);
    return cell;
}

function printTaskUris(table, uris) {
    var cells = table.querySelectorAll('button');
    uris.forEach(({uri, status}, index) => {
        var cell = cells[index] ?? printTableCell(table);
        cell.innerText = uri;
        cell.className = status === 'used' ? 'active' : 'waiting';
    });
    cells.forEach((cell, index) => index > uris.length && cell.remove());
}

function printTaskFiles(table, files) {
    var cells = table.querySelectorAll('.file');
    files.forEach(({index, selected, path, length, completedLength}, at) => {
        var cell = cells[at] ?? printTableCell(table, cell => {
            cell.querySelector('#index').innerText = index;
            cell.querySelector('#name').innerText = path.slice(path.lastIndexOf('/') + 1);
            cell.querySelector('#name').title = path;
            cell.querySelector('#size').innerText = bytesToFileSize(length);
            selected === 'true' && torrent.push(index);
        });
        cell.querySelector('#index').className = selected === 'true' ? 'active' : 'error';
        cell.querySelector('#ratio').innerText = ((completedLength / length * 10000 | 0) / 100) + '%';
    });
}
