import * as tools from '../common/tools';
import * as pathExists from 'path-exists';



// import * as path from 'path';
import * as net from 'net';
import * as glob from 'glob';
// import * as PortFinder from "portfinder";
import * as ChildProcess from "child_process";


import {
    FileInfo, ProofObligation, AbstractNode,
    Symbol, PoStates, PODischarge, POLocation, Callsite,
    CApi, CApiAssumption,
    CFunction, sortPoNodes, Graphable, SecondaryProofObligation, Site, Returnsite, Callee, CFunctionBase, HasPath
} from '../common/xmltypes';


import { NodeDef } from '../tf_graph_common/lib/proto'
import { Filter, sharedStart } from '../common/filter'
import { GraphSettings } from '../common/globals'

import { XmlReader } from './xmlreader';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { CAnalysis, CApplication, PONodeAttributes, CallsiteNodeAttributes, AssumptionNodeAttributes } from '../common/xmltypes';

import * as kt_fs from '../common/fstools';
import { normalize } from 'path';

import * as json from './jsonformat';
import { JavaEnv, resolveJava } from './javaenv';

const path = require('path');
const fs = require('fs');

const app = require('electron');


abstract class AbstractLocatable implements HasPath {
    dir: false;
    abstract relativePath: string;
}

class CApiImpl implements CApi {
    private _apiAssumptions: CApiAssumption[] = [];

    get apiAssumptions() {
        return this._apiAssumptions;
    }

    addApiAssumption(aa: CApiAssumption): void {
        this.apiAssumptions.push(aa);
    }
}

class CFunctionImpl extends AbstractLocatable implements CFunction {
    name: string;
    // file: string;

    loc: POLocation;
    line: number;
    callsites: Callsite[] = [];
    relativePath: string;
    private _api = new CApiImpl();

    get fullpath() {
        return this.file + "/" + this.name;
    }

    public constructor(jfun: json.JFunc, relativeFilePath: string) {
        super();
        this.name = jfun.name;
        this.line = jfun.loc.line;
        this.relativePath = relativeFilePath;



        this.loc = {
            line: this.line,
            file: relativeFilePath,
        };


    }

    get file() {
        return this.relativePath;
    }


    get api() {
        return this._api;
    }

    getPPObyId(id: number): ProofObligation {
        const ppo = this.__indexPpo[id];
        if (!ppo) {
            console.error("cannot find PPO with ID: " + id + " in function  " + this.file + "/" + this.name);
        }
        return ppo;
    }

