//C project filesystem

import * as path from 'path';
import * as fs from 'fs';

import { FileContents, parseSourceFile } from './source';
import * as fstools from './fstools';
import { CApp, CFile } from './xmltypes';

export const CONTRACTS_DIR = "ktacontracts";


class CFileImpl implements CFile {
    app: CApp;
    private name: string;
    private _abs;

    private _existsOverride: boolean | null = null;

    constructor(capp: CApp, name: string) {
        this.app = capp;
        this.name = name;
        this._abs = path.isAbsolute(name);
    }

    get dirName() {
        return path.dirname(this.relativePath);
    }

    get exists(): boolean {
        if (this._existsOverride === false) {
            return false;
        }

        return !!this.app.actualSourceDir;
    }

    set exists(exists: boolean) {
        this._existsOverride = exists;
    }

    public isAbs(): boolean {
        return this._abs;
    }

    get dir() {
        return false;
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
            return path.join(this.app.baseDir, this.name);
    }

    get actualFile(): string {

        if (this._abs) {
            return this.name;
        } else {

            if (!this.exists) {
                return this.app.actualSourceDir + "/" + this.name;
            }

            return path.join(this.app.actualSourceDir, this.name);
        }

    }


}

class CAppImpl implements CApp {
    private _filesMap = {};
    files: CFile[] = [];
    /**
    * abs path
    */
    baseDir: string;
    actualSourceDir: string;
    /*
    typically it is "semantics/sourcefiles"
    */
    sourceBaseRelative: string;

    constructor(baseDir: string, sourceBaseRelative: string, actualSourceDir: string) {
        this.sourceBaseRelative = sourceBaseRelative;
        this.baseDir = baseDir;
        this.actualSourceDir = actualSourceDir;
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

    public static normalizeDirPath(dir: string): string {
        if (!dir) return dir;

        if (!dir.endsWith('/'))
            return dir + '/';
        else return dir;

    }

    public getCApp(absSourceDir: string, actualSourceDir?: string): CApp {

        absSourceDir = FileSystem.normalizeDirPath(absSourceDir);

        let app = this.appsMap[absSourceDir];
        if (!app) {
            app = new CAppImpl(
                absSourceDir,
                FileSystem.normalizeDirPath(path.relative(this.baseDir, absSourceDir)),
                FileSystem.normalizeDirPath(actualSourceDir));

            this.appsMap[absSourceDir] = app;
            this.apps.push(app);
        }
        return app;
    }

    private _baseDir: string;

    contractsDir: string;
    appPath: string;

    constructor(baseDir: string, appPath: string) {
        this._baseDir = path.normalize(baseDir);
        /** application installation path */
        this.appPath = appPath;;
    }



    get baseDir() {
        return this._baseDir;
    }

    get projectName() {
        return path.basename(this.baseDir);
    }

    get guiJson() {
        return path.join(this.baseDir, '.kt-gui.json');
    }


    public listFilesRecursively(suffixFilter: string): Array<string> {
        return fstools.listFilesRecursively(this.baseDir, suffixFilter);
    }

    public loadFile(file: CFile): Promise<FileContents> {


        console.info("reading " + file.actualFile);

        return new Promise((resolve, reject) => {
            if (!file.exists) {
                reject(`${file.relativePath} :location is not known`);
            } else if (!fs.existsSync(file.actualFile)) {
                file.exists = false;
                reject(`${file.actualFile} does not exist`);
            } else {
                fs.readFile(file.actualFile, 'utf8', (err, data: string) => {
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