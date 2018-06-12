import * as ChildProcess from "child_process";
import { Filter } from '../common/filter';
import * as kt_fs from '../common/fstools';
import { GraphSettings } from '../common/globals';
import * as tools from '../common/tools';
import { AssumptionNodeAttributes, CAnalysis, CApi, CApiAssumption, CFunction, CFunctionBase, Callee, Callsite, CallsiteNodeAttributes, Graphable, HasPath, PODischarge, POLocation, PONodeAttributes, PoStates, ProofObligation, RenderInfo, Returnsite, SecondaryProofObligation, Site, Symbol } from '../common/xmltypes';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { NodeDef } from '../tf_graph_common/lib/proto';
import { JavaEnv, getJarName, resolveJava } from './javaenv';
import * as json from './jsonformat';
import { XmlReader } from './xmlreader';



const path = require('path');
const fs = require('fs');

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
    renderInfo: RenderInfo;

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
            public assumptionType = "aa";
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

        return nodeDef;
    }


}


function linkKey(link: json.JPoLink | ProofObligation): string {
    return link.file + "/" + link.functionName + "/" + link.id;
}





abstract class AbstractPO extends AbstractLocatable implements ProofObligation {
    // links: json.JPoLink[];
    renderInfo: RenderInfo;
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


    }

    get associatedPOs() {
        let ret = [];
        this.assumptionsIn.forEach(assumption => {
            ret = ret.concat(assumption.ppos);
            ret = ret.concat(assumption.spos);
        });
        this.assumptionsOut.forEach(assumption => {
            ret = ret.concat(assumption.ppos);
            ret = ret.concat(assumption.spos);
        });


        //removing self
        var index = ret.indexOf(this, 0);
        if (index > -1) {
           ret.splice(index, 1);
        }
        return ret;
     }

 


    get label() {
        return "[L" + this.line + "] " + this.predicate + (this.levelLabel == "II" ? " II" : "");
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

    dischargeType: string;

    discharge: PODischarge;
    apiId: string;
    state: PoStates;//XXX

    symbol: Symbol;

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
    renderInfo: RenderInfo;
    relativePath: string;

    get name(): string {
        return this.varinfo.name;
    }

    get functionName() {
        return this.name;
    }

    type: string;
    loc: POLocation;

    get line(): number {
        return this.varinfo.loc ? this.varinfo.loc.line : 0;
    }

    get file() {
        return this.relativePath;
    }

    get arguments() {
        return this.varinfo.type;
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
            const filePath = fileToGraphKey(this.relativePath, null, filter, settings);
            if (filePath.length)
                pathParts.push(filePath);
            nameAddon = "-L" + this.loc.line;
        } else {
            nameAddon = "-global";
        }

        pathParts.push(this.name);

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

        return encodeGraphKey(pathParts.join('/'));
    }





    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {
        let nodeDef: NodeDef = {

            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: "callsite-" + this._jcallsite.type,
            op: this.name,
            attr: <CallsiteNodeAttributes>{
                label: this._jcallsite.type + ":" + this.name,
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

    public readDir(dir: string, appPath: string, _tracker: ProgressTracker): Promise<CAnalysis> {
        let readingXmlTracker: ProgressTracker = _tracker.getSubtaskTracker(80, "reading XML data");
        let readingJsonTracker: ProgressTracker = _tracker.getSubtaskTracker(20, "reading JSON data");

        this.projectDir = dir;
        return resolveJava()
            .then(env => runJavaJar(env, appPath, dir, readingXmlTracker))
            .then(jsonfiles => {

                console.log("XML 2 JSON completed; " + jsonfiles[0]);
                this.cAnalysisResult = this.readJsonFiles(jsonfiles, readingJsonTracker);
                return this.cAnalysisResult;
            });

    }

    private readJsonFiles(files: string[], tracker: ProgressTracker): CAnalysisImpl {
        const inc = 100 / files.length;
        this.cAnalysisResult = new CAnalysisImpl();
        files.forEach(file => {
            tracker.setMessage("reading " + file);
            console.info("reading" + file);
            try {
                const json = <json.KtJson>JSON.parse(fs.readFileSync(file));
                const jsonParsingTracker: ProgressTracker = tracker.getSubtaskTracker(inc, "parsing JSON data");

                this.mergeJsonData(json, jsonParsingTracker);
            }
            catch (e) {
                console.error("cannot parse " + file, e);
                console.error("try removing it and re-opening project");
            }

            tracker.updateProgress(100);

        });

        return this.cAnalysisResult;
    }

    private mergeJsonData(data: json.KtJson, tracker: ProgressTracker): void {
        const trackerInc = 100 / data.apps.length;

        data.apps.forEach(app => {
            console.log("source dir:" + app.sourceDir);
            //tracker.updateProgress(trackerInc);
            const fileTrackerInc = 100 / app.files.length;
            const subTracker: ProgressTracker = tracker.getSubtaskTracker(trackerInc, "parsing data " + app.sourceDir);

            app.files.forEach(file => {

                const cfunctions = this.toCFuncArray(file.functions, file, app.sourceDir);

                subTracker.setMessage("parsing C-functions");
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
                subTracker.setMessage("binding assumptions");
                this.cAnalysisResult.assumptions.forEach(
                    assumption => {
                        assumption.ppos.forEach(ppo => tools.pushUnique(ppo.assumptionsIn, assumption));
                        assumption.spos.forEach(spo => tools.pushUnique(spo.assumptionsOut, assumption));
                    }
                );

                subTracker.updateProgress(fileTrackerInc);

            });
        });
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

                        const calleeFileRelative =
                            tools.normalizeSourcePath(this.projectDir, sourceDir, jcallsite.callee.loc);
                        const callee = new CalleeImpl(jcallsite.callee, calleeFileRelative, jcallsite.type);
                        callsite = new CallsiteImpl(jcallsite, callee);
                        cfun.callsites.push(callsite);
                    }


                    jcallsite.spos && jcallsite.spos.forEach(spo => {
                        const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, this.cAnalysisResult, callsite);
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


export function runJavaJar(javaEnv: JavaEnv, appPath: string, projectDir: string, tracker: ProgressTracker): Promise<string[]> {

    return new Promise((resolve, reject) => {

        let jsonfiles: string[] = kt_fs.listFilesRecursively(projectDir, ".kt.analysis.json");

        if (jsonfiles.length > 0) {

            tracker.setMessage("skipping parsing XML, because json files exist");
            tracker.updateProgress(100);
            resolve(jsonfiles);


        } else {
            tracker.setMessage("parsing XML files");

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
                    tracker.updateProgress(50);
                    resolve(kt_fs.listFilesRecursively(projectDir, ".kt.analysis.json"));
                } else {
                    reject("XML parser exit code is " + code + " signal: " + signal);
                }
            });


            let lastProg = 0;
            process.stdout.on('data', function (data) {
                let msg = data.toString();
                let parts = msg.split(":");
                if (parts[0] === 'PROGRESS') {
                    let prog = parseFloat(parts[1]);
                    tracker.updateProgress(prog - lastProg);
                    tracker.setMessage("parsing XML files: " + Math.round(prog * 10) / 10 + "%");
                    lastProg = prog;
                } else {
                    console.log('XML_PARSER: ' + data.toString());
                }

            });

            process.stderr.on('data', function (data) {
                console.log('ERROR: ' + data.toString());
            });
        }




    });





}