    getSPObyId(id: number): ProofObligation {
        const spo = this.__indexSpo[id];
        if (!spo) {
            console.error("cannot find SPO with ID: " + id + " in function  " + this.file + "/" + this.name);
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

class ApiAssumptionImpl extends AbstractLocatable implements CApiAssumption {
    a: json.JAssumption;
    cfunction: CFunction;

    get file() {
        return this.cfunction.file;
    }

    get relativePath() {
        return this.cfunction.file;
    }

    get assumptionType() {
        return "api";
    }

    get predicate() {
        return this.a.prd;
    }

    get expression() {
        return this.a.exp;
    }

    get line() {
        return this.location.line;
    }

    get functionName() {
        return this.cfunction.name;
    }

    get location() {
        return this.cfunction.loc;
    }

    get ppos(): ProofObligation[] {
        let ret = [];
        this.a.ppos && this.a.ppos.forEach(
            ppoId => {
                let ppo = this.cfunction.getPPObyId(ppoId);
                ppo && ret.push(ppo);
            }
        );

        return ret;
    }

    get spos(): ProofObligation[] {
        let ret = [];
        this.a.spos && this.a.spos.forEach(
            spoId => {
                let spo = this.cfunction.getSPObyId(spoId);
                spo && ret.push(spo);
            }
        );

        return ret;
    }

    public constructor(a: json.JAssumption, cfunc: CFunction) {
        super();
        this.a = a;
        this.cfunction = cfunc;
    }

    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        let nm = "assumption_" + this.a.prd + "[" + this.a.id + "]";

        let pathParts: string[] = [];

        let addFunctionName = true;
        const filePath = fileToGraphKey(this.file, this.functionName, filter, settings);
        if (filePath.length) {
            pathParts.push(filePath);
        }

        pathParts.push(nm);
        return encodeGraphKey(pathParts.join('/'));

    }

    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {

        class AssumptionNodeAttributesImpl implements AssumptionNodeAttributes {
            public state = "assumption";
            private base: ApiAssumptionImpl;
            constructor(base: ApiAssumptionImpl) {
                this.base = base;
            }

            get location() {
                return this.base.location;
            }
            get data() {
                return this.base;
            }
            get locationPath() {
                return this.base.file + "/" + this.base.cfunction.name;
            }
            get label() {
                return this.base.a.prd + "[" + this.base.a.id + "]"
            }
        }

        let nodeDef: NodeDef = {
            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: "assumption-api",
            op: this.cfunction.name,
            attr: new AssumptionNodeAttributesImpl(this)
        };


        // this.ppos.forEach(po => {
        //     nodeDef.input.push(po.getGraphKey(filter, settings));
        // });

        // this.spos.forEach(po => {
        //     nodeDef.output.push(po.getGraphKey(filter, settings));
        // });


        return nodeDef;
    }


}


function linkKey(link: json.JPoLink | ProofObligation): string {
    return link.file + "/" + link.functionName + "/" + link.id;
}





abstract class AbstractPO extends AbstractLocatable implements ProofObligation {
    links: json.JPoLink[];

    indexer: CAnalysisImpl;

    assumptionsIn: CApiAssumption[] = [];
    assumptionsOut: CApiAssumption[] = [];

    abstract level: string;
    abstract levelLabel: string;
    abstract location: POLocation;



    public constructor(ppo: json.JPPO, cfun: CFunction, indexer: CAnalysisImpl) {
        super();
        this.indexer = indexer;

        const state = ppo.sts == "safe" ? "discharged" : ppo.sts;

        this.cfunction = cfun;
        this.predicate = ppo.prd;
        this.state = PoStates[state];
        this.dischargeType = ppo.dep;
        this.expression = ppo.exp;

        this.discharge = <PODischarge>{
            message: ppo.evl
        };

        this.id = "" + ppo.id;
        //
        this.links = ppo.links;

    }


    get label() {
        return this.levelLabel + " [" + this.id + "] " + this.predicate;
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

    dischargeType: string;

    // label: string;
    discharge: PODischarge;
    apiId: string;
    state: PoStates;//XXX
    // outputs: AbstractNode[];

    symbol: Symbol;

    isLinked(): boolean {
        return this.links && (this.links.length > 0);
    }

    id: string;
    cfunction: CFunction;

    get file() {
        return this.location.file;
    }

    get line(): number {
        return this.location.line;
    }

    get functionName() {
        return this.cfunction.name;
    }

    get relativePath(): string {
        return this.location.file;
    }


    public getGraphKey(filter: Filter, settings: GraphSettings): string {

        let pathParts: string[] = [];
        let addFunctionName = true;
        const filePath = fileToGraphKey(this.relativePath, this.functionName, filter, settings);
        if (filePath.length) {
            pathParts.push(filePath);
        }

        let nm = "po-" + this.levelLabel + "-" + this.id;
        pathParts.push(nm);

        return encodeGraphKey(pathParts.join('/'));
    }



    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {

        let nodeDef: NodeDef = {
            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: PoStates[this.state] + "-" + this.dischargeType,
            op: this.functionName,
            attr: <PONodeAttributes>{
                label: this.label,
                // "apiId": this.apiId,    
                predicate: this.predicate,
                level: this.level,
                state: PoStates[this.state],
                location: this.location,
                expression: this.expression,
                discharge: this.discharge,
                locationPath: this.file + "/" + this.functionName,
                data: this
            }
        }



        return nodeDef;
    }
}


export function encodeGraphKey(key) {
    // let encoded = key.split('/').join('_/');
    let encoded = key.trim().split('-').join('_');
    return encoded.split(' ').join('_');
}

export function fileToGraphKey(pth: string, functionName: String, filter: Filter, settings: GraphSettings): string {
    let parts = [];

    let ret = pth;
    if (filter.file) {
        pth = path.relative(filter.file.relativePath, pth);
        while (pth.startsWith("../")) {
            pth = pth.substr(3);
        }
    }

    if (pth.length > 0) {
        parts.push(pth);
    }

    if (functionName) {
        const filterFunctionName = filter.cfunction ? filter.cfunction.name : "";
        if (filterFunctionName != functionName) {
            parts.push(functionName);
        }
    }

    return parts.join('/');
}

class SPOImpl extends AbstractPO implements SecondaryProofObligation {
    callsite: Site;

    get location() {
        return this.callsite.location;
    }

    public constructor(ppo: json.JSPO, cfun: CFunction, indexer: CAnalysisImpl, site: Site) {
        super(ppo, cfun, indexer);
        this.callsite = site;
    }

    get level(): string { return "secondary"; }

    get levelLabel(): string { return "II"; }
}

class PPOImpl extends AbstractPO {
    get level(): string {
        return "primary";
    }
    get levelLabel(): string {
        return "I";
    }

    public location: POLocation;

    public constructor(ppo: json.JPPO, cfun: CFunction, indexer: CAnalysisImpl) {
        super(ppo, cfun, indexer);

        this.location = {
            line: ppo.line,
            file: cfun.file
        }
    }


}

export class CAnalysisImpl implements CAnalysis {
    apps = [];
    _proofObligations = [];
    appByDirMap = {};
    functionByFile = {};

    poIndex: { [key: string]: ProofObligation } = {};
    functionByPath: { [key: string]: CFunction } = {};

    assumptions: Array<CApiAssumption> = [];

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


abstract class AbstractSiteImpl extends AbstractLocatable implements Site, Graphable {

    _jcallsite: json.JSite;
    spos: SecondaryProofObligation[] = [];
    abstract name: string;

    public abstract toNodeDef(filter: Filter, settings: GraphSettings): NodeDef;
    public abstract getGraphKey(filter: Filter, settings: GraphSettings): string;


    get relativePath(): string {
        return this._jcallsite.loc.file;
    }

    public constructor(jcallsite: json.JSite) {
        super();
        this._jcallsite = jcallsite;
    }



    get location() {
        return this._jcallsite.loc;
    }

    get line(): number {
        return this.location.line;
    }


    public pushSPo(spo: SecondaryProofObligation) {
        this.spos.push(spo);
    }





    getSPOs(): SecondaryProofObligation[] {
        return this.spos;
    }
}

export class CalleeImpl extends AbstractLocatable implements Callee, CFunctionBase {
    relativePath: string;

    get name(): string {
        return this.varinfo.name;
    }
    type: string;
    loc: POLocation;

    get line(): number {
        return this.varinfo.loc ? this.varinfo.loc.line : 0;
    }

    get file() {
        return this.relativePath;
    }

    private varinfo: json.JVarInfo;

    public constructor(varinfo: json.JVarInfo, relativeFilePath: string, type: string) {
        super();
        this.varinfo = varinfo;
        this.type = type;
        this.relativePath = relativeFilePath;


        this.loc = {
            line: varinfo.loc ? varinfo.loc.line : 0,
            file: relativeFilePath
        }


    }


    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        let pathParts: string[] = [];

        let nameAddon = "";
        if (this.loc) {
            const filePath = fileToGraphKey(this.relativePath, this.name, filter, settings);
            if (filePath.length)
                pathParts.push(filePath);
            nameAddon = "-L" + this.loc.line;
        } else {
            nameAddon = "-global";
        }

        pathParts.push(this.name + nameAddon);

        return encodeGraphKey(pathParts.join('/'));
    }

    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {
        // console.log("callsite-"+this._jcallsite.type);
        let nodeDef: NodeDef = {

            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: "callsite-" + this.type,
            op: this.name,
            attr: <CallsiteNodeAttributes>{
                label: this.type + ":" + this.name,

                // "predicate": "--",
                state: "callsite",
                location: this.loc,
                locationPath: this.relativePath + "/" + this.name,
                data: this,

            }
        }



        return nodeDef;
    }
}


export class CallsiteImpl extends AbstractSiteImpl implements Callsite, Graphable {

    public callee: Callee;// json.JVarInfo;

    public isGlobal(): boolean {
        return !this.callee || !this._jcallsite.loc;
        //TODO varInfo must not be null (probably)
    }


    public constructor(jcallsite: json.JCallsite, callee: Callee) {
        super(jcallsite);


        this.callee = callee;
    }

    get name(): string {
        return this.callee.name;
    }

    /*
     *
     * callsite{
     *      callee : location (cfuntion), //called from callsite
     *      spo [], //callers at callsite
     * }
     * 
     */
    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        let pathParts: string[] = [];

        // pathParts.push("callsites");//TODO: remove it         
        let nameAddon = "";
        if (this.callee.loc) {
            const filePath = fileToGraphKey(this.relativePath, this.name, filter, settings);
            if (filePath.length)
                pathParts.push(filePath);
            nameAddon = "-L" + this.callee.loc.line;
        }

        pathParts.push(this.name + nameAddon);


        // pathParts.push(this._jcallsite.type);
        // pathParts.push(this.name + nameAddon);


        // pathParts.push(this._jcallsite.varInfo.loc.line+"");
        return encodeGraphKey(pathParts.join('/'));
    }





    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {
        // console.log("callsite-"+this._jcallsite.type);
        let nodeDef: NodeDef = {

            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: "callsite-" + this._jcallsite.type,
            op: this.name,
            attr: <CallsiteNodeAttributes>{
                label: this._jcallsite.type + ":" + this.name,

                // "predicate": "--",
                state: "callsite",
                location: this.callee.loc,
                locationPath: this.relativePath + "/" + this.name,
                data: this,

            }
        }

        this.spos.forEach(spo => {
            nodeDef.output.push(spo.getGraphKey(filter, settings));
        });

        return nodeDef;
    }



}
export class ReturnsiteImpl extends AbstractSiteImpl implements Returnsite, Graphable {
    public constructor(jcallsite: json.JReturnsite) {
        super(jcallsite);
    }
    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {
        console.error("x");
        throw "ReturnsiteImpl: toNodeDef: not implemented";
    }
    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        console.error("x");
        throw "ReturnsiteImpl: getGraphKey:  not implemented";
    }

    get name() {
        return "returnsite";
    }
}

export class CAnalysisJsonReaderImpl implements XmlReader {

