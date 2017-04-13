module kt.parser {
    const path = require('path');


    export function buildGraph(pos: Array<kt.graph.PONode>, apisByName): tf.graph.proto.NodeDef[] {
        let g: tf.graph.proto.NodeDef[] = [];

        let nodesMap = {};

        for (let ppo of pos) {
            if (ppo.isLinked()) {
                if (!ppo.isTotallyDischarged()) {
                    g.push(ppo.asNodeDef());
                }
            }
        }

        for (var key in apisByName) {
            var api: kt.graph.ApiNode = apisByName[key];
            if (api.isLinked()) {
                if (!api.isTotallyDischarged()) {
                    g.push(api.asNodeDef());
                }
            }
        }

        console.info["NUMBER of nodes: " + g.length];
        return g;
    }



    export function readAndParse(tracker: tf.ProgressTracker): Promise<kt.Globals.Project> {
        console.info("test");

        const project = kt.Globals.project;

        let reader: kt.xml.XmlReader = new kt.xml.XmlReader();

        tracker.setMessage("reading XML data");

        const readFunctionsMapTracker = tf.graph.util.getSubtaskTracker(tracker, 10, 'Reading functions map (*._cfile.xml)');
        const readDirTracker = tf.graph.util.getSubtaskTracker(tracker, 90, 'Reading Proof Oblications data');


        return reader.readFunctionsMap(path.dirname(project.analysisDir), readFunctionsMapTracker)
            .then(funcsMap => {
                let result:Promise<kt.xml.XmlAnalysis> = reader.readDir(project.analysisDir, funcsMap, readDirTracker);
                return result;
            })
            .then((POs:kt.xml.XmlAnalysis) => {
                project.proofObligations = kt.graph.sortPoNodes( POs.ppos.concat(POs.spos));
                project.apis = POs.apis;

                // let g: tf.graph.proto.NodeDef[] = buildGraph(project.proofObligations, project.apis);
                // return g;

                return project;
            });



    }


}
