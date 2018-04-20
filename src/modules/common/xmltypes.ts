import * as _ from "lodash"

export enum PoStates { violation, open, discharged, deadcode, assumption };
export enum PoDischargeTypes { global, invariants, ds, rv, api, default };
export const PoLevels = ["primary", "secondary"];

export const PoDischargeTypesArr: Array<string> = ["global", "invariants", "ds", "rv", "api", "default"];
export const PoStatesArr: Array<PoStates> = [PoStates.violation, PoStates.open, PoStates.discharged];
export enum PoStatesExt { violation, open, discharged, deadcode, global, invariants, ds, rv, api };


export interface FileInfo {
    name: string;
    relativePath: string;
    icon: string;
    open: boolean;
    children: Array<FileInfo>;
    dir: boolean;
}

export interface PODischarge extends POId {
    message:string
}

export enum SymbolType { CONST, ID };

export interface Symbol {
    type: SymbolType;
    value: string;
    pathLabel: String;
}

export interface CFunction {
    name: string;
    file: string;
    fileInfo: FileInfo;
    funcLocation: POLocation;
    line: number;
}

export interface ApiNode extends AbstractNode {
    location: POLocation;
    type: string;
    message: string;
    label: string;
    extendedState: string;
    predicateType: string;
    expression: string;
    state: PoStates;
    // eLocation: ExpressionLocation;

    dependentPos: Array<string>;//used during parsing
}

export interface FunctionCalls {
    cfunction: CFunction;
    callSites: Array<CFunction>;
}

export interface POLocation {
    line: number;
}

export interface HasCFunction {
    cfunction: CFunction;
    file: string;
    functionName: string;
}

export interface POId extends HasCFunction {
    id: string;    
}

export interface AbstractNode extends POId {
    inputs: AbstractNode[];
    outputs: AbstractNode[];
    location: POLocation;
    symbol: Symbol;
    
    isLinked(): boolean;
}



export interface ProofObligation extends AbstractNode {

    isViolation():boolean;
    isDischarged():boolean;

    name: string;
    predicate: string;
    expression: string;
    callsiteFname: string;
    

    levelLabel: string;


    extendedState: string;
    dischargeType: string;
    level: string;
    label: string;

    discharge: PODischarge;
    apiId: string;

    state: PoStates;
}


export interface XmlAnalysis {
    ppos: Array<ProofObligation>;
    spos: Array<ProofObligation>;
    apis: { [key: string]: ApiNode };
    calls: Array<FunctionCalls>;
}

export interface CApplication{

}

export interface CAnalysis {
    proofObligations:Array<ProofObligation>;
    apps:Array<CApplication>;
    appByDirMap:{ [key: string]: CApplication }
 
    functionByFile: { [key: string]: Array<CFunction> } ;
}


export function sortNodes(nodes: AbstractNode[]) {
    return _.sortByOrder(nodes, ['file', 'functionName', 'state', 'dischargeTypeIndex', 'predicate'], ['asc', 'asc', 'asc', 'asc', 'asc']);
}

export function sortPoNodes(nodes: ProofObligation[]): Array<ProofObligation> {
    return _.sortByOrder(nodes, ['file', 'functionName', 'state', 'dischargeTypeIndex', 'predicate'], ['asc', 'asc', 'asc', 'asc', 'asc']);
}

export function compareStates(stateA: string, stateB: string): number {
    let stA: string[] = stateA.toLowerCase().split("-");
    let stB: string[] = stateB.toLowerCase().split("-");

    let delta1 = PoStatesExt[stA[0]] - PoStatesExt[stB[0]];
    if (delta1 == 0) {
        return PoStatesExt[stA[1]] - PoStatesExt[stB[1]];
    } else
        return delta1;
}