function aria2RPCClient() {
    printGlobalOption();
    printFeedButton();
}

document.querySelector('#submit_btn').addEventListener('click', (event) => {
    var header = ['Referer: ' + document.querySelector('#referer').value, 'User-Agent: ' + aria2RPC['useragent']];
    var entries = document.querySelector('#entries').value;
    var options = newTaskOptions({header});
    var request = entries.split('\n').map(url => ({id: '', jsonrpc: 2, method: 'aria2.addUri', params: [aria2RPC.jsonrpc['token'], [url], options]}));
    aria2RPCRequest(request, result => showNotification(entries), showNotification);
    removeNewTaskWindow();
});

document.querySelector('#entries').addEventListener('drop', (event) => {
    var file = event.dataTransfer.files[0];
    if (file.name.endsWith('metalink') || file.name.endsWith('meta4') || file.name.endsWith('torrent')) {
        fileReader(file, (blob, filename) => {
            var params = [aria2RPC.jsonrpc['token'], blob.slice(blob.indexOf(',') + 1)];
            var options = newTaskOptions();
            if (filename.endsWith('torrent')) {
                var method = 'aria2.addTorrent';
            }
            else {
                method = 'aria2.addMetalink';
                params = [...params, options];
            }
            aria2RPCRequest({id: '', jsonrpc: 2, method, params},
            result => showNotification(filename), showNotification);
            removeNewTaskWindow();
        }, true);
    }
});

function newTaskOptions(options = {}) {
    document.querySelectorAll('[aria2], [task]').forEach(field => {
        var name = field.getAttribute('aria2') ?? field.getAttribute('task');
        options[name] = field.value;
    });
    return options;
}

function removeNewTaskWindow() {
    parent.document.querySelector('[module="' + frameElement.id + '"]').classList.remove('checked');
    frameElement.style.display = 'none';
    setTimeout(() => frameElement.remove(), 500);
}
