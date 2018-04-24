import { POLocation } from "../common/xmltypes";


export interface KtJson {
    basedir: string;
    apps: JApp[];
}

export interface JPPO {
    dep: string;
    evl: string;
    exp: string;
    id: number;
    line: number;
    prd: string;
    sts: string;
    links: JPoLink[];
}


export interface JLocation extends POLocation{
    line: number;
    file: string;
}

export interface JVarInfo {
    loc: JLocation;
    name: string;
}

export interface JCallsite {
    spos: JSPO[];
    callee: JVarInfo;
}

export interface JSPO extends JPPO {

}

export interface JAssumption {
    prd: string;
    id: number;
    ppos: number[];
    spos: number[];
}

export interface JApi {
    aa: JAssumption[]
}

export interface JFunc {
    name: string;
    ppos: JPPO[];
    callsites: JCallsite[];
    api: JApi;
    loc: JLocation;
}

export interface JFile {
    name: string;
    functions: JFunc[];
}

export interface JApp {
    sourceDir: string;
    files: JFile[];
}


export interface JPoLink {
    file: string;
    functionName: string;
    id: number;
}