
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
    }



    export var project: Project = new Project(null);

}
