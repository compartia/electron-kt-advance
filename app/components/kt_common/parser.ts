module kt.parser {

    let fs = require('fs');
    declare function require(name: string);


    function mapPOsByRefId(POs, ret = {}) {

        for (let key in POs) {
            // console.log(key);
            let pOsByLocation = POs[key];
            for (var value of pOsByLocation) {
                ret[value["referenceKey"]] = new kt.graph.po_node.PONode(value);
            }
        }
        return ret;
    }

    function findPOsWithAssumptions(POsByRefIdMap): kt.graph.po_node.PONode[] {
        var has_assumptions: kt.graph.po_node.PONode[] = [];

        for (var key in POsByRefIdMap) {
            var value: kt.graph.po_node.PONode = POsByRefIdMap[key];
            if (value.hasAssumptions()) {
                has_assumptions.push(value)
            }
        }
        return has_assumptions;
    }

    function readPoNodesFromJsons(filenames: string[]) {
        const poByRefId = {};

        for (let filename of filenames) {
            let json = fs.readFileSync(filename, {
                encoding: 'utf-8'
            });

            let parsed = JSON.parse(json);
            let POs = parsed["posByKey"]["map"];

            mapPOsByRefId(POs, poByRefId);
        }

        return poByRefId;
    }

    function bindChildren(poByRefId) {

        const has_assumptions = findPOsWithAssumptions(poByRefId);
        console.log("Number of POs with assumptions:" + has_assumptions.length);

        let lostPoCount: number = 0;
        for (let ppo of has_assumptions) {

            for (let ref of ppo.references) {
                const key2_: string = ref["referenceKey"]
                let target: kt.graph.po_node.PONode = poByRefId[key2_];


                if (!target) {
                    console.warn(ppo.referenceKey + " refers missing key: " + key2_);
                    target = new kt.graph.po_node.PONode(ref, true);
                    poByRefId[key2_] = target;

                    lostPoCount++;

                }

                target.apiId = ref["apiId"];
                ppo.addInput(target);
                target.addOutput(ppo);
            }
        }
        console.error("We have = " + lostPoCount + " missing referenceKey(s)");
        return has_assumptions;
    }

    function buildGraph(poByRefId): tf.graph.proto.NodeDef[] {
        let g: tf.graph.proto.NodeDef[] = [];

        const has_assumptions = bindChildren(poByRefId);
        console.log("Number of POs with assumptions:" + has_assumptions.length);

        let nodesMap = {};

        for (var key in poByRefId) {
            var ppo: kt.graph.po_node.PONode = poByRefId[key];
            // if (ppo.isLinked()) {
                // if (!ppo.isTotallyDischarged())
                    g.push(ppo.asNodeDef());
            // }
        }

        console.info["NUMBER of nodes: " + g.length];
        return g;
    }



    export function readAndParse(): tf.graph.proto.NodeDef[] {

        const ppoNodesMap = readPoNodesFromJsons([
            "/Users/artem/work/KestrelTechnology/IN/dnsmasq/kt_analysis_export_5.6.2/src/log.c.json",
            "/Users/artem/work/KestrelTechnology/IN/dnsmasq/kt_analysis_export_5.6.2/src/dnsmasq.c.json",
            "/Users/artem/work/KestrelTechnology/IN/dnsmasq/kt_analysis_export_5.6.2/src/option.c.json",
            "/Users/artem/work/KestrelTechnology/IN/dnsmasq/kt_analysis_export_5.6.2/src/cache.c.json"
            // "/Users/artem/work/KestrelTechnology/IN/dnsmasq/kt_analysis_export_5.6.1/src/tftp.c.json"
        ]);

        let g: tf.graph.proto.NodeDef[] = buildGraph(ppoNodesMap)
        return g;

    }


}
