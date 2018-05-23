const path = require('path');
const electron = require('electron');
const fs = require('fs');

import { JsonReadyProject } from './globals';
import { KT_VERSION } from '../../version';

export function loadProjectMayBe(baseDir: string): JsonReadyProject {
    const projectPath = path.join(baseDir, '.kt-gui.json');
    try {
        console.log("reading " + projectPath);
        const prjson = <JsonReadyProject>JSON.parse(fs.readFileSync(projectPath));
        console.log("OK");
        return prjson;
    } catch (error) {
        console.warn("cannot read existing kt project stats: " + error);
        return null;
    }
}

export class Storage {
    data: any;
    _path: string;
    defaults: string;
    KT_VERSION = KT_VERSION;

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

    public saveProject(project: JsonReadyProject): string {
        const projectPath = path.join(project.baseDir, '.kt-gui.json');

        const jsonstring = JSON.stringify(project, (key, value) => {
            if ('inputs' === key || 'outputs' === key || 'po' === key) {
                return;
            }
            return value;
        }, '\t');

        fs.writeFileSync(projectPath, jsonstring);
        console.log("saving project data to " + projectPath);
        return projectPath;
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



export const CONF: Storage = new Storage({
    configName: 'user-preferences',
    defaults: {
        recentProjects: []
    }
});
