var kt;
(function (kt) {
    var treeview;
    (function (treeview) {
        var path = require('path');
        var fs = require('fs');
        function splitPath(filePath) {
            return filePath.split(path.sep);
        }
        treeview.splitPath = splitPath;
        function build(container, project) {
            var root = tree(project.baseDir);
            container.data = root;
            console.info(container);
            console.info(root);
        }
        treeview.build = build;
        var FileInfoImpl = (function () {
            function FileInfoImpl() {
            }
            Object.defineProperty(FileInfoImpl.prototype, "name", {
                get: function () {
                    return path.basename(this.relativePath);
                },
                enumerable: true,
                configurable: true
            });
            return FileInfoImpl;
        }());
        treeview.FileInfoImpl = FileInfoImpl;
        function tree(dir) {
            console.info("iterating " + dir);
            var tree = {
                children: new Array(),
                name: path.basename(dir),
                open: true,
                icon: "",
                relativePath: ".",
                dir: true
            };
            allFilesSync(dir, dir, tree.children);
            return tree;
        }
        treeview.tree = tree;
        function allFilesSync(root, dir, fileList) {
            if (fileList === void 0) { fileList = []; }
            var files = fs.readdirSync(dir);
            files.forEach(function (file) {
                var filePath = path.join(dir, file);
                var stats = fs.statSync(filePath);
                var toAdd = file.endsWith(".c") | file.endsWith(".h") | file.endsWith(".cpp") | file.endsWith(".hpp");
                var icon = file.endsWith(".c") ? "check" : file.endsWith(".h") ? "check" : "space-bar";
                var isDirectory = stats.isDirectory();
                var relativePath = path.relative(root, filePath);
                if (isDirectory || toAdd) {
                    var fileInfo = {
                        children: new Array(),
                        name: file,
                        open: false,
                        relativePath: relativePath,
                        icon: icon,
                        dir: false
                    };
                    if (isDirectory) {
                        fileInfo.icon = "folder-open";
                        fileInfo.children = allFilesSync(root, filePath);
                        fileInfo.dir = true;
                    }
                    fileList.push(fileInfo);
                }
            });
            fileList.sort(function (a, b) {
                if (a.children && !b.children) {
                    return -1;
                }
                else if (!a.children && b.children) {
                    return 1;
                }
                else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    return 1;
                }
                else if (a.name.toLowerCase() > b.name.toLowerCase()) {
                    return -1;
                }
                return 0;
            });
            return fileList;
        }
        treeview.allFilesSync = allFilesSync;
    })(treeview = kt.treeview || (kt.treeview = {}));
})(kt || (kt = {}));
