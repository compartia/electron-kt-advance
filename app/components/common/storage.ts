module kt.storage {
    const path = require('path');
    const electron = require('electron');
    const fs = require('fs');

    export class Storage {
        data: any;
        _path: string;

        constructor(opts) {
            const userDataPath = (electron.app || electron.remote.app).getPath('userData');
            this._path = path.join(userDataPath, opts.configName + '.json');
            this.data = parseDataFile(this._path, opts.defaults);
        }

        get(key) {
            return this.data[key];
        }

        set(key, val) {
            this.data[key] = val;

            fs.writeFileSync(this._path, JSON.stringify(this.data));
        }

        public addRecentProject(name: string, baseDir: string) {
            let arr = this.get("recentProjects");
            if (!arr) {
                arr = [];
            } else {
                let arrNew = [];
                arrNew.push(
                    { "name": name, "path": baseDir, count: 0 }
                );
                for (let e of arr) {
                    if (e.path != baseDir) {
                        arrNew.push(e);
                    }
                }
                arr = arrNew;

            }

            this.set("recentProjects", arr);
        }
    }

    export function parseDataFile(filePath, defaults): any {
        try {
            return JSON.parse(fs.readFileSync(filePath));
        } catch (error) {
            return defaults;
        }
    }
}



let CONF: kt.storage.Storage;

function initConf(): void {


    CONF = new kt.storage.Storage({
        configName: 'user-preferences',
        defaults: {
            recentProjects: [
                // {name:"dovecot", "path":"sdfsdfsdfsdf"},
                // {name:"redis", "path":"sdfsdfsdfsdf"}
            ]
        }
    });
    console.info("init config");
}

initConf();
