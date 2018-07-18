import * as fs from 'fs';
import * as path from 'path';
import { FileInfo } from "../common/xmltypes";
import { FileSystem } from '../common/filesystem';


export function splitPath(filePath: string): string[] {
    return filePath.split(path.sep);
}


export function build(container, projectFs: FileSystem): void {

    let tb = new TreeBuilder(projectFs);
    let root = tb.buildTree();
    container.data = root;
}


class TreeBuilder {
    
    private projectFs: FileSystem;

    constructor(projectFs: FileSystem) {
        this.projectFs = projectFs;
    }


    public buildTree(): FileInfo {
        const dir = this.projectFs.baseDir;
        console.info("iterating  " + dir);
        let tree: FileInfo = {
            children: new Array<FileInfo>(),
            name: <string>path.basename(dir),
            open: true,
            icon: "",
            relativePath: ".",
            dir: true
        }
        this.allFilesSync(dir, dir, tree.children);
        return tree;
    }


    private allFilesSync(root: string, dir: string, fileList: Array<FileInfo> = []): Array<FileInfo> {
        let files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);

            let stats = fs.statSync(filePath);
            let toAdd = file.endsWith(".c") || file.endsWith(".h") || file.endsWith(".cpp") || file.endsWith(".hpp");
            let icon = file.endsWith(".c") ? "check" : file.endsWith(".h") ? "check" : "space-bar"
            let isDirectory = stats.isDirectory();
            let relativePath = path.relative(root, filePath);

            if (isDirectory || toAdd) {
                let fileInfo: FileInfo = {
                    children: new Array<FileInfo>(),
                    name: file,
                    open: false,
                    relativePath: relativePath,
                    icon: icon,
                    dir: false
                };

                if (isDirectory) {
                    fileInfo.icon = "folder-open";
                    fileInfo.children = this.allFilesSync(root, filePath); //recursion
                    fileInfo.dir = true
                }

                fileList.push(fileInfo);
            }
        });

        fileList.sort((a, b) => {
            if (a.dir == b.dir) {
                return a.name.localeCompare(b.name);
            } else {
                if (a.dir) return 1;
                return -1;
            }
        });

        return fileList
    }
}





