
module kt.treeview {

    const path = require('path');
    const fs = require('fs');


    export function build(container): void {
        let root = tree(kt.Globals.project.baseDir);

        container.data = root;

        console.info(container);
        console.info(root);
    }




    export function tree(dir) {
        console.info("iterating " + dir);
        let tree = {
            children: [],
            name: dir
        }
        allFilesSync(dir, dir, tree.children);
        return tree;
    }


    export function allFilesSync(root: string, dir: string, fileList = []) {
        let files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);

            let stats = fs.statSync(filePath);
            let toAdd = file.endsWith(".c") | file.endsWith(".h") | file.endsWith(".cpp") | file.endsWith(".hpp");
            let icon = file.endsWith(".c") ? "check" : file.endsWith(".h") ? "check" : "space-bar"
            let isDirectory = stats.isDirectory();
            let relativePath = path.relative(root, filePath);

            if (isDirectory || toAdd) {
                fileList.push(
                    isDirectory
                        ?
                        {
                            "name": file,
                            "relativePath": relativePath,
                            "icon": "folder-open",
                            "children": allFilesSync(root, filePath)
                        }
                        :
                        {
                            "icon": icon,
                            "relativePath": relativePath,
                            "name": file
                        }
                );
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
