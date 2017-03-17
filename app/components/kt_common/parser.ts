module kt.parser {
    const path = require('path');
    function buildGraph(poByRefId, apisByName): tf.graph.proto.NodeDef[] {
        let g: tf.graph.proto.NodeDef[] = [];


        let nodesMap = {};

        for (var key in poByRefId) {
            var ppo: kt.graph.PONode = poByRefId[key];
            if (ppo.isLinked()) {
                if (!ppo.isTotallyDischarged()) {
                    g.push(ppo.asNodeDef());
                }
            }
        }

        for (var key in apisByName) {
            var api: kt.graph.ApiNode = apisByName[key];
            if (api.isLinked()) {
                // if (!api.isTotallyDischarged()) {
                    g.push(api.asNodeDef());
                // }
            }
        }

        console.info["NUMBER of nodes: " + g.length];
        return g;
    }



    export function readAndParse(): Promise<Array<tf.graph.proto.NodeDef>> {
        console.info("test");

        const paths = ["/Users/artem/work/KestrelTechnology/IN/dnsmasq/ch_analysis/src/option/"];

        let reader: kt.xml.XmlReader = new kt.xml.XmlReader();

        return reader.readFunctionsMap(path.dirname(paths[0])).then(
            funcsMap => {
                let result = reader.readDir(paths[0], funcsMap);
                return result;
            }
        ).then(POs => {

            let ppoNodesMap = _.merge(POs.ppoMap, POs.spoMap);
            let g: tf.graph.proto.NodeDef[] = buildGraph(ppoNodesMap, POs.apiMap);
            return g;
        });



    }


}
