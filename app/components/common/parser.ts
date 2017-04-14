module kt.parser {
    const path = require('path');


    export function buildGraph(pos: Array<kt.graph.PONode>, apis: Array<kt.graph.ApiNode>, filter: kt.Globals.Filter): tf.graph.proto.NodeDef[] {
        let g: tf.graph.proto.NodeDef[] = [];

        let nodesMap = {};

        let namefilter = (_nodename) => {
            let nodename = _nodename;
            if (filter.file) {
                let len = filter.file.name.length;

                if (nodename.startsWith(filter.file.name)) {
                    nodename = nodename.substring(len + 1); //1 fro slash

                    if (filter.functionName) {
                        if (nodename.startsWith(filter.functionName)) {
                            nodename = nodename.substring(filter.functionName.length + 1);//1 fro slash
                        }
                    }

                    nodename = ".." + nodename;
                }
            }

            return nodename;
        }

        for (let ppo of pos) {
            if (ppo.isLinked()) {
                if (!ppo.isTotallyDischarged()) {
                    let node: tf.graph.proto.NodeDef = ppo.asNodeDef(namefilter);
                    g.push(node);
                }
            }
        }

        for (var api of apis) {
            // var api: kt.graph.ApiNode = apisByName[key];
            if (api.isLinked()) {
                if (!api.isTotallyDischarged()) {
                    let node: tf.graph.proto.NodeDef = api.asNodeDef(namefilter);
                    g.push(node);
                }
            }
        }

        if (filter.file) {
            _.forEach(g, (x) => adjustNodeNameAccordingToFilter(x, filter));
        }


        console.info["NUMBER of nodes: " + g.length];
        return g;
    }

    function adjustNodeNameAccordingToFilter(node: tf.graph.proto.NodeDef, filter: kt.Globals.Filter) {
        let len = filter.file.name.length;

        if (node.name.startsWith(filter.file.name)) {
            node.name = node.name.substring(len + 1); //1 fro slash

            if (filter.functionName) {
                if (node.name.startsWith(filter.functionName)) {
                    node.name = node.name.substring(filter.functionName.length + 1);//1 fro slash
                }
            }

            node.name = ".." + node.name;
        }
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
                let result: Promise<kt.xml.XmlAnalysis> = reader.readDir(project.analysisDir, funcsMap, readDirTracker);
                return result;
            })
            .then((POs: kt.xml.XmlAnalysis) => {
                project.proofObligations = kt.graph.sortPoNodes(POs.ppos.concat(POs.spos));
                project.apis = POs.apis;

                // let g: tf.graph.proto.NodeDef[] = buildGraph(project.proofObligations, project.apis);
                // return g;

                return project;
            });



    }


}
