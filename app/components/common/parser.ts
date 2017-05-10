module kt.parser {
    const path = require('path');


    export function buildGraph(pos: Array<kt.model.ProofObligation>, apis: Array<kt.model.ApiNode>, filter: Globals.Filter): tf.graph.proto.NodeDef[] {
        let g: tf.graph.proto.NodeDef[] = [];

        let nodesMap = {};

        for (let ppo of pos) {
            if (ppo.isLinked()) {
                let node: tf.graph.proto.NodeDef = ppo.asNodeDef(filter);
                g.push(node);
            }
        }

        for (var api of apis) {
            if (api.isLinked()) {
                let node: tf.graph.proto.NodeDef = api.asNodeDef(filter);
                g.push(node);
            }
        }


        console.info["NUMBER of nodes: " + g.length];
        return g;
    }



    export function readAndParse(project: Globals.Project, tracker: tf.ProgressTracker): Promise<Globals.Project> {

        let reader: xml.XmlReader = new xml.XmlReader();

        tracker.setMessage("reading XML data");

        const readFunctionsMapTracker = tf.graph.util.getSubtaskTracker(tracker, 10, 'Reading functions map (*._cfile.xml)');
        const readDirTracker = tf.graph.util.getSubtaskTracker(tracker, 90, 'Reading Proof Oblications data');


        return reader.readFunctionsMap(path.dirname(project.analysisDir), readFunctionsMapTracker)
            .then(functions => {


                let resultingMap: { [key: string]: Array<treeview.FileInfo> } = {};

                for (let f of functions) {
                    if (!resultingMap[f.name]) {
                        resultingMap[f.name] = [];
                    }
                    resultingMap[f.name].push(f.fileInfo);
                }

                project.functionByFile = reader.buildFunctionsByFileMap(functions);
                let result: Promise<xml.XmlAnalysis> = reader.readDir(project.analysisDir, resultingMap, readDirTracker);
                return result;
            })
            .then((POs: xml.XmlAnalysis) => {
                project.proofObligations = model.sortPoNodes(POs.ppos.concat(POs.spos));
                project.apis = POs.apis;

                return project;
            });



    }


}
