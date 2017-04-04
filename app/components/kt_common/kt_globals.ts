
module kt.Globals {
    const path = require('path');
    const fs = require('fs');

    export const CH_DIR: string = "ch_analysis";

    export var TABS = [
        'summary', 'source', 'proof obligations', 'assumptions', 'graphs'
    ];


    export class Project {
        functionByFile: { [key: string]: Array<kt.xml.CFunction> } = {};
        baseDir: string;
        analysisDir: string;
        stats: kt.stats.Stats;

        proofObligations: Array<kt.graph.PONode> = [];


        constructor(baseDir: string) {
            this.baseDir = baseDir;
        }

        public open(baseDir: string, tracker: tf.ProgressTracker): Promise<{ [key: string]: Array<kt.xml.CFunction> }> {
            this.baseDir = baseDir;
            this.analysisDir = path.join(this.baseDir, CH_DIR);

            console.info("opening new project:" + baseDir);

            this.stats = new kt.stats.Stats();

            let reader: kt.xml.XmlReader = new kt.xml.XmlReader();
            tracker.setMessage("reading XML data");

            const readFunctionsMapTracker = tf.graph.util.getSubtaskTracker(tracker, 100, 'reading functions map (*._cfile.xml)');

            return reader.readFunctionsMap(this.analysisDir, readFunctionsMapTracker);
        }

        public buildStatistics() {
            this.stats.build(this);
        }

        public getPOsByFile(filename: string, tracker: tf.ProgressTracker): Array<kt.graph.PONode> {
            let filter = (xx) => _.filter(
                xx,
                (x: kt.graph.PONode) => { return x.file == filename });

            return kt.graph.sortPoNodes(onBigArray(this.proofObligations, filter, tracker));
        }

        public getPOsByFileFunc(filename: string, functionName: string, tracker: tf.ProgressTracker): Array<kt.graph.PONode> {
            let filter = (xx) => _.filter(
                xx,
                (x: kt.graph.PONode) => { return x.file == filename && x.functionName == functionName; });

            return kt.graph.sortPoNodes(onBigArray(this.proofObligations, filter, tracker));
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
