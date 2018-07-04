import * as _ from "lodash";
import { NodeAttributes, NodeDef } from '../tf_graph_common/lib/proto';
import { Filter } from './filter';
import { GraphSettings } from './globals';
import { JVarInfo } from "../../generated/kt-json";


export enum PoStates { violation, open, discharged, deadcode, assumption, callsite };
export enum PoDischargeTypes { a, f, x, i, s };
export const PoLevels = ["primary", "secondary"];


export const DischargeDescriptions = {
    "a": "dependent on other functions",
    "f": "dependent on context",
    "x": "dead code",
    "i": "unknown",
    "s": "dependent on itself"
};
export const PoDischargeTypesArr: Array<string> = Object.keys(DischargeDescriptions);

export const PoStatesArr: Array<PoStates> = [PoStates.violation, PoStates.open, PoStates.discharged, PoStates.deadcode];
export enum SortOrder { violation, open, discharged, deadcode, callsite, assumption, a, f, s, x, i, invariants, ds, rv, api, aa, ua, ga,pc };



export interface CommonNodeAttributes extends NodeAttributes {
    location: POLocation;
    locationPath: string;
}

export interface CallsiteNodeAttributes extends CommonNodeAttributes {
    data: Site | JVarInfo;
}

export interface AssumptionNodeAttributes extends CommonNodeAttributes {
    data: CApiAssumption;
}


export class RenderInfo {
    clazz: string;
    icon: string;

    get key(): string {
        return RenderInfo.key(this.clazz, this.icon);
    }

    public static key(clazz: string, icon: string) {
        return clazz + "@" + icon;
    }
}

export interface HasRenderInfo {
    renderInfo: RenderInfo;
}

export interface PONodeAttributes extends CommonNodeAttributes {
    data: ProofObligation;
    predicate: string;
    level: string;
    expression: string;
    discharge: PODischarge;
}

export interface HasPath {
    relativePath: string;
    dir: boolean;
}

export interface FileInfo extends HasPath {
    name: string;
    icon: string;
    open: boolean;
    children: Array<FileInfo>;
    dir: boolean;
}

export interface PODischarge extends POId {
    message: string
}

export enum SymbolType { CONST, ID };

export interface Symbol {
    type: SymbolType;
    value: string;
    pathLabel: String;
}

export interface HasLocation extends HasPath {
    line: number;
}

export interface HasCFunction {
    cfunction: CFunction;
    file: string;
    functionName: string;
}

export interface CApiAssumption extends HasCFunction, Graphable, HasLocation, HasRenderInfo {
    file: string;
    functionName: string;
    location: POLocation;


    predicate: string;
    expression: string;

    assumptionType: string;

    spos: ProofObligation[];
    ppos: ProofObligation[];
}

export interface CApi {
    apiAssumptions: CApiAssumption[];
}
export interface CFunctionBase extends HasLocation {
    name: string;
    file: string;
}

export interface CFunction extends CFunctionBase {

    loc: POLocation;


    api: CApi;
    callsites: Callsite[];

    fullpath: string;

    getPPObyId(id: number): ProofObligation;
    getSPObyId(id: number): ProofObligation;
}

export interface Graphable {
    toNodeDef(filter: Filter, settings: GraphSettings): NodeDef;
    getGraphKey(filter: Filter, settings: GraphSettings): string;
}


export interface Site extends Graphable, HasLocation {
    name: String;
    location: POLocation;
    getSPOs(): SecondaryProofObligation[];
}

export interface Returnsite extends Site {
}

export interface Callee extends Graphable, CFunctionBase, HasRenderInfo {
    functionName: String,
    loc: POLocation;
    type: string;
    arguments: string;
}

export interface Callsite extends Site {
    callee: Callee;
    isGlobal(): boolean;
}

/**
 * @deprecated
 * create location info, merge it with ile info
 */
export interface POLocation {
    line: number;
    file: string;
}


export interface POId extends HasCFunction {
    id: string;
}

export interface AbstractNode extends POId {

    location: POLocation;
    symbol: Symbol;

}



export interface ProofObligation extends AbstractNode, Graphable, HasLocation, HasRenderInfo {

    assumptionsIn: CApiAssumption[];
    assumptionsOut: CApiAssumption[];

    isViolation(): boolean;
    isDischarged(): boolean;

    name: string;
    predicate: string;
    expression: string;
    // callsiteFname: string;


    levelLabel: string;

    dischargeType: string;
    level: string;
    label: string;

    discharge: PODischarge;
    apiId: string;

    state: PoStates;
}

export interface SecondaryProofObligation extends ProofObligation {
    callsite: Site;
}

export interface CApplication {

}

export interface CAnalysis {
    proofObligations: Array<ProofObligation>;
    apps: Array<CApplication>;
    appByDirMap: { [key: string]: CApplication }

    functionByFile: { [key: string]: Array<CFunction> };
    assumptions: Array<CApiAssumption>
}


export function sortNodes(nodes: AbstractNode[]) {
    return _.sortByOrder(nodes, ['file', 'functionName', 'state', 'dischargeTypeIndex', 'predicate'], ['asc', 'asc', 'asc', 'asc', 'asc']);
}

export function sortPoNodes(nodes: ProofObligation[]): Array<ProofObligation> {
    return _.sortByOrder(nodes, ['file', 'functionName', 'state', 'dischargeTypeIndex', 'predicate'], ['asc', 'asc', 'asc', 'asc', 'asc']);
}

export function compareStates(stateA: string, stateB: string): number {
    let stA: string[] = stateA.split("-");
    let stB: string[] = stateB.split("-");

    let delta1 = SortOrder[stA[0]] - SortOrder[stB[0]];
    if (delta1 == 0) {
        return SortOrder[stA[1]] - SortOrder[stB[1]];
    } else
        return delta1;
}