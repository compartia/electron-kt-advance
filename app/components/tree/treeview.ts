
module kt.treeview {

    const path = require('path');
    const fs = require('fs');

    export function splitPath(filePath:string):string[] {
        return filePath.split(path.sep);
    }


    export function build(container, project:kt.Globals.Project): void {
        let root = tree(project.baseDir);

        container.data = root;

        console.info(container);
        console.info(root);
    }

    export interface FileInfo {
        name: string;
        relativePath: string;
        icon: string;
        open: boolean;
        children: Array<FileInfo>;
        dir: boolean;
    }

    export function tree(dir) {
        console.info("iterating " + dir);
        let tree: FileInfo = {
            children: new Array<FileInfo>(),
            name: <string>path.basename(dir),
            open: true,
            icon: "",
            relativePath: ".",
            dir: true
        }
        allFilesSync(dir, dir, tree.children);
        return tree;
    }


    export function allFilesSync(root: string, dir: string, fileList: Array<FileInfo> = []): Array<FileInfo> {
        let files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);

            let stats = fs.statSync(filePath);
            let toAdd = file.endsWith(".c") | file.endsWith(".h") | file.endsWith(".cpp") | file.endsWith(".hpp");
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
                    fileInfo.children = allFilesSync(root, filePath);
                    fileInfo.dir = true
                }

                fileList.push(fileInfo);
            }
        });

        fileList.sort((a, b) => {
            if (a.children && !b.children) {
                return -1;
            } else if (!a.children && b.children) {
                return 1;
            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                return 1;
            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                return -1;
            }
            return 0;
        });

        return fileList
    }










}
