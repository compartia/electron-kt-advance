module kt.fs {

    const path = require('path');
    const fs = require('fs');




    export function listFilesRecursively(dir: string, suffixFilter: string): Array<string> {
        console.info("iterating " + dir);
        let list = []
        return _allFilesSync(dir, suffixFilter, list);;
    }


    function _allFilesSync(dir: string, suffixFilter: string, fileList = []) {
        let files = fs.readdirSync(dir);

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

        return fileList
    }










}
