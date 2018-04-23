import {
    FileInfo, ProofObligation, AbstractNode,
    Symbol, PoStates, PODischarge, POLocation, Callsite,
    CApi, CApiAssumption,
    CFunction, sortPoNodes, Graphable, ApiAssumption
} from '../common/xmltypes';


import { NodeDef, PONodeAttributes, CallsiteNodeAttributes, AssumptionNodeAttributes } from '../tf_graph_common/lib/proto'
import { Filter } from '../common/filter'
import { GraphSettings } from '../common/globals'

import { XmlReader } from './xmlreader';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { CAnalysis, CApplication } from '../common/xmltypes';

import * as kt_fs from '../common/fstools';
import { normalize } from 'path';

const path = require('path');
const fs = require('fs');

class CApiImpl implements CApi {
    private _apiAssumptions: CApiAssumption[] = [];

    get apiAssumptions() {
        return this._apiAssumptions;
    }

    addApiAssumption(aa: CApiAssumption): void {
        this.apiAssumptions.push(aa);
    }
}

class CFunctionImpl implements CFunction {
    name: string;
    // file: string;
    fileInfo: FileInfo;
    funcLocation: POLocation;
    line: number;
    callsites: Callsite[] = [];

    private _api = new CApiImpl();


    public constructor(jfun: JFunc, relativeFilePath: string) {
        this.name = jfun.name;
        this.line = jfun.loc;

        this.funcLocation = {
            line: this.line
        };

        this.fileInfo = <FileInfo>{
            relativePath: relativeFilePath
        };



    }

    get file() {
        return this.fileInfo.relativePath;
    }


    get api() {
        return this._api;
    }

    getPPObyId(id: number): ProofObligation {
        const ppo = this.__indexPpo[id];
        if (!ppo) {
            console.error("cannot find PPO with ID: " + id + " in function  " + this.name);
        }
        return ppo;
    }

    getSPObyId(id: number): ProofObligation {
        const spo = this.__indexSpo[id];
        if (!spo) {
            console.error("cannot find SPO with ID: " + id + " in function  " + this.name);
        }
        return spo;
    }

    _indexPpo(p: ProofObligation): void {
        this.__indexPpo[p.id] = p;
    }

    _indexSpo(p: ProofObligation): void {
        this.__indexSpo[p.id] = p;
    }
    __indexSpo = {};
    __indexPpo = {};





}

class ApiAssumptionImpl implements CApiAssumption {
    private a: JAssumption;
    private cfunction: CFunction;

    get linkedNodes(): Graphable[] {

        let ret = [];

        this.a.ppos && this.a.ppos.forEach(
            ppoId => {
                let ppo = this.cfunction.getPPObyId(ppoId);
                if (!ppo) {
                    console.error("can not find PPO with id " + ppoId);
                } else {
                    ret.push(ppo);
                }
            }
        );

        this.a.spos && this.a.spos.forEach(
            spoId => {
                let spo = this.cfunction.getSPObyId(spoId);
                if (!spo) {
                    console.error("can not find SPO with id " + spoId);
                } else {
                    ret.push(spo);
                }
            }
        );

        return ret;
    }


    public constructor(a: JAssumption, cfunc: CFunction) {
        this.a = a;
        this.cfunction = cfunc;
    }

    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        let nm = "(" + this.a.id + ") " + this.a.prd;


        let pathParts: string[] = [];

        let fileBaseName: string = path.basename(this.cfunction.fileInfo.relativePath);
        pathParts.push(fileBaseName);
        pathParts.push(this.cfunction.name);
        // pathParts.push(this.a.prd);

        pathParts.push(nm);

