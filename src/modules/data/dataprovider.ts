import * as ChildProcess from "child_process";
import * as fs from 'fs';
import * as path from 'path';
import * as json from '../../generated/kt-json';
import { Filter } from '../common/filter';
import * as kt_fs from '../common/fstools';
import { GraphSettings } from '../common/globals';
import * as tools from '../common/tools';
import { AssumptionNodeAttributes, Callee, Callsite, CallsiteNodeAttributes, CAnalysis, CApi, CApiAssumption, CFunction, CFunctionBase, Graphable, HasPath, PODischarge, POLocation, PONodeAttributes, PoStates, ProofObligation, RenderInfo, Returnsite, SecondaryProofObligation, Site, Symbol, CApp } from '../common/xmltypes';
import { contracts } from "../contracts/contracts";

import { ProgressTracker } from '../tf_graph_common/lib/common';
import { NodeDef } from '../tf_graph_common/lib/proto';
import { getJarName, JavaEnv, resolveJava } from './javaenv';
import { XmlReader } from './xmlreader';
import { CFileContractXml } from "../contracts/xml";
import { FileSystem, CONTRACTS_DIR } from "../common/filesystem";
import { runAsyncTask, runTask } from "../tf_graph_common/lib/util";





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
    a: json.JApiAssumption;
    cfunction: CFunction;
    renderInfo: RenderInfo;

    get file() {
        return this.cfunction.file;
    }

    get relativePath() {
        return this.cfunction.file;
    }

    get assumptionType() {
        return this.a.type;
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

    public constructor(a: json.JApiAssumption, cfunc: CFunction) {
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
            // public assumptionType = "aa";
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
            device: "assumption-" + this.a.type,//lkklkkllklk
            op: this.cfunction.name,
            attr: new AssumptionNodeAttributesImpl(this)
        };

        return nodeDef;
    }


}


function linkKey(link: ProofObligation): string {
    return link.file + "/" + link.functionName + "/" + link.id;
}





abstract class AbstractPO extends AbstractLocatable implements ProofObligation {
    // links: json.JPoLink[];
    renderInfo: RenderInfo;


    assumptionsIn: CApiAssumption[] = [];
    assumptionsOut: CApiAssumption[] = [];

    abstract level: string;
    abstract levelLabel: string;
    abstract location: POLocation;



