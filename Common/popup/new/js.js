function aria2RPCAssist() {
    printGlobalOption();
    printFeedButton();
}

document.querySelector('#submit_btn').addEventListener('click', (event) => {
    var referer = document.querySelector('#referer').value;
    var options = newTaskOptions();
    document.querySelector('#entries').split('\n').forEach(url => newDownloadRequest({url, referer}, options));
    removeNewTaskWindow();
});

document.querySelector('#entries').addEventListener('drop', (event) => {
    var file = event.dataTransfer.files[0];
    if (file.name.endsWith('metalink')) {
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            var metalink = btoa(unescape(encodeURIComponent(reader.result)));
            aria2RPCRequest({id: '', jsonrpc: 2, method: 'aria2.addMetalink', params: [token, metalink, newTaskOptions()]},
            result => {
                showNotification(file.name);
                removeNewTaskWindow();
            });
        };
    }
});

function removeNewTaskWindow() {
    parent.document.querySelector('[module="' + frameElement.id + '"]').classList.remove('checked');
    frameElement.style.display = 'none';
    setTimeout(() => frameElement.remove(), 500);
}

function newTaskOptions(options = {}) {
    document.querySelectorAll('[aria2], [task]').forEach(field => {
        var name = field.getAttribute('aria2') ?? field.getAttribute('task');
        options[name] = field.value;
    });
    return options;
}

function newDownloadRequest(request, options) {
    if (/^(https?|ftp):\/\/|^magnet:\?/i.test(request.url)) {
        downloadWithAria2(request, options);
    }
    else {
        showNotification('URI is invalid');
    }
}
