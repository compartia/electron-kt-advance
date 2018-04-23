
const path = require('path');
const fs = require('fs');

export interface FileContents {
    // src: string;
    lines: SourceLine[];
}

export interface SourceLine {
    index: number;
    text: string;
    stats: any;
}


export function listFilesRecursively(dir: string, suffixFilter: string): Array<string> {
    console.info("iterating " + dir);
    let list = []
    return _allFilesSync(dir, suffixFilter, list);;
}

export function loadFile(baseDir: string, relativePath: string): Promise<FileContents> {

    let filename = path.join(baseDir, relativePath);
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


function parseSourceFile(contents: string): SourceLine[] {
    let lines = contents.split(/\r\n|\r|\n/g);
    let ret: SourceLine[] = [];
    let index: number = 1;
    for (let line of lines) {
        ret.push({
            index: index,
            text: line,
            stats: {
                violations: 0,
                open: 0
            }
        });
        index++;
    }
    return ret;
}


function _allFilesSync(dir: string, suffixFilter: string, fileList = []) {
    let files = fs.readdirSync(dir);

    if (files) {
        files.forEach(file => {

            const filePath = path.join(dir, file);
            let stats = fs.statSync(filePath);
            let isDirectory = stats.isDirectory();
            if (!isDirectory) {
                if (file.endsWith(suffixFilter)) {

                    fileList.push(filePath);
                }
            } else {
                _allFilesSync(filePath, suffixFilter, fileList);
            }

        });
    }
    return fileList
}
