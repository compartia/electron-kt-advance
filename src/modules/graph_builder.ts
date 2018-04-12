import { CFunction } from './common/xmltypes';
import { CProject, GraphSettings, GraphGrouppingOptions } from './common/globals'
import { Filter } from './common/filter'
import { ProofObligation, PoStates, sortNodes, POLocation } from './common/xmltypes'
import { ApiNode, FunctionCalls } from './common/xmltypes'
import { NodeDef } from './tf_graph_common/lib/proto'

const path = require('path');

const SPL = "/";


export function buildGraph(filter: Filter, project: CProject): NodeDef[] {

    const apis = project.filteredAssumptions;
    const pos = project.filteredProofObligations;

    let g: NodeDef[] = [];

    let settings = new GraphSettings(); //XXX: provide real settings

    for (let ppo of pos) {
        if (ppo.isLinked()) {
            let node: NodeDef = proofObligationToNodeDef(ppo, filter, settings);
            g.push(node);
        }
    }

    if(apis){
        for (var api of apis) {
            if (api.isLinked()) {
                let node: NodeDef = ApiNodeToNodeDef(api, filter, settings);
                g.push(node);
            }
        }
    }
    
    console.info["NUMBER of nodes: " + g.length];
    return g;
}

export function buildCallsGraph(filter: Filter, project: CProject): NodeDef[] {
    const calls: FunctionCalls[] = project.calls;

    let nodesMap: { [key: string]: NodeDef } = {};


    for (let call of calls) {
        if (call.callSites.length) {
            if (filter.acceptCFunction(call.cfunction)) {
                const node = findOrBuildFuncNode(call.cfunction, nodesMap);
                for (let ref of call.callSites) {
                    const refnode = findOrBuildFuncNode(ref, nodesMap);
                    node.output.push(refnode.name);
                    refnode.input.push(node.name);
                }
            }

        }
    }

    const ret: NodeDef[] = [];
    const keys: string[] = [];
    for (let nm in nodesMap) {
        ret.push(nodesMap[nm]);
        keys.push(nm);
    }

    let _sharedStart: string = sharedStart(keys);
    let _sharedStartLen = _sharedStart.length;
    if (_sharedStartLen) {
        for (let node of ret) {
            node.name = node.name.substr(_sharedStartLen);
            let newInputs = [];
            for (let ref of node.input) {
                newInputs.push(ref.substr(_sharedStartLen));
            }
            node.input = newInputs;

            let newOut = [];
            for (let ref of node.output) {
                newOut.push(ref.substr(_sharedStartLen));
            }
            node.output = newOut;
        }
    }

    console.info["NUMBER of call nodes: " + ret.length];
    return ret;
}

function findOrBuildFuncNode(func: CFunction, nodesMap: { [key: string]: NodeDef }): NodeDef {
    const name = makeFunctionName(func);
    if (nodesMap[name]) {
        return nodesMap[name];
    } else {
        const node: NodeDef = cFunctionToNodeDef(func);
        nodesMap[node.name] = node;
        return node;
    }
}

function makeFunctionName(node: CFunction): string {
    return node.file + "/" + node.name;// + "/" + node.line;
}

function sharedStart(array: string[]): string {
    if (!array || !array.length) {
        return '';
    }
    const A = array.concat().sort();
    let a1 = A[0];
    let a2 = A[A.length - 1];
    let L = a1.length;
    let i = 0;
    while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
    return a1.substring(0, i);
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


export function makeProofObligationName(po: ProofObligation, filter: Filter, settings: GraphSettings): string {
    let nm = po.levelLabel + "(" + po.id + ")";

    if (po.symbol) {
        nm += po.symbol.pathLabel;
    } else {
        nm += "-expression-";
    }


    return makeGraphNodePath(filter, settings, po.cfunction, po.predicate, nm);
}


export function makeAssumptionName(api: ApiNode, filter: Filter, settings: GraphSettings): string {
    return makeGraphNodePath(filter, settings, api.cfunction, api.predicateType, api.type + "_" + api.id);
}

export function cFunctionToNodeDef(func: CFunction): NodeDef {
    let nodeDef: NodeDef = {
        name: makeFunctionName(func),
        input: [],
        output: [],
        device: PoStates[3] + "-" + "rv",
        op: func.name,
        attr: {
            "label": (func.name + ":" + func.line),
            "predicate": "--",
            "state": PoStates[3],
            "location": func.funcLocation,
            "data": func
        }
    }
    return nodeDef;
}

 

export function proofObligationToNodeDef(po: ProofObligation, filter: Filter, settings: GraphSettings): NodeDef {

    let nodeDef: NodeDef = {
        name: makeProofObligationName(po, filter, settings),
        input: [],
        output: [],
        device: po.extendedState,
        op: po.functionName,
        attr: {
            "label": po.label,
            "apiId": po.apiId,
            "predicate": po.predicate,
            "level": po.level,
            "state": PoStates[po.state],
            "location": po.location,
            "symbol": po.symbol,
            "expression": po.expression,
            "dischargeType": po.dischargeType,
            "discharge": po.discharge,
            //"dischargeAssumption": po.dischargeAssumption,
            "locationPath": po.file + SPL + po.functionName,
            "data": po
        }
    }

    for (let ref of sortNodes(po.inputs)) {
        nodeDef.input.push(makeAssumptionName(<ApiNode>ref, filter, settings));
    }

    for (let ref of sortNodes(po.outputs)) {
        nodeDef.output.push(makeAssumptionName(<ApiNode>ref, filter, settings));
    }

    return nodeDef;
}


export function ApiNodeToNodeDef(api: ApiNode, filter: Filter, settings: GraphSettings): NodeDef {


    let nodeDef: NodeDef = {
        name: makeAssumptionName(api, filter, settings),
        input: [],
        output: [],
        device: api.extendedState,
        op: api.functionName,
        attr: {
            "label": api.label,
            "predicate": api.predicateType,
            "expression": api.expression,
            "state": PoStates[api.state],
            "message": api.message,
            "apiId": api.id,
            "symbol": api.symbol,
            "assumptionType": api.type,
            "locationPath": api.file + SPL + api.functionName,
            "location": api.location,
            "data": api
        }
    }

    for (let ref of api.inputs) {
        nodeDef.input.push(makeProofObligationName(<ProofObligation>ref, filter, settings));
    }

    for (let ref of api.outputs) {
        nodeDef.output.push(makeProofObligationName(<ProofObligation>ref, filter, settings));
    }


    return nodeDef;
}





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