        return pathParts.join('/');

    }

    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {

        let nodeDef: NodeDef = {
            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: "assumption",
            op: this.cfunction.name,
            attr: <AssumptionNodeAttributes>{
                label: "(" + this.a.id + ") " + this.a.prd,
                // "predicate": this.a.prd,
                // // "expression": api.expression,
                // "state": "assumption",//used
                // "message": "api.message",
                // "apiId": this.a.id,//used
                // //"symbol": api.symbol,
                // "assumptionType": "api.type",//used
                locationPath: this.cfunction.fileInfo.relativePath + "/" + this.cfunction.name,
                location: this.cfunction.funcLocation,
                // "data": this//used
            }
        };


        this.a.ppos && this.a.ppos.forEach(ref => {
            let ppo = this.cfunction.getPPObyId(ref);
            ppo && nodeDef.input.push(ppo.getGraphKey(filter, settings));
        });

        this.a.spos && this.a.spos.forEach(ref => {
            let spo = this.cfunction.getSPObyId(ref);
            spo && nodeDef.input.push(spo.getGraphKey(filter, settings));
        });

        // for (let ref of api.outputs) {
        //     nodeDef.output.push(makeProofObligationName(<ProofObligation>ref, filter, settings));
        // }


        return nodeDef;
    }
}

interface JPoLink {
    file: string;
    functionName: string;
    id: number;
}

function linkKey(link: JPoLink | ProofObligation): string {
    return link.file + "/" + link.functionName + "/" + link.id;
}

interface JPPO {
    dep: string;
    evl: string;
    exp: string;
    id: number;
    line: number;
    prd: string;
    sts: string;
    links: JPoLink[];
}

interface JLocation extends POLocation {
    line: number;
    filename: string;
}

interface JVarInfo {
    loc: JLocation;
    name: string;
}

interface JCallsite {
    spos: JSPO[];
    varInfo: JVarInfo;
}

interface JSPO extends JPPO {

}

interface JAssumption {
    prd: string;
    id: number;
    ppos: number[];
    spos: number[];
}

interface JApi {
    aa: JAssumption[]
}

interface JFunc {
    name: string;
    ppos: JPPO[];
    callsites: JCallsite[];
    api: JApi;
    loc: number;
}
interface JFile {
    name: string;
    functions: JFunc[];
}

interface JApp {
    sourceDir: string;
    files: JFile[];
}

interface KtJson {
    basedir: string;
    apps: JApp[];
}

abstract class AbstractPO implements ProofObligation {
    links: JPoLink[];

    indexer: CAnalysisImpl;

    public constructor(ppo: JPPO, cfun: CFunction, indexer: CAnalysisImpl) {
        this.indexer = indexer;

        const state = ppo.sts == "safe" ? "discharged" : ppo.sts;
        this.cfunction = cfun;
        this.predicate = ppo.prd;
        this.state = PoStates[state];
        this.extendedState = state + "-default";
        this.expression = ppo.exp;
        this.location = {
            line: ppo.line
        }
        this.discharge = <PODischarge>{
            message: ppo.evl
        };

        this.id = "" + ppo.id;
        //
        this.links = ppo.links;


    }

    get inputs() {
        return null;
        //  throw "unimplemented";
    }

    get linkedNodes(): Graphable[] {
        let ret = [];

        this.links && this.links.forEach(link => {
            let key = linkKey(link);
            let node: ProofObligation = this.indexer.getByIndex(key);
            if (node) {
                ret.push(node);
            } else {
                console.error("can not find " + key + " in index");
            }
        });

        return ret;

    }

    isViolation(): boolean {
        return true;
    }

    isDischarged(): boolean {
        return false;
    }

    name: string;
    predicate: string;
    expression: string;
    // callsiteFname: string;

    extendedState: string;
    dischargeType: string;

    label: "label";
    discharge: PODischarge;
    apiId: string;
    state: PoStates;//XXX
    // outputs: AbstractNode[];

    location: POLocation;
    symbol: Symbol;

    isLinked(): boolean {
        return this.links && (this.links.length > 0);
    }

    id: string;
    cfunction: CFunction;

    get file() {
        return this.cfunction.file;
    }

    get line(): number {
        return this.location.line;
    }
    get functionName() {
        return this.cfunction.name;
    }

    get level() {
        return "unknown";
    }

    get levelLabel(): string {
        throw "not implemented";
    }


    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        // let nm = this.levelLabel + "(" + this.id + ")";

        let nm = this.levelLabel + "(" + this.id + ") " + this.predicate;
        // if (this.symbol) {
        //     nm += this.symbol.pathLabel;
        // } else {
        //     nm += "-expression-";
        // }

        let pathParts: string[] = [];

        let fileBaseName: string = path.basename(this.cfunction.fileInfo.relativePath);
        pathParts.push(fileBaseName);
        pathParts.push(this.cfunction.name);
        // pathParts.push(this.predicate);

