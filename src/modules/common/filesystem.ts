//C project filesystem

import * as path from 'path';
import * as fs from 'fs';

import { JLocation } from '../../generated/kt-json';
import { FileContents, parseSourceFile } from './source';
import * as fstools from './fstools';
import { CApp, CFile } from './xmltypes';


export const SEMANTICS_DIR = "semantics";
export const CONTRACTS_DIR = "ktacontracts";


class CFileImpl implements CFile {
    app: CApp;
    private name: string;

    private _abs;

    public isAbs():boolean{
        return this._abs;
    }

    constructor(capp: CApp, name: string) {
        this.app = capp;
        this.name = name;
        this._abs = path.isAbsolute(name);
    }

    get shortName(): string {
        return path.basename(this.name);
    }

    get relativePath(): string {
        if (this._abs) {
            return this.name;
        } else
            return path.normalize(path.join(this.app.sourceBaseRelative, this.name));
    }
    get absFile(): string {
        if (this._abs) {
            return this.name;
        } else
            return path.join(this.app.sourceDir, this.name);
    }
}

class CAppImpl implements CApp {
    private _filesMap = {};
    files: CFile[] = [];
    /**
    * abs path
    */
    sourceDir: string;
    /*
    typically it is "semantics/sourcefiles"
    */
    sourceBaseRelative: string;

    constructor(sourceDir: string, sourceBaseRelative: string) {
        this.sourceBaseRelative = sourceBaseRelative;
        this.sourceDir = sourceDir;
    }

    getCFile(name: string): CFile {
        let file = this._filesMap[name];
        if (!file) {
            file = new CFileImpl(this, name);
            this._filesMap[name] = file;
            this.files.push(file);
        }
        return file;
    }
}



export class FileSystem {

    private appsMap: { [key: string]: CApp } = {};
    apps: CApp[] = [];

    public reduce() {
        // let dirs = Object.keys(this.apps);
        // if (dirs.length == 1) {
        //     let dir = dirs[0];
        //     this.apps[dir].sourceBaseRelative = "";
        // }
    }



    public getCApp(absSourceDir): CApp {
        let app = this.appsMap[absSourceDir];
        if (!app) {
            app = new CAppImpl(absSourceDir, path.relative(this.baseDir, absSourceDir));
            this.appsMap[absSourceDir] = app;
            this.apps.push(app);
        }
        return app;
    }

    private _baseDir: string;
    // sources: string;
    contractsDir: string;
    appPath: string;

    constructor(baseDir: string, appPath: string) {
        this._baseDir = path.normalize(baseDir);
        /** application installation path */
        this.appPath = appPath;;
    }


    // /** a project may have many source directories (like Kendra). Each considered as an app */
    // public getAppDir(file) {

    //     const xmldir = path.dirname(file);
    //     let appDir = xmldir; d
    //     const cdir = path.dirname(c.name);
    //     if (xmldir.endsWith(cdir)) {
    //         appDir = xmldir.substr(0, xmldir.indexOf(cdir))
    //     }

    // }

    get baseDir() {
        return this._baseDir;
    }

    get projectName() {
        return path.basename(this.baseDir);
    }

    get guiJson() {
        return path.join(this.baseDir, '.kt-gui.json');
    }

    // public normalizeSourcePath(app: CApp, loc: JLocation): string {
    //     //todo: xxx: this is called too often for large projects

    //     /*
    //         typically it is "semantics/sourcefiles"
    //     */
    //     const sourceBaseRelative = path.relative(this.baseDir, app.sourceDir);

    //     if (!!loc) {
    //         if (path.isAbsolute(loc.file)) {
    //             return path.normalize(loc.file);
    //         } else {
    //             return path.normalize(path.join(sourceBaseRelative, loc.file));
    //         }

    //     }
    //     return path.normalize(path.join(sourceBaseRelative, "_unknown_"));
    // }

    public listFilesRecursively(suffixFilter: string): Array<string> {
        return fstools.listFilesRecursively(this.baseDir, suffixFilter);
    }

    public loadFile(file: CFile): Promise<FileContents> {


        console.info("reading " + file.absFile);

        return new Promise((resolve, reject) => {

            if (!fs.existsSync(file.absFile)) {
                reject(`${file.absFile} does not exist`);
            } else {
                fs.readFile(file.absFile, 'utf8', (err, data: string) => {
                    if (err) {

                        console.log(err);
                        reject(err);

                    } else {
                        let fileContents: FileContents = {
                            lines: parseSourceFile(data)
                        }
                        resolve(fileContents);
                    }
                    // data is the contents of the text file we just read
                });
            }


        });
    }
}