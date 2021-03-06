const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const { ipcMain } = require('electron')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow,
    loadingScreen,
    windowParams = {
        width: 900,
        height: 500,
        show: false,
        frame: false
    },
    mainWindowParams = {
        width: 1250,
        height: 850,
        show: false,
        webPreferences: { experimentalFeatures: true }
    };

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow(mainWindowParams);

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, '/index.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.webContents.on('did-finish-load', () => {
        // console.log("app path is:" + app.getAppPath());
        // nothing
    });

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null
    });


    ipcMain.on('project', (event, project) => {
        console.log("ipcMain on project");
        project.appPath = app.getAppPath();
        console.log(project);
        loadingScreen.hide();
        mainWindow.send('project-open', project);
        mainWindow.show();
    });

    ipcMain.on('open-project', (event, arg) => {
        console.log("ipcMain on open-project" + event + "\t" + arg);
        if (!loadingScreen) {
            createSplashScreen();
        } else {
            loadingScreen.show();
            loadingScreen.send('loadingScreen-show', {});
        }

    });

}

function createSplashScreen() {
    loadingScreen = new BrowserWindow(Object.assign(windowParams, { parent: mainWindow }));

    loadingScreen.loadURL(url.format({
        pathname: path.join(__dirname, '/splash.html'),
        protocol: 'file:',
        slashes: true
    }))

    loadingScreen.webContents.on('did-finish-load', () => {
        loadingScreen.show();
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createSplashScreen();
    createWindow();
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
})
