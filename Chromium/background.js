var disabled = false;
var download_info = new Object()
download_info = {};

chrome.contextMenus.create({
    title: chrome.i18n.getMessage('extension_name'),
    id: 'downwitharia2',
    contexts: ['link']
});

chrome.contextMenus.onClicked.addListener(info => {
    startDownload({url: info.linkUrl, referer: info.pageUrl, domain: getDomainFromUrl(info.pageUrl)});
});

chrome.downloads.onDeterminingFilename.addListener(item => {
    if (item.fileSize) { download_info.fileSize = item.fileSize; }
    if (aria2RPC.capture['mode'] === '0' || item.finalUrl.startsWith('blob') || item.finalUrl.startsWith('data')) {
        disabled = true;
        download_info = {};
        return;
    }

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        download_info.url = item.finalUrl;
        download_info.referer = item.referrer && item.referrer !== 'about:blank' ? item.referrer : tabs[0].url;
        download_info.domain = getDomainFromUrl(download_info.referer);
        download_info.filename = item.filename;
    });
});

chrome.downloads.onChanged.addListener(item => {
    if (disabled === true){
        disabled = false;
        download_info = {};
        return;
    }
    if (item.fileSize) { download_info.fileSize = item.fileSize.current; }
    if (item.filename) {
        download_info.path = item.filename.current;
        var url = download_info.url;
        var referer = download_info.referer;
        var domain = download_info.domain;
        var filename = download_info.filename;

        captureDownload(domain, getFileExtension(filename), download_info.fileSize) &&
            chrome.downloads.cancel(item.id, () => {
                var folder = aria2RPC.folder['mode'] === '1' ? download_info.path.slice(0, download_info.path.indexOf(filename)) : aria2RPC.folder['mode'] === '2' ? aria2RPC.folder['uri'] : null;
                chrome.downloads.erase({id: item.id}, () => {
                    startDownload({url, referer, domain, filename, folder});
                    disabled = false;
                    download_info = {};
                });
            });
    }
});

function startDownload({url, referer, domain, filename, folder}, options = {}) {
    chrome.cookies.getAll({url}, cookies => {
        options['header'] = ['Cookie:', 'Referer: ' + referer, 'User-Agent: ' + aria2RPC['useragent']];
        cookies.forEach(cookie => options['header'][0] += ' ' + cookie.name + '=' + cookie.value + ';');
        if (folder != '') {
            options['dir'] = folder;
        }
        options['out'] = filename;
        options['all-proxy'] = aria2RPC.proxy['resolve'].includes(domain) ? aria2RPC.proxy['uri'] : '';
        aria2RPCCall({method: 'aria2.addUri', params: [[url], options]}, result => showNotification(url), showNotification);
    });
}

function captureDownload(domain, fileExt, fileSize) {
    if (aria2RPC.capture['reject'].includes(domain)) {
        return false;
    }
    if (!(aria2RPC.capture['mode'] === '2' || aria2RPC.capture['mode'] === '1')) {
        return false;
        // return true;
    }
    if (aria2RPC.capture['resolve'].length != 0 && !aria2RPC.capture['resolve'].includes(domain)) {
        return false;
        // return true;
    }
    if (aria2RPC.capture['fileExt'].length != 0 && !aria2RPC.capture['fileExt'].includes(fileExt)) {
        return false;
        // return true;
    }
    if (!(aria2RPC.capture['fileSize'] > 0 && fileSize >= aria2RPC.capture['fileSize'])) {
        return false;
        // return true;
    }
    return true;
}

function getDomainFromUrl(url) {
    var host = /^[^:]+:\/\/([^\/]+)\//.exec(url)[1];
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

function getFileExtension(filename) {
    return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

function aria2RPCClient() {
    aria2RPCCall({method: 'aria2.getGlobalStat'}, global => {
        chrome.browserAction.setBadgeBackgroundColor({color: global.numActive === '0' ? '#cc3' : '#3cc'});
        chrome.browserAction.setBadgeText({text: global.numActive});
    }, error => {
        chrome.browserAction.setBadgeBackgroundColor({color: '#c33'});
        chrome.browserAction.setBadgeText({text: 'E'});
        showNotification(error);
    }, true);
}