// Generated using typescript-generator version 2.0.400 on 2018-07-19 23:31:15.

export interface JAnalysis extends Jsonable {
    apps: JApp[];
}

export interface JApp extends Jsonable {
    files: JFile[];
    actualSourceDir: string;
    baseDir: string;
}

export interface Jsonable {
}

export interface JFile extends Jsonable {
    functions: JFunc[];
    name: string;
}

export interface JFunc extends Jsonable {
    api: JApi;
    callsites: JCallsite[];
    loc: JLocation;
    name: string;
    ppos: JPO[];
    returnsites: JCallsite[];
}

export interface JApi {
    aa: JApiAssumption[];
}

export interface JCallsite extends Jsonable {
    callee: JVarInfo;
    exp: string;
    loc: JLocation;
    spos: JPO[];
    type: string;
}

export interface JLocation extends Jsonable {
    file: string;
    line: number;
}

export interface JPO extends Jsonable {
    dep: string;
    evl: string;
    exp: string;
    id: number;
    line: number;
    links: JLink[];
    prd: string;
    sts: string;
}

export interface JApiAssumption {
    exp: string;
    id: number;
    type: AssumptionTypeCode;
    ppos: number[];
    prd: string;
    spos: number[];
}

export interface JVarInfo extends Jsonable {
    loc: JLocation;
    name: string;
    type: string;
}

export interface JLink extends Jsonable {
    file: string;
    functionName: string;
    id: number;
}

export type AssumptionTypeCode = "aa" | "pc" | "ua" | "ga";
