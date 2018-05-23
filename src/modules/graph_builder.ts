import * as tools from './common/tools';

import { CFunction, CApiAssumption, CApi, SecondaryProofObligation, Graphable } from './common/xmltypes';
import { CProject, GraphSettings, GraphGrouppingOptions } from './common/globals'
import { Filter } from './common/filter'
import { NodeDef, NodeAttributes } from './tf_graph_common/lib/proto'

const path = require('path');

const SPL = "/";

export function linkNodes(a: NodeDef, b: NodeDef) {
    a.output.push(b.name);
    b.input.push(a.name);
}

export function findOrMakeNode(g: { [key: string]: NodeDef }, n: Graphable, filter: Filter, settings: GraphSettings): NodeDef {
    const nodeKey = n.getGraphKey(filter, settings);
    if (!g[nodeKey]) {
        g[nodeKey] = n.toNodeDef(filter, settings);
    }
    return g[nodeKey];
}

export function buildGraph(filter: Filter, project: CProject): NodeDef[] {

    const pos = project.filteredProofObligations;


    let g: { [key: string]: NodeDef } = {};

    let settings = new GraphSettings(); //XXX: provide real settings

    /*
        adding assumptions to graph
    */
    project.filteredAssumptions.forEach(assumption => {
        const node: NodeDef = assumption.toNodeDef(filter, settings);
        g[node.name] = node;

        /*
         * Adding PPOs 
         */
        assumption.ppos.forEach(linked => {
            if (filter.acceptIgnoreLocation(linked)) {
                const cnode = findOrMakeNode(g, linked, filter, settings);
                linkNodes(cnode, node);
            }
        });

        /*
         * Adding SPOs 
         */
        assumption.spos.forEach(linked => {
            if (filter.acceptIgnoreLocation(linked)) {
                const cnode = findOrMakeNode(g, linked, filter, settings);
                linkNodes(node, cnode);

            }
        });

    });


    linkNodes2way(g);

    let ret: NodeDef[] = [];
    for (let key in g) {
        ret.push(g[key]);
    }

    console.info["NUMBER of nodes: " + ret.length];

    ret = removeOrphans(ret);

    return ret;
}


function linkNodes2way(g: { [key: string]: NodeDef }) {
    for (let key in g) {
        let node = g[key];

        node.output.forEach(linkedKey => {

            if (!g[linkedKey]) {
                g[linkedKey] = makeMissingNode(linkedKey);
            }

            tools.pushUnique(g[linkedKey].input, key);

        });
    }

    for (let key in g) {
        let node = g[key];

        node.input.forEach(linkedKey => {
            if (!g[linkedKey]) {
                g[linkedKey] = makeMissingNode(linkedKey);
            }

            tools.pushUnique(g[linkedKey].output, key);

        });
    }
}

function makeMissingNode(linkedKey: String): NodeDef {
    const ret = <NodeDef>{
        name: linkedKey,
        input: [],
        output: [],
        device: "missing",
        op: "missing",
        attr: <NodeAttributes>{
            state: "missing",
        }
    }
    return ret;
}

function removeOrphans(g: NodeDef[]): NodeDef[] {
    return g.filter(n => (n.output.length > 0 || n.input.length > 0));
}

export function buildCallsGraph(filter: Filter, project: CProject): NodeDef[] {

    let nodesMap: { [key: string]: NodeDef } = {};

    let settings = new GraphSettings();





    project.forEachFunction(func => {

        // if (filter.acceptCFunction(func)) {
        func.callsites.forEach(callsite => {
            // if (!callsite.isGlobal()) {


            if (filter.acceptCFunction(func) || filter.acceptCFunction(callsite.callee)) {

                const node = callsite.callee.toNodeDef(filter, settings);
                nodesMap[node.name] = node;

                callsite.getSPOs().forEach(linkedSpo => {

                    if (filter.acceptIgnoreLocation(linkedSpo)) {
                        const cnode = linkedSpo.toNodeDef(filter, settings);
                        nodesMap[cnode.name] = cnode;
                        linkNodes(node, cnode);
                    }

                });


            }

            // }


        });
        // }
    });



    linkNodes2way(nodesMap);

    let ret: NodeDef[] = [];
    for (let key in nodesMap) {
        ret.push(nodesMap[key]);
    }

    console.info["NUMBER of nodes: " + ret.length];

    ret = removeOrphans(ret);

    return ret;
}