    projectDir: string;
    cAnalysisResult: CAnalysisImpl;

    public readDir(dir: string, appPath: string, tracker: ProgressTracker): Promise<CAnalysis> {
         
        this.projectDir = dir;
        return resolveJava()
            .then(env => runJavaJar(env, appPath, dir))
            .then(jsonfiles => {

                console.log("XML 2 JSON completed; " + jsonfiles[0]);
                this.cAnalysisResult = this.readJsonFiles(jsonfiles, tracker);
                return this.cAnalysisResult;
            });

        
        //let files: string[] = kt_fs.listFilesRecursively(dir, ".kt.analysis.json");



        //this.cAnalysisResult = this.readJsonFiles(files, tracker);
        //return this.cAnalysisResult;
    }

    private readJsonFiles(files: string[], tracker: ProgressTracker): CAnalysisImpl {
        this.cAnalysisResult = new CAnalysisImpl();
        files.forEach(file => {
            console.log(file);
            try {
                const json = <json.KtJson>JSON.parse(fs.readFileSync(file));
                this.mergeJsonData(json);
            }
            catch (e) {
                console.error("cannot parse " + file);
                console.error(e);
                console.error("try removing it and re-opening project");
            }
            tracker.updateProgress(100);

        });

        return this.cAnalysisResult;
    }

