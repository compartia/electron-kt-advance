import * as tools from './common/tools';

import { CFunction, CApiAssumption, CApi, SecondaryProofObligation } from './common/xmltypes';
import { CProject, GraphSettings, GraphGrouppingOptions } from './common/globals'
import { Filter } from './common/filter'
import { ProofObligation, PoStates, sortNodes, POLocation } from './common/xmltypes'
import { NodeDef, NodeAttributes } from './tf_graph_common/lib/proto'

const path = require('path');

const SPL = "/";



export function buildGraph(filter: Filter, project: CProject): NodeDef[] {

    // const apis = project.filteredAssumptions;
    const pos = project.filteredProofObligations;
     

    let g: { [key: string]: NodeDef } = {};

    let settings = new GraphSettings(); //XXX: provide real settings

    /*
        adding assumptiosn to graph
    */

    project.filteredAssumptions.forEach(assumption => {
        const node: NodeDef = assumption.toNodeDef(filter, settings);
        g[node.name] = node;

        /*
         * Adding PPOs 
         */
        assumption.ppos.forEach(linked => {
            if (filter.acceptIgnoreLocation(linked)) {
                const cnode: NodeDef = linked.toNodeDef(filter, settings);
                g[cnode.name] = cnode;
                node.input.push(cnode.name);
            }
        });

        /*
         * Adding SPOs 
         */
        assumption.spos.forEach(linked => {
            if (filter.acceptIgnoreLocation(linked)) {
                const cnode: NodeDef = linked.toNodeDef(filter, settings);
                g[cnode.name] = cnode;
                node.output.push(cnode.name);
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
                // console.error(key + " lists key " + linkedKey + " in outputs, but this node is not in graph");
                g[linkedKey] = makeMissingNode(linkedKey);
            }

            tools.pushUnique(g[linkedKey].input, key);

        });
    }

    for (let key in g) {
        let node = g[key];

        node.input.forEach(linkedKey => {
            if (!g[linkedKey]) {
                // console.error(key + " lists key " + linkedKey + " in inputs, but this node is not in graph");
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
            // label:"MISSING"
        }
    }
    return ret;
}

function removeOrphans(g: NodeDef[]): NodeDef[] {
    return g.filter(n => (n.output.length > 0 || n.input.length > 0));
}

export function buildCallsGraph(filter: Filter, project: CProject): NodeDef[] {
    // const calls: FunctionCalls[] = project.calls;
    // const pos = project.filteredProofObligations;

    // this.filter.acceptCFunction
    let nodesMap: { [key: string]: NodeDef } = {};

    let settings = new GraphSettings();

    // project.proofObligations.forEach(
    //     po => {
    //         if ((<SecondaryProofObligation>po).callsite) {
    //             if (filter.accept(po)) {

    //                 const cnode = (<SecondaryProofObligation>po).callsite.toNodeDef(filter, settings);
    //                 nodesMap[cnode.name] = cnode;

    //                 const pnode = po.toNodeDef(filter, settings);
    //                 nodesMap[pnode.name] = pnode;

    //                 pnode.output.push[cnode.name];
    //             }
    //         }
    //     }
    // );


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

                        node.output.push(cnode.name);
                        node.input.push(node.name);
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

// function findOrBuildFuncNode(func: CFunction, nodesMap: { [key: string]: NodeDef }): NodeDef {
//     const name = makeFunctionName(func);
//     if (nodesMap[name]) {
//         return nodesMap[name];
//     } else {
//         const node: NodeDef = cFunctionToNodeDef(func);
//         nodesMap[node.name] = node;
//         return node;
//     }
// }

function makeFunctionName(node: CFunction): string {
    return node.file + "/" + node.name;// + "/" + node.line;
}



// export function makeGraphNodePath(filter: Filter, settings: GraphSettings, func: CFunction, predicate: string, name: string): string {
//     let pathParts: string[] = [];

//     let fileBaseName: string = path.basename(func.fileInfo.relativePath);

//     let addFile: boolean = !filter.file || (func.fileInfo.relativePath != filter.file.relativePath);
//     let addFunction: boolean = !filter.cfunction || func.name != filter.cfunction.name;
//     let addPredicate: boolean = predicate != filter.singlePredicate;

//     if (settings.groupBy === GraphGrouppingOptions.file) {
//         if (addFile) {
//             pathParts.push(fileBaseName);
//         }
//         if (addFunction) {
//             pathParts.push(func.name);
//         }
//         if (addPredicate) {
//             pathParts.push(predicate);
//         }
//     } else {
//         //same but different order
//         if (addPredicate) {
//             pathParts.push(predicate);
//         }
//         if (addFile) {
//             pathParts.push(fileBaseName);
//         }
//         if (addFunction) {
//             pathParts.push(func.name);
//         }
//     }

//     pathParts.push(name);

//     return pathParts.join(SPL);
// }



// export function cFunctionToNodeDef(func: CFunction): NodeDef {
//     let nodeDef: NodeDef = {
//         name: makeFunctionName(func),
//         input: [],
//         output: [],
//         device: PoStates[3] + "-" + "rv",
//         op: func.name,
//         attr: {
//             "label": (func.name + ":" + func.line),
//             "predicate": "--",
//             "state": PoStates[3],
//             "location": func.funcLocation,
//             "data": func
//         }
//     }
//     return nodeDef;
// }










export function getLocationPath(node: NodeDef): string {
    if (node) {
        if (node.attr) {
            //leaf node
            return node.attr["locationPath"];
        } else {
            //meta group node
            return node.name;
        }
    }
    return "";
}
