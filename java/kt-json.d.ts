// Generated using typescript-generator version 2.0.400 on 2018-07-04 21:24:12.

export interface JAnalysis extends Jsonable {
    apps: JApp[];
}

export interface JApp extends Jsonable {
    files: JFile[];
    sourceDir: string;
}

export interface Jsonable {
}

export interface JFile extends Jsonable {
    functions: JFunc[];
    name: string;
}

export interface JFunc extends Jsonable {
    api: JApi;
    callsites: JCalliste[];
    loc: JLocation;
    name: string;
    ppos: JPO[];
    returnsites: JCalliste[];
}

export interface JApi {
    aa: JApiAssumption[];
}

export interface JCalliste extends Jsonable {
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
