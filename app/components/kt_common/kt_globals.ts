
module kt.Globals {
    const path = require('path');
    const fs = require('fs');

    export const CH_DIR: string = "ch_analysis";

    export var TABS = [
        'summary', 'source', 'proof obligations', 'assumptions', 'graphs'
    ];



    export class Filter {

        private _functionName: string;
        private _file: kt.treeview.FileInfo;


        set functionName(_functionName: string) {
            this._functionName = _functionName;
        }

        get functionName() {
            return this._functionName;
        }

        get fileName() {
            return this._file.relativePath;
        }

        set file(file: kt.treeview.FileInfo) {
            if (this._file != file) {
                this._functionName = null;
            }
            this._file = file;
        }

        private acceptFile(po: kt.graph.PONode): boolean {
            if (!this.fileName) {
                return true;
            } else {
                if(!this._file.dir){
                    return po.file == this.fileName;
                }else{
                    // let relative=path.relative(this.fileName, po.file);
                    return po.file.startsWith(this.fileName);
                }

            }
        }

        private acceptFunction(po: kt.graph.PONode): boolean {
            if (!this.functionName) {
                return true;
            } else {
                return po.functionName == this.functionName;
            }
        }

        public accept(po: kt.graph.PONode): boolean {
            return this.acceptFile(po) && this.acceptFunction(po);
        }

    }

    export const PO_FILTER: Filter = new Filter();

    export class Project {
        functionByFile: { [key: string]: Array<kt.xml.CFunction> } = {};
        baseDir: string;
        analysisDir: string;
        stats: kt.stats.Stats;

        proofObligations: Array<kt.graph.PONode> = [];
        _filteredProofObligations: Array<kt.graph.PONode> = null;


        constructor(baseDir: string) {
            this.baseDir = baseDir;
        }


        public onFilterChanged(filter) {
            this._filteredProofObligations = null;
        }

        get filteredProofObligations(): Array<kt.graph.PONode> {
            if (!this._filteredProofObligations) {
                let filter = (x) => PO_FILTER.accept(x);
                this._filteredProofObligations = kt.graph.sortPoNodes(_.filter(this.proofObligations, filter));
            }
            return this._filteredProofObligations;
        }

        public open(baseDir: string, tracker: tf.ProgressTracker): Promise<{ [key: string]: Array<kt.xml.CFunction> }> {
            this.baseDir = baseDir;
            this.analysisDir = path.join(this.baseDir, CH_DIR);

            console.info("opening new project:" + baseDir);



            let reader: kt.xml.XmlReader = new kt.xml.XmlReader();
            tracker.setMessage("reading XML data");

            const readFunctionsMapTracker = tf.graph.util.getSubtaskTracker(tracker, 100, 'reading functions map (*._cfile.xml)');

            return reader.readFunctionsMap(this.analysisDir, readFunctionsMapTracker);
        }

        public buildStatistics(): kt.stats.Stats {
            this.stats = new kt.stats.Stats();
            this.stats.build(this);
            return this.stats;
        }
    }

    export function onBigArray<X>(array: Array<X>, op: (x: Array<X>) => Array<X>, tracker: tf.ProgressTracker): Array<X> {
        const len = array.length;
        const chunkSize = 1000;
        const numberOfChunks = len / chunkSize;

        var ret: Array<X> = [];
        for (let i = 0; i <= len; i += chunkSize) {
            let part = array.slice(i, i + chunkSize);
            let processed = op(part);
            ret = ret.concat(processed);
            tracker.updateProgress(100.0001 / numberOfChunks);
            tracker.setMessage(i + " of " + len);
        }

        return ret;
    }

    export function openNewProject(tracker: tf.ProgressTracker): Promise<{ [key: string]: Array<kt.xml.CFunction> }> {
        let dir = kt.fs.selectDirectory();
        if (dir && dir.length > 0) {

            let projectDir = kt.fs.getChDir(dir[0]);
            if (projectDir) {
                projectDir = path.dirname(projectDir);
                project = new Project(projectDir);

                return project.open(projectDir, tracker);

            } else {
                const msg = kt.Globals.CH_DIR + " dir not found";
                tracker.reportError(msg, new Error(msg));
            }

        }
        return null;
    }


    export var project: Project = new Project(null);

}
