// Generated using typescript-generator version 2.0.400 on 2018-08-21 17:49:03.

export interface JAnalysis extends Jsonable {
    apps: JApp[];
    errors: JError[];
}

export interface JApp extends Jsonable {
    files: JFile[];
    actualSourceDir: string;
    baseDir: string;
}

export interface JError extends Jsonable {
    file: string;
    messages: string[];
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

export type AssumptionTypeCode = "aa" | "pc" | "ua" | "ga" | "ca";