    public constructor(ppo: json.JPO, cfun: CFunction) {
        super();


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

    public constructor(ppo: json.JPO, cfun: CFunction, site: Site) {
        super(ppo, cfun);
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

    public constructor(ppo: json.JPO, cfun: CFunction) {
        super(ppo, cfun);

        this.location = {
            line: ppo.line,
            file: cfun.file
        }
    }


}

export class CAnalysisImpl implements CAnalysis {
    apps = [];
    _proofObligations = [];
    functionByFile = {};
    contracts: contracts.ContractsCollection = new contracts.ContractsCollection(null);

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

    _jcallsite: json.JCallsite;
    spos: SecondaryProofObligation[] = [];
    abstract name: string;

    public abstract toNodeDef(filter: Filter, settings: GraphSettings): NodeDef;
    public abstract getGraphKey(filter: Filter, settings: GraphSettings): string;


    get relativePath(): string {
        return this._jcallsite.loc.file;
    }

    public constructor(jcallsite: json.JCallsite) {
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
    public constructor(jcallsite: json.JCallsite) {
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
    fs: FileSystem;
    cAnalysisResult: CAnalysisImpl;

    public readDir(projectFs: FileSystem, _tracker: ProgressTracker): Promise<CAnalysis> {

        let readingXmlTracker: ProgressTracker = _tracker.getSubtaskTracker(70, "reading XML data");

        let readingJsonTracker: ProgressTracker = _tracker.getSubtaskTracker(20, "reading JSON data");

        let readingContractsTracker: ProgressTracker = _tracker.getSubtaskTracker(10, "reading Contracts XMLs");

        this.fs = projectFs;
        return resolveJava()
            .then(env => runJavaJar(env, projectFs, readingXmlTracker))
            .then(jsonfiles =>
                runTask("reading JSON data", 0, () => this.readJsonFiles(jsonfiles, readingJsonTracker), _tracker)
            )
            .then(cAnalysisResult => {
                let cc = runTask("reading Contracts XMLs", 0, () => this.readContractsXmls(projectFs, readingContractsTracker), _tracker);
                // let cc = this.readContractsXmls(projectFs, readingContractsTracker);
                cAnalysisResult.contracts = cc;
                return cAnalysisResult;
            });

    }



    private readContractsXmls(projectFs: FileSystem, tracker: ProgressTracker): contracts.ContractsCollection | null {
        let contractsPath = path.join(projectFs.baseDir, CONTRACTS_DIR);
        // console.error("reading contracts XMLs is not implemented yet; dir:" + contractsPath);

        if (!fs.existsSync(contractsPath)) {
            console.warn(contractsPath + " does not exist");
            contractsPath = projectFs.baseDir;// return null;
        }

        const files: string[] = kt_fs.walkSync(projectFs.baseDir, "_c.xml")
        const cc: contracts.ContractsCollection = new contracts.ContractsCollection(contractsPath);
        let cnt: number = 0;
        for (const file of files) {

            const c: CFileContractXml = CFileContractXml.fromXml(file);
            const xmldir = path.dirname(file);
            let appDir = xmldir;
            const cdir = path.dirname(c.name);
            if (xmldir.endsWith(cdir)) {
                appDir = xmldir.substr(0, xmldir.indexOf(cdir))
            }


            cc.addContract(c);

            // let relativizedFile = path.relative(dir, file);
            // contract.name=relativizedFile;

            cnt++;
            tracker.updateProgress(files.length / cnt);
        }
        tracker.updateProgress(100);
        return cc;
    }

    private readJsonFiles(files: string[], tracker: ProgressTracker): CAnalysisImpl {

        const inc = 100 / files.length;
        this.cAnalysisResult = new CAnalysisImpl();
        files.forEach(file => {
            const jsonParsingTracker: ProgressTracker = tracker.getSubtaskTracker(inc, "parsing JSON data");
            this.readJsonFile(file, jsonParsingTracker);
        });

        return this.cAnalysisResult;
    }


    private readJsonFile(file: string, tracker: ProgressTracker): CAnalysisImpl {

        try {
            const contents = runTask("reading " + file, 5, () => fs.readFileSync(file).toString(), tracker);
            const json = runTask("parsing " + file, 15, () => <json.JAnalysis>JSON.parse(contents), tracker);
            runTask("processing " + file, 80, () => this.mergeJsonData(json), tracker);

        }
        catch (e) {
            console.error("cannot parse " + file, e);
            console.error("try removing it and re-opening project");
        }

        return this.cAnalysisResult;
    }

    private mergeJsonData(data: json.JAnalysis): void {


        data.apps.forEach(app => {
            console.log("source dir:" + app.sourceDir);
            //tracker.updateProgress(trackerInc);
            const fileTrackerInc = 100 / app.files.length;

            app.files.forEach(file => {



                const cfunctions = this.toCFuncArray(file.functions, file, app);


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



    private toCFuncArray(jfunctions: json.JFunc[], file: json.JFile, app: CApp): CFunction[] {

        const cFunctionsArray: CFunction[] = [];


        jfunctions && jfunctions.forEach(jfun => {

            const funcftionFileRelative = this.fs.normalizeSourcePath(app, jfun.loc);
            const cfun = new CFunctionImpl(jfun, funcftionFileRelative);
            cFunctionsArray.push(cfun);

            jfun.ppos &&
                jfun.ppos.forEach(ppo => {
                    const mPPOImpl: PPOImpl = new PPOImpl(ppo, cfun);
                    this.cAnalysisResult.pushPo(mPPOImpl);
                    cfun._indexPpo(mPPOImpl);
                });


            jfun.returnsites &&
                jfun.returnsites.forEach(jReturnsite => {


                    const returnsite = new ReturnsiteImpl(jReturnsite);


                    jReturnsite.loc.file =
                        this.fs.normalizeSourcePath(app, jReturnsite.loc);

                    jReturnsite.spos && jReturnsite.spos.forEach(spo => {
                        const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, returnsite);
                        this.cAnalysisResult.pushPo(mSPOImpl);
                        returnsite.pushSPo(mSPOImpl);
                        cfun._indexSpo(mSPOImpl)
                    });



                });

            jfun.callsites &&
                jfun.callsites.forEach(jcallsite => {

                    jcallsite.loc.file = this.fs.normalizeSourcePath(app, jcallsite.loc);

                    let callsite = null;
                    if (jcallsite.callee) {

                        const calleeFileRelative =
                            this.fs.normalizeSourcePath(app, jcallsite.callee.loc);
                        const callee = new CalleeImpl(jcallsite.callee, calleeFileRelative, jcallsite.type);
                        callsite = new CallsiteImpl(jcallsite, callee);
                        cfun.callsites.push(callsite);
                    }


                    jcallsite.spos && jcallsite.spos.forEach(spo => {
                        const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, callsite);
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


function runJavaJar(javaEnv: JavaEnv, projectFs: FileSystem, tracker: ProgressTracker): Promise<string[]> {

    return new Promise((resolve, reject) => {

        let jsonfiles: string[] = projectFs.listFilesRecursively(".kt.analysis.json");

        if (jsonfiles.length > 0) {
            tracker.updateProgress(100);
            tracker.setMessage("skipping parsing XML, because json files exist");
            resolve(jsonfiles);

        } else {
            tracker.setMessage("parsing XML files");

            const javaExecutablePath = path.resolve(javaEnv.java_home + '/bin/java');

            let fatJar = getJarName(projectFs.appPath);

            // Start the child java process
            let options = { cwd: projectFs.baseDir };
            let process = ChildProcess.spawn(javaExecutablePath, [
                '-jar', fatJar, projectFs.baseDir
            ], options);


            process.on("error", e => {
                console.error("KT  error:", e);
                reject(e);
            });

            process.on("exit", (code, signal) => {
                console.log("KT to JSON done, code:", code, signal);
                if (code == 0) {
                    resolve(projectFs.listFilesRecursively(".kt.analysis.json"));
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