    private mergeJsonData(data: json.KtJson): void {
        data.apps.forEach(app => {
            console.log("source dir:" + app.sourceDir);

            app.files.forEach(file => {

                const cfunctions = this.toCFuncArray(file.functions, file, app.sourceDir);

                cfunctions.forEach(cfun => {
                    /*
                     * make function by file map
                     */
                    if (!this.cAnalysisResult.functionByFile[cfun.file]) {
                        this.cAnalysisResult.functionByFile[cfun.file] = [];
                    }
                    this.cAnalysisResult.functionByFile[cfun.file].push(cfun);

                    this.cAnalysisResult.functionByPath[cfun.fullpath] = cfun;


                    /*
                     * make assumptions plain array
                     */
                    cfun.api && cfun.api.apiAssumptions &&
                        cfun.api.apiAssumptions.forEach(aa => {
                            this.cAnalysisResult.assumptions.push(aa);
                        });

                });

                /*
                 * binding assumptions 
                 */
                this.cAnalysisResult.assumptions.forEach(
                    assumption => {
                        assumption.ppos.forEach(ppo => tools.pushUnique(ppo.assumptionsIn, assumption));
                        assumption.spos.forEach(spo => tools.pushUnique(spo.assumptionsOut, assumption));
                    }
                );

            });
        });
    }



    private normalizeLinks(links: json.JPoLink[], base: string): json.JPoLink[] {
        if (links) {
            for (let link of links) {
                // link.file = this.normalizeSourcePath(base, link.file);
            }
        }
        return links;
    }

