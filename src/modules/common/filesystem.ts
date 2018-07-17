//C project filesystem

import * as path from 'path';
import * as fs from 'fs';

import { JLocation } from '../../generated/kt-json';
import { FileContents, parseSourceFile } from './source';
import * as fstools from './fstools';
import { CApp } from './xmltypes';
 

export const SEMANTICS_DIR = "semantics";
export const CONTRACTS_DIR = "ktacontracts";


export class FileSystem {

    
    private _baseDir: string;
    // sources: string;
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

    public normalizeSourcePath(app:CApp, loc: JLocation): string {
        //todo: xxx: this is called too often for large projects

        /*
            typically it is "semantics/sourcefiles"
        */
        const sourceBaseRelative = path.relative(this.baseDir, app.sourceDir);

        if (!!loc) {
            if (path.isAbsolute(loc.file)) {
                return path.normalize(loc.file);
            } else {
                return path.normalize(path.join(sourceBaseRelative, loc.file));
            }

        }
        return path.normalize(path.join(sourceBaseRelative, "_unknown_"));
    }

    public listFilesRecursively(  suffixFilter: string): Array<string> {
        return fstools.listFilesRecursively(this.baseDir, suffixFilter);        
    }

    public loadFile(relativePath: string): Promise<FileContents> {

        let filename = path.join(this.baseDir, relativePath);
        console.info("reading " + filename);
    
        return new Promise((resolve, reject) => {
            fs.readFile(filename, 'utf8', (err, data: string) => {
                if (err) {
                    console.log(err);
                    reject(null);
                } else {
                    let fileContents: FileContents = {
                        lines: parseSourceFile(data)
                    }
                    resolve(fileContents);
                }
                // data is the contents of the text file we just read
            });
        });
    }
}