import * as fs from 'fs';
import * as path from 'path';
import { FileInfo, CFile } from "../common/xmltypes";
import { FileSystem } from '../common/filesystem';


export function splitPath(filePath: string): string[] {
    return filePath.split(path.sep).filter(x => x.length);
}


export function build(container, projectFs: FileSystem): void {

    let tb = new TreeBuilder(projectFs);
    let root = tb.buildTree();
    container.data = root;
}


// class FileTreeItem implements FileInfo {
//     static nothing = [];

//     cfile: CFile;
//     icon: string;

//     constructor(cfile: CFile) {
//         this.cfile = cfile;
//     }

//     get name() {
//         return this.cfile.shortName;
//     }

//     get relativePath() {
//         return this.cfile.file;
//     }

//     get children() {
//         return FileTreeItem.nothing;
//     }

//     get dir(): boolean {
//         return false;
//     }

//     get open(): boolean {
//         return true;
//     }

//     get absFile() {
//         return this.cfile.absFile;
//     }
// }

class DirTreeItem implements FileInfo {
    children = [];

    shortName: string;
    relativePath: string;

    constructor(name: string, relativePath: string) {
        this.shortName = path.basename(name);
        this.relativePath = relativePath;
    }

    icon: string;
    open: boolean;

    get dir(): boolean {
        return true;
    }
}



class TreeBuilder {

    private fs: FileSystem;
    private root: DirTreeItem;

    constructor(projectFs: FileSystem) {
        this.fs = projectFs;
        this.root = new DirTreeItem(path.basename(this.fs.baseDir), '.');
        this.root.open = true;
        this.index[this.fs.baseDir] = this.root;
    }

    private index = {};
    private getDirItem(dir: string, abs?: boolean): DirTreeItem {

        if (!dir || dir === '.' || dir === '/') {
            return this.root;
        }

        let dirItem = this.index[dir];
        if (!dirItem) {
            //create and index it;
            let relativePath = abs ? dir : path.relative(this.fs.baseDir, dir);
            dirItem = new DirTreeItem(dir, relativePath);
            this.index[dir] = dirItem;

            let parent = this.getDirItem(path.dirname(dir), abs);
            parent.children.push(dirItem);
        }
        return dirItem;
    }




    public buildTree(): FileInfo {
        const dir = this.fs.baseDir;
        console.info("iterating  " + dir);


        for (const app of this.fs.apps) {
            for (const file of app.files) {
                const filedir = path.dirname(file.absFile);
                let dirItem: DirTreeItem = this.getDirItem(filedir, file.isAbs());
                // dirItem.children.push(new FileTreeItem(file));
                dirItem.children.push(file);
            }
        }
        // this.allFilesSync(dir, dir, root.children);
        return this.root;
    }


    private allFilesSync(root: string, dir: string, fileList: Array<FileInfo> = []): Array<FileInfo> {
        let files = fs.readdirSync(dir);



        fileList.sort((a, b) => {
            if (a.dir == b.dir) {
                return a.shortName.localeCompare(b.shortName);
            } else {
                if (a.dir) return 1;
                return -1;
            }
        });

        return fileList
    }
}





