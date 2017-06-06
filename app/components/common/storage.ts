module kt.storage {
    const path = require('path');
    const electron = require('electron');
    const fs = require('fs');

    export class Storage {
        data: any;
        _path: string;
        defaults: string;

        constructor(opts) {
            const userDataPath = (electron.app || electron.remote.app).getPath('userData');
            this._path = path.join(userDataPath, opts.configName + '.json');
            this.defaults = opts.defaults;
            this.readConfig();
        }

        public readConfig(): void {

            try {
                this.data = JSON.parse(fs.readFileSync(this._path));
            } catch (error) {
                this.data = this.defaults;
            }
        }

        get(key) {
            return this.data[key];
        }

        set(key, val) {
            this.data[key] = val;
            fs.writeFileSync(this._path, JSON.stringify(this.data));
            console.info("saving config file");
        }

        public addRecentProject(name: string, baseDir: string) {
            let arr = this.get("recentProjects");
            if (!arr) {
                arr = [];
            } else {
                let arrNew = [];
                arrNew.push(
                    { "name": name, "baseDir": baseDir, count: 0 }
                );
                for (let e of arr) {
                    if (e.baseDir != baseDir) {
                        arrNew.push(e);
                    }
                }
                arr = arrNew;

            }

            this.set("recentProjects", arr);
        }
    }


}



let CONF: kt.storage.Storage;

function initConf(): void {


    CONF = new kt.storage.Storage({
        configName: 'user-preferences',
        defaults: {
            recentProjects: [

            ]
        }
    });
    console.info("init config");
}

initConf();
