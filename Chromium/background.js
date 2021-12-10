var g_fileSize = 0;
chrome.runtime.getPlatformInfo(platform => {
    aria2Platform = platform.os
});

chrome.contextMenus.create({
    title: chrome.i18n.getMessage('extension_name'),
    id: 'downwitharia2',
    contexts: ['link']
});

chrome.contextMenus.onClicked.addListener(info => {
    if (info.menuItemId === 'downwitharia2') {
        startDownload({url: info.linkUrl, referer: info.pageUrl, domain: getDomainFromUrl(info.pageUrl)});
    }
});

chrome.browserAction.setBadgeBackgroundColor({color: '#3cc'});

chrome.downloads.onChanged.addListener(item => {
    console.log(item);
    if (item.fileSize) {
        g_fileSize = item.fileSize.current;
        console.log(g_fileSize);
    }
    if (!item.filename || aria2RPC.capture['mode'] === '0'|| aria2Session.url.startsWith('blob') || aria2Session.url.startsWith('data')) {
        // g_fileSize = 0;
        return;
    }

    aria2Session.filename = getFileNameFromUri(item.filename.current);
    aria2Session.domain = getDomainFromUrl(aria2Session.referer);
    aria2Session.folder = aria2RPC.folder['mode'] === '1' ? item.filename.current.slice(0, item.filename.current.indexOf(aria2Session.filename)) : aria2RPC.folder['mode'] === '2' ? aria2RPC.folder['uri'] : null;

    if (captureDownload(aria2Session.domain, getFileExtension(aria2Session.filename), g_fileSize)) {
        chrome.downloads.cancel(item.id, () => {
            chrome.downloads.erase({id: item.id}, () => {
                startDownload(aria2Session);
            });
        });
    }
});

chrome.downloads.onCreated.addListener(item => {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        aria2Session = {url: item.finalUrl, referer: item.referrer ? item.referrer : tabs[0].url, fileSize: item.fileSize};
    });
});

function startDownload({url, referer, domain, filename, folder}, options = {}) {
    chrome.cookies.getAll({url}, cookies => {
        options['header'] = ['Cookie:', 'Referer: ' + referer, 'User-Agent: ' + aria2RPC['useragent']];
        cookies.forEach(cookie => options['header'][0] += ' ' + cookie.name + '=' + cookie.value + ';');
        if (folder != '') {
            options['dir'] = folder;
        }
        if (filename) {
            options['out'] = filename;
        }
        if (aria2RPC.proxy['resolve'].includes(domain)) {
            options['all-proxy'] = aria2RPC.proxy['uri'];
        }
        downloadWithAria2(url, options);
    });
}

function captureDownload(domain, fileExt, fileSize) {
    console.log('reject ------------------------')
    console.log(aria2RPC.capture['reject'].includes(domain));
    if (aria2RPC.capture['reject'].includes(domain)) {
        return false;
    }
    console.log('mode -----------------------');
    console.log(aria2RPC.capture['mode'] === '2' || aria2RPC.capture['mode'] === '1');
    if (!(aria2RPC.capture['mode'] === '2' || aria2RPC.capture['mode'] === '1')) {
        return false;
        // return true;
    }
    console.log('resolve -----------------------');
    console.log(aria2RPC.capture['resolve']);
    console.log(aria2RPC.capture['resolve'].includes(domain));
    if (aria2RPC.capture['resolve'].length != 0 && !aria2RPC.capture['resolve'].includes(domain)) {
        return false;
        // return true;
    }
    console.log('fileExt ------------------------');
    console.log(aria2RPC.capture['fileExt'].includes(fileExt))
    if (aria2RPC.capture['fileExt'].length != 0 && !aria2RPC.capture['fileExt'].includes(fileExt)) {
        return false;
        // return true;
    }
    console.log('filesize --------------------');
    console.log(aria2RPC.capture['fileSize'] > 0 && fileSize >= aria2RPC.capture['fileSize']);
    console.log(g_fileSize);
    console.log(fileSize);
    if (!(aria2RPC.capture['fileSize'] > 0 && fileSize >= aria2RPC.capture['fileSize'])) {
        return false;
        // return true;
    }
    console.log(fileSize);
    g_fileSize = 0;
    return true;
}

function getDomainFromUrl(url) {
    var host = /^https?:\/\/([^\/]+)\//.exec(url)[1];
    var hostname = /:\d{2,5}$/.test(host) ? host.slice(0, host.lastIndexOf(':')) : host;
    if (hostname.includes(':')) {
        return hostname.slice(1, -1);
    }
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$|^[^\.]+\.[^\.]+$/.test(hostname)) {
        return hostname;
    }
    var suffix = /([^\.]+)\.([^\.]+)\.([^\.]+)$/.exec(hostname);
    var gSLD = ['com', 'net', 'org', 'edu', 'gov', 'co', 'ne', 'or', 'me'];
    return gSLD.includes(suffix[2]) ? suffix[1] + '.' + suffix[2] + '.' + suffix[3] : suffix[2] + '.' + suffix[3];
}

function getFileNameFromUri(uri) {
    var index = aria2Platform === 'win' ? uri.lastIndexOf('\\') : uri.lastIndexOf('/');
    return uri.slice(index + 1);
}

function getFileExtension(filename) {
    return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

function aria2RPCClient() {
    aria2RPCRequest({id: '', jsonrpc: 2, method: 'aria2.getGlobalStat', params: [aria2RPC.jsonrpc['token']]},
    global => chrome.browserAction.setBadgeText({text: global.numActive === '0' ? '' : global.numActive}),
    error => {
        if (aria2Error === 0) {
            aria2Error = showNotification(error) ?? 1;
        }
    }, true);
}