        pathParts.push(nm);

        //return makeGraphNodePath(filter, settings, this.cfunction, this.predicate, nm);
        return pathParts.join('/');

    }

    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {

        let nodeDef: NodeDef = {
            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: this.extendedState,
            op: this.functionName,
            attr: <PONodeAttributes>{
                label: this.label,
                // "apiId": this.apiId,
                predicate: this.predicate,
                level: this.level,
                state: PoStates[this.state],
                location: this.location,
                // "symbol": this.symbol,
                expression: this.expression,
                // "dischargeType": this.dischargeType,
                discharge: this.discharge,
                //"dischargeAssumption": po.dischargeAssumption,
                locationPath: this.file + "/" + this.functionName,
                data: this
            }
        }

        this.linkedNodes.forEach(node => {
            nodeDef.input.push(node.getGraphKey(filter, settings));
        })

        // this.links && this.links.forEach(link => {
        //     const key = linkKey(link);
        //     let node: ProofObligation = this.indexer.getByIndex(key);
        //     if (node) {
        //         nodeDef.input.push(node.getGraphKey(filter, settings));
        //     } else {
        //         console.error("can not find " + key + " in index");
        //     }
        // });

        return nodeDef;
    }
}

class SPOImpl extends AbstractPO {
    callsite: Callsite;

    public constructor(ppo: JSPO, cfun: CFunction, indexer: CAnalysisImpl, callsite: Callsite) {
        super(ppo, cfun, indexer);
        this.callsite = callsite;
    }

    get level(): string { return "secondary"; }

    get levelLabel(): string { return "II"; }


    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {
        let node = super.toNodeDef(filter, settings);
        if (settings.includeCallsites) {
            node.input.push(this.callsite.getGraphKey(filter, settings));
        }
        return node;
    }
    /*
        overrides
    */
    // public getGraphKey(filter: Filter, settings: GraphSettings): string {
    //     let nm = this.levelLabel + "(" + this.id + ") " + this.predicate;

    //     let pathParts: string[] = [];

    //     if (this.callsite.varInfo.loc) {
    //         let fileBaseName: string = path.basename(this.callsite.varInfo.loc.filename);
    //         pathParts.push(fileBaseName);
    //     }

    //     pathParts.push(this.callsite.varInfo.name);
    //     // pathParts.push(this.predicate);

    //     pathParts.push(nm);

    //     //return makeGraphNodePath(filter, settings, this.cfunction, this.predicate, nm);
    //     return pathParts.join('/');

    // }

}

class PPOImpl extends AbstractPO {
    get level(): string {
        return "primary";
    }
    get levelLabel(): string {
        return "I";
    }
}

export class CAnalysisImpl implements CAnalysis {
    apps = [];
    _proofObligations = [];
    appByDirMap = {};
    functionByFile = {};

    poIndex: { [key: string]: ProofObligation } = {};


    public pushPo(po: ProofObligation): string {
        this.proofObligations.push(po);

        let index = linkKey(po);//this.indexOf(po, po.file, po.functionName);
        this.poIndex[index] = po;
        return index;
    }

    public getByIndex(index: string): ProofObligation {
        return this.poIndex[index];
    }


    public get proofObligations() {
        return this._proofObligations;
    }
}


class CallsiteImpl implements Callsite, Graphable {
    private _jcallsite: JCallsite;
    private cfunc: CFunction;
    private spos: SPOImpl[] = [];


    public constructor(jcallsite: JCallsite, cfunc: CFunction) {
        this._jcallsite = jcallsite;
        this.cfunc = cfunc;
    }

    get cfunction() {
        return this.cfunc;
    }

    get name(): string {
        return this._jcallsite.varInfo.name;
    }

    get line(): number {
        return this._jcallsite.varInfo.loc.line;
    }

    public isGlobal(): boolean {
        return !this._jcallsite.varInfo || !this._jcallsite.varInfo.loc;
        //TODO varInfo must not be null (probably)
    }

