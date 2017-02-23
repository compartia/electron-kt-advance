var app = require('app');
var ipc = require('ipc');
var BrowserWindow = require('browser-window');
var globalShortcut = require('global-shortcut');
var mainWindow = null;
app.on('ready', function() {
    createAppWindow();
    addAppEventListeners();
    // mainWindow.webContents.send('update-graph');
});

function createAppWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: 'app/icons/Icon.png'
    });
    // mainWindow.loadUrl('file://' + __dirname + '/app/components/tf_graph/index.html');
    mainWindow.loadUrl('file://' + __dirname + '/app/index.html');
    mainWindow.webContents.openDevTools();
}

function addAppEventListeners() {
    app.on('window-all-closed', function() {
        quit();
    });
    ipc.on('quit', function() {
        quit();
    });
}

function quit() {
    app.quit();
}
