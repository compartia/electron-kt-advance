module kt.parser {
    const path = require('path')
    const fs = require('fs');
    declare function require(name: string);


    function mapPOsByRefId(POs, ret = {}) {

        for (let key in POs) {
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
            let json = fs.readFileSync(path.join(__dirname, filename), {
                encoding: 'utf-8'
            });

            let parsed = JSON.parse(json);
            let POs = parsed["posByKey"]["map"];

            mapPOsByRefId(POs, poByRefId);
        }

        return poByRefId;
    }

    function bindChildren(poByRefId) {

        const has_assumptions:kt.graph.po_node.PONode[] = findPOsWithAssumptions(poByRefId);
        console.log("Number of POs with assumptions:" + has_assumptions.length);

        let apisByName = {}

        let lostPoCount: number = 0;
        for (let ppo of has_assumptions) {

            for (let ref of ppo.references) {

                let target: kt.graph.po_node.PONode = poByRefId[ref["referenceKey"]];


                if (!target) {
                    // console.warn(ppo.referenceKey + " refers missing key: " + key2_);
                    // target = new kt.graph.po_node.PONode(ref, true);
                    // poByRefId[key2_] = target;
                    lostPoCount++;
                }


                let apiName = kt.graph.api_node.makeName(ref);
                let api = apisByName[apiName];
                if (!api) {
                    api = new kt.graph.api_node.ApiNode(ref);
                    apisByName[apiName] = api;
                }

                ppo.addOutput(api);
                api.addInput(ppo);

                if(target){
                    api.addOutput(target);
                    target.addInput(api);
                }



            }
        }
        console.error("We have = " + lostPoCount + " missing referenceKey(s)");
        return apisByName;
    }

    function buildGraph(poByRefId): tf.graph.proto.NodeDef[] {
        let g: tf.graph.proto.NodeDef[] = [];

        const apisByName = bindChildren(poByRefId);

        let nodesMap = {};

        for (var key in poByRefId) {
            var ppo: kt.graph.po_node.PONode = poByRefId[key];
            if (ppo.isLinked()) {
                if (!ppo.isTotallyDischarged()) {
                    g.push(ppo.asNodeDef());
                }
            }
        }

        for (var key in apisByName) {
            var api: kt.graph.api_node.ApiNode = apisByName[key];
            g.push(api.asNodeDef());
        }

        console.info["NUMBER of nodes: " + g.length];
        return g;
    }



    export function readAndParse(): tf.graph.proto.NodeDef[] {

        const ppoNodesMap = readPoNodesFromJsons([

            // "static/resources/dnsmasq/kt_analysis_export_5.6.2/src/log.c.json",
            // "static/resources/dnsmasq/kt_analysis_export_5.6.2/src/dnsmasq.c.json",
            // "static/resources/dnsmasq/kt_analysis_export_5.6.2/src/option.c.json",
            "static/resources/dnsmasq/kt_analysis_export_5.6.3/src/cache.c.json"
            // "static/resources/dnsmasq/kt_analysis_export_5.6.2/src/arp.c.json"

        ]);

        let g: tf.graph.proto.NodeDef[] = buildGraph(ppoNodesMap)
        return g;

    }


}