    public pushSPo(spo: SPOImpl) {
        this.spos.push(spo);
    }

    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {
        let nodeDef: NodeDef = {
            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: "callsite",
            op: this.name,
            attr: <CallsiteNodeAttributes>{
                label: this.name,
                // "predicate": "--",
                // "state": "callsite",
                location: this._jcallsite.varInfo.loc,
                locationPath: this._jcallsite.varInfo.loc.filename + "/" + this.name,
                data: this
            }
        }

        this.spos.forEach(spo => {
            nodeDef.output.push(spo.getGraphKey(filter, settings));
        });
        return nodeDef;
    }

    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        let pathParts: string[] = [];

        // pathParts.push("callsites");//TODO: remove it         

        if (this._jcallsite.varInfo.loc) {
            let fileBaseName: string = path.basename(this._jcallsite.varInfo.loc.filename);
            pathParts.push(fileBaseName);
        }

        pathParts.push(this.name);
        // pathParts.push(this._jcallsite.varInfo.loc.line+"");
        return pathParts.join('/');
    }

    get linkedNodes(): Graphable[] {
        return this.spos;
        // const ret: Graphable[] = [];
        // this._jcallsite.spos.forEach(jSpo => {
        //     this.cfunc.getSPObyId(jSpo.id);
        // });
        // return ret;
    }
}

export class CAnalysisJsonReaderImpl implements XmlReader {

    projectDir: string;
    result: CAnalysisImpl;

    public readDir(dir: string, tracker: ProgressTracker): CAnalysis {

        this.projectDir = dir;
        let files: string[] = kt_fs.listFilesRecursively(dir, ".kt.analysis.json");

        this.result = new CAnalysisImpl();


        files.forEach(file => {
            console.log(file);
            try {
                const json = <KtJson>JSON.parse(fs.readFileSync(file));
                this.mergeJsonData(json);
            }
            catch (e) {
                console.error("cannot parse " + file);
                console.error(e);
            }
            tracker.updateProgress(100);

        });
        return this.result;
    }

    private mergeJsonData(data: KtJson): void {
        data.apps.forEach(app => {
            console.log("source dir:" + app.sourceDir);

            app.files.forEach(file => {

                let absPath = path.normalize(path.join(app.sourceDir, file.name));
                let relative = path.relative(this.projectDir, absPath);
                this.result.functionByFile[relative] = this.toCFuncArray(file.functions, file, app.sourceDir);

            });
        });
    }

    private normalizeSourcePath(base: string, file: string): string {
        let abs = path.normalize(path.join(base, file));
        let relative = path.relative(this.projectDir, abs);
        return relative;
    }

    normalizeLinks(links: JPoLink[], base: string): JPoLink[] {
        if (links) {
            for (let link of links) {
                link.file = this.normalizeSourcePath(base, link.file);
            }
        }
        return links;
    }

    private toCFuncArray(jfunctions: JFunc[], file: JFile, sourceDir: string): CFunction[] {
        const ret: CFunction[] = [];
        let relative = this.normalizeSourcePath(sourceDir, file.name);

        jfunctions && jfunctions.forEach(jfun => {
            const cfun = new CFunctionImpl(jfun, relative);
            ret.push(cfun);

            jfun.ppos && jfun.ppos.forEach(ppo => {
                const mPPOImpl: PPOImpl = new PPOImpl(ppo, cfun, this.result);
                mPPOImpl.links = this.normalizeLinks(ppo.links, sourceDir);
                this.result.pushPo(mPPOImpl);
                cfun._indexPpo(mPPOImpl);
            });



            jfun.callsites && jfun.callsites.forEach(jcallsite => {

                const callsite = new CallsiteImpl(jcallsite, cfun);
                cfun.callsites.push(callsite);


                jcallsite.spos && jcallsite.spos.forEach(spo => {
                    const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, this.result, callsite);
                    mSPOImpl.links = this.normalizeLinks(spo.links, sourceDir);
                    this.result.pushPo(mSPOImpl);
                    callsite.pushSPo(mSPOImpl);
                    cfun._indexSpo(mSPOImpl)
                });

            });

            /* Parsing assumptions */
            jfun.api && jfun.api.aa && jfun.api.aa.forEach(assumption => {
                const aaImpl = new ApiAssumptionImpl(assumption, cfun);
                cfun.api.addApiAssumption(aaImpl);
            });

        });

        return ret;
    }
}
