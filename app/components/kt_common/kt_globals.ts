
module kt.Globals {
    const path = require('path');
    const fs = require('fs');

    export const ch_dir = "ch_analysis";

    export var TABS = [
        'summary', 'source', 'proof obligations', 'assumptions', 'graphs'
    ];


    export class Project {
        functionByFile: { [key: string]: Array<kt.xml.CFunction> } = {};
        baseDir: string;
        analysisDir: string;
        proofObligations: Array<kt.graph.PONode> = [];



        constructor(baseDir: string) {
            this.baseDir = baseDir;
        }

        public open(baseDir: string, tracker: tf.ProgressTracker): Promise<{ [key: string]: Array<kt.xml.CFunction> }> {
            this.baseDir = baseDir;
            this.analysisDir = path.join(this.baseDir, ch_dir);

            console.info("opening new project:" + baseDir);


            let reader: kt.xml.XmlReader = new kt.xml.XmlReader();
            tracker.setMessage("reading XML data");

            const readFunctionsMapTracker = tf.graph.util.getSubtaskTracker(tracker, 100, 'reading functions map (*._cfile.xml)');

            return reader.readFunctionsMap(path.dirname(this.analysisDir), readFunctionsMapTracker);
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
            project = new Project(dir);
            return project.open(dir[0], tracker);
        } else {
            return null;
        }
    }


    export var project: Project = new Project(null);

}