    private toCFuncArray(jfunctions: json.JFunc[], file: json.JFile, sourceDir: string): CFunction[] {

        const cFunctionsArray: CFunction[] = [];


        jfunctions && jfunctions.forEach(jfun => {

            const funcftionFileRelative = tools.normalizeSourcePath(this.projectDir, sourceDir, jfun.loc);
            const cfun = new CFunctionImpl(jfun, funcftionFileRelative);
            cFunctionsArray.push(cfun);

            jfun.ppos &&
                jfun.ppos.forEach(ppo => {
                    const mPPOImpl: PPOImpl = new PPOImpl(ppo, cfun, this.cAnalysisResult);
                    mPPOImpl.links = this.normalizeLinks(ppo.links, sourceDir);
                    this.cAnalysisResult.pushPo(mPPOImpl);
                    cfun._indexPpo(mPPOImpl);
                });


            jfun.returnsites &&
                jfun.returnsites.forEach(jReturnsite => {


                    const returnsite = new ReturnsiteImpl(jReturnsite);


                    jReturnsite.loc.file =
                        tools.normalizeSourcePath(this.projectDir, sourceDir, jReturnsite.loc);

                    jReturnsite.spos && jReturnsite.spos.forEach(spo => {
                        const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, this.cAnalysisResult, returnsite);
                        mSPOImpl.links = this.normalizeLinks(spo.links, sourceDir);
                        this.cAnalysisResult.pushPo(mSPOImpl);
                        returnsite.pushSPo(mSPOImpl);
                        cfun._indexSpo(mSPOImpl)
                    });



                });

            jfun.callsites &&
                jfun.callsites.forEach(jcallsite => {

                    jcallsite.loc.file =
                        tools.normalizeSourcePath(this.projectDir, sourceDir, jcallsite.loc);

                    let callsite = null;
                    if (jcallsite.callee) {

                        // jcallsite.callee.loc.file =  
                        //     tools.normalizeSourcePath(this.projectDir, sourceDir, jcallsite.callee.loc);

                        const calleeFileRelative =
                            tools.normalizeSourcePath(this.projectDir, sourceDir, jcallsite.callee.loc);
                        const callee = new CalleeImpl(jcallsite.callee, calleeFileRelative, jcallsite.type);
                        callsite = new CallsiteImpl(jcallsite, callee);
                        cfun.callsites.push(callsite);
                    }


                    jcallsite.spos && jcallsite.spos.forEach(spo => {
                        const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, this.cAnalysisResult, callsite);
                        mSPOImpl.links = this.normalizeLinks(spo.links, sourceDir);
                        this.cAnalysisResult.pushPo(mSPOImpl);
                        callsite && callsite.pushSPo(mSPOImpl);
                        cfun._indexSpo(mSPOImpl)
                    });

                });

            /* Parsing assumptions */
            jfun.api && jfun.api.aa &&
                jfun.api.aa.forEach(assumption => {
                    const aaImpl = new ApiAssumptionImpl(assumption, cfun);
                    cfun.api.addApiAssumption(aaImpl);
                });

        });

        return cFunctionsArray;
    }
}

const JARNAME = "kt-advance-xml-2.3-jar-with-dependencies.jar";
export function getJarName(appPath: string) {

    console.log("appPath=\t" + appPath);
    let jarname = path.join(path.dirname(appPath), "app.asar.unpacked", "java", JARNAME);

    if (!pathExists.sync(jarname)) {
        console.error(jarname + " does not exist");
        jarname = path.join(appPath, "java", JARNAME);
    }
    // let jarname = path.resolve(appPath, "java/kt-advance-xml-2.3-jar-with-dependencies.jar");
    console.log("jarname=\t" + jarname);
    return jarname;
}


export function runJavaJar(javaEnv: JavaEnv, appPath: string, projectDir: string): Promise<string[]> {

    return new Promise((resolve, reject) => {

        let jsonfiles: string[] = kt_fs.listFilesRecursively(projectDir, ".kt.analysis.json");
        if (jsonfiles.length > 0) {

            console.log("skipping parsing XML, because json files exist");
            resolve(jsonfiles);

        } else {
            const javaExecutablePath = path.resolve(javaEnv.java_home + '/bin/java');

            let fatJar = getJarName(appPath);

            // Start the child java process
            let options = { cwd: projectDir };
            let process = ChildProcess.spawn(javaExecutablePath, [
                '-jar', fatJar, projectDir
            ], options);


            process.on("error", e => {
                console.error("KT  error:", e);
                reject(e);
            });

            process.on("exit", (code, signal) => {
                console.log("KT to JSON done, code:", code, signal);
                if (code == 0) {
                    resolve(kt_fs.listFilesRecursively(projectDir, ".kt.analysis.json"));
                } else {
                    reject("XML parser exit code is " + code + " signal: " + signal);
                }
            });


            process.stdout.on('data', function (data) {
                console.log('XML_PARSER: ' + data.toString());
            });

            process.stderr.on('data', function (data) {
                console.log('ERROR: ' + data.toString());
            });
        }




    });





}
