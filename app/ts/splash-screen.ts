

function initSplashScreeen(): void {

    const {ipcRenderer} = require('electron')

    console.info("init spash");

    ipcRenderer.on('loadingScreen-show', (event, prj) => {
        CONF.readConfig();
        let screen: any = (<any>document.getElementById("splash-layout"));
        if (screen && screen.attached) {
            screen.attached();
        }
    })

}


initSplashScreeen();
