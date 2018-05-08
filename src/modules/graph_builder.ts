import { CFunction, CApiAssumption, CApi } from './common/xmltypes';
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
    project.forEachFunction(func => {

        func.api.apiAssumptions &&
            func.api.apiAssumptions.forEach(assumption => {
                const node: NodeDef = assumption.toNodeDef(filter, settings);
                g[node.name] = node; //XXX: make sure it is unique


                assumption.getLinkedNodes(filter).forEach(linked => {
                    const cnode: NodeDef = linked.toNodeDef(filter, settings);
                    g[cnode.name] = cnode; //XXX: make sure it is unique

                });

            });
    });

    /*
        adding proof obligatoins to graph
    */
    for (let ppo of pos) {
        if (ppo.isLinked()) {
            const node: NodeDef = ppo.toNodeDef(filter, settings);

            g[node.name] = node;

            ppo.getLinkedNodes(filter).forEach(linked => {
                const cnode: NodeDef = linked.toNodeDef(filter, settings);
                g[cnode.name] = cnode; //XXX: make sure it is unique
            });

        }
    }


    linkNodes2way(g);

    let ret: NodeDef[] = [];
    for (let key in g) {
        ret.push(g[key]);
    }

    console.info["NUMBER of nodes: " + ret.length];

    ret = removeOrphans(ret);

    return ret;
}

function pushUnique<X>(arr: Array<X>, el: X) {
    if (!arr.includes(el))
        arr.push(el);//todo: check it is unique
}

function linkNodes2way(g: { [key: string]: NodeDef }) {
    for (let key in g) {
        let node = g[key];

        node.output.forEach(linkedKey => {

            if (!g[linkedKey]) {
                console.error(key + " lists key " + linkedKey + " in outputs, but this node is not in graph");
                g[linkedKey] = makeMissingNode(linkedKey);
            }

            pushUnique(g[linkedKey].input, linkedKey);
            
        });
    }

    for (let key in g) {
        let node = g[key];

        node.input.forEach(linkedKey => {
            if (!g[linkedKey]) {
                console.error(key + " lists key " + linkedKey + " in inputs, but this node is not in graph");
                g[linkedKey] = makeMissingNode(linkedKey);
            }

            pushUnique(g[linkedKey].output, linkedKey); 

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

    let g: NodeDef[] = [];
    let settings = new GraphSettings();
    project.forEachFunction(func => {

        if (filter.acceptCFunction(func)) {
            func.callsites.forEach(callsite => {


                if (!callsite.isGlobal()) {
                    g.push(callsite.toNodeDef(filter, settings));

                    callsite.getLinkedNodes(filter).forEach(linked => {
                        g.push(linked.toNodeDef(filter, settings));
                    });
                }


            });
        }
    });

    g = removeOrphans(g);

    // if (calls) {
    //     for (let call of calls) {
    //         if (call.callSites.length) {
    //             if (filter.acceptCFunction(call.cfunction)) {
    //                 const node = findOrBuildFuncNode(call.cfunction, nodesMap);
    //                 for (let ref of call.callSites) {
    //                     const refnode = findOrBuildFuncNode(ref, nodesMap);
    //                     node.output.push(refnode.name);
    //                     refnode.input.push(node.name);
    //                 }
    //             }

    //         }
    //     }
    // }

    // const ret: NodeDef[] = [];
    // const keys: string[] = [];
    // for (let nm in nodesMap) {
    //     ret.push(nodesMap[nm]);
    //     keys.push(nm);
    // }

    // let _sharedStart: string = sharedStart(keys);
    // let _sharedStartLen = _sharedStart.length;
    // if (_sharedStartLen) {
    //     for (let node of ret) {
    //         node.name = node.name.substr(_sharedStartLen);
    //         let newInputs = [];
    //         for (let ref of node.input) {
    //             newInputs.push(ref.substr(_sharedStartLen));
    //         }
    //         node.input = newInputs;

    //         let newOut = [];
    //         for (let ref of node.output) {
    //             newOut.push(ref.substr(_sharedStartLen));
    //         }
    //         node.output = newOut;
    //     }
    // }

    // console.info["NUMBER of call nodes: " + ret.length];
    return g;
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



export function makeGraphNodePath(filter: Filter, settings: GraphSettings, func: CFunction, predicate: string, name: string): string {
    let pathParts: string[] = [];

    let fileBaseName: string = path.basename(func.fileInfo.relativePath);

    let addFile: boolean = !filter.file || (func.fileInfo.relativePath != filter.file.relativePath);
    let addFunction: boolean = !filter.cfunction || func.name != filter.cfunction.name;
    let addPredicate: boolean = predicate != filter.singlePredicate;

    if (settings.groupBy === GraphGrouppingOptions.file) {
        if (addFile) {
            pathParts.push(fileBaseName);
        }
        if (addFunction) {
            pathParts.push(func.name);
        }
        if (addPredicate) {
            pathParts.push(predicate);
        }
    } else {
        //same but different order
        if (addPredicate) {
            pathParts.push(predicate);
        }
        if (addFile) {
            pathParts.push(fileBaseName);
        }
        if (addFunction) {
            pathParts.push(func.name);
        }
    }

    pathParts.push(name);

    return pathParts.join(SPL);
}



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
