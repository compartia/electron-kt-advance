import * as ChildProcess from "child_process";
import * as fs from 'fs';
import * as path from 'path';
import * as json from '../../generated/kt-json';
import { Filter } from '../common/filter';
import * as kt_fs from '../common/fstools';
import { GraphSettings } from '../common/globals';
import * as tools from '../common/tools';
import { AssumptionNodeAttributes, Callee, Callsite, CallsiteNodeAttributes, CAnalysis, CApi, CApiAssumption, CFunction, CFunctionBase, Graphable, HasPath, PODischarge, POLocation, PONodeAttributes, PoStates, ProofObligation, RenderInfo, Returnsite, SecondaryProofObligation, Site, Symbol, CApp, CFile } from '../common/xmltypes';
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
    abstract absFile: string;
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

    private _api = new CApiImpl();

    get absFile(): string {
        return this.loc.cfile.absFile;
    }



    get fullpath() {
        return this.file + "/" + this.name;
    }

    get relativePath() {
        return this.loc.cfile.relativePath;
    }

    public constructor(jfun: json.JFunc, cfile: CFile) {
        super();
        this.name = jfun.name;
        this.line = jfun.loc.line;


        this.loc = {
            line: this.line,
            cfile: cfile,
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
            console.error(`cannot find PPO with ID: ${id} in function  ${this.file} /  ${this.name}`);
        }
        return ppo;
    }

    getSPObyId(id: number): ProofObligation {
        const spo = this.__indexSpo[id];
        if (!spo) {
            console.error(`cannot find SPO with ID: ${id} in function  ${this.file} /  ${this.name}`);
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

    get absFile(): string {
        return this.cfunction.absFile;
    }

    get relativePath() {
        return this.cfunction.relativePath;
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
        const filePath = fileToGraphKey(this.relativePath, this.functionName, filter, settings);
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
                return this.base.relativePath + "/" + this.base.cfunction.name;
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
    return link.relativePath + "/" + link.functionName + "/" + link.id;
}





abstract class AbstractPO extends AbstractLocatable implements ProofObligation {
    // links: json.JPoLink[];
    renderInfo: RenderInfo;


    assumptionsIn: CApiAssumption[] = [];
    assumptionsOut: CApiAssumption[] = [];

    abstract level: string;
    abstract levelLabel: string;
    abstract location: POLocation;


    get absFile(): string {
        return this.location.cfile.absFile;
    }

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
        let index = ret.indexOf(this, 0);
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



    get line(): number {
        return this.location.line;
    }

    get functionName() {
        return this.cfunction.name;
    }

    get relativePath(): string {
        return this.location.cfile.relativePath;
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
                locationPath: this.relativePath + "/" + this.functionName,
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

export function fileToGraphKey(_pth: string, functionName: String, filter: Filter, settings: GraphSettings): string {
    let parts = [];

    let pth = _pth;
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
            cfile: cfun.loc.cfile
        }
    }


}

export class CAnalysisImpl implements CAnalysis {
    apps = [];
    private _proofObligations = [];
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

    // _jcallsite: json.JCallsite;
    jcallsitetype: string;
    spos: SecondaryProofObligation[] = [];
    abstract name: string;

    private _loc: POLocation;

    get absFile(): string {
        return this.location.cfile.absFile;
    }

    public abstract toNodeDef(filter: Filter, settings: GraphSettings): NodeDef;
    public abstract getGraphKey(filter: Filter, settings: GraphSettings): string;


    get relativePath(): string {
        return this._loc.cfile.relativePath;
    }

    public constructor(jcallsite: json.JCallsite, cfile: CFile) {
        super();
        this.jcallsitetype = jcallsite.type;
        // this._jcallsite = jcallsite;
        this._loc = {
            line: jcallsite.loc.line,
            cfile: cfile
        }
    }


    get location(): POLocation {
        return this._loc;
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
    type: string;
    private _loc: POLocation;

    get absFile(): string {
        return this.location.cfile.absFile;
    }

    get location() {
        return this._loc;
    }

    get name(): string {
        return this.varinfo.name;
    }

    get functionName() {
        return this.name;
    }


    get line(): number {
        return this.varinfo.loc ? this.varinfo.loc.line : 0;
    }

    get relativePath() {
        return this.location.cfile.relativePath;
    }

    get arguments() {
        return this.varinfo.type;
    }

    private varinfo: json.JVarInfo;

    public constructor(varinfo: json.JVarInfo, cfile: CFile, type: string) {
        super();
        this.varinfo = varinfo;
        this.type = type;


        this._loc = {
            line: varinfo.loc ? varinfo.loc.line : 0,
            cfile: cfile
        }
    }


    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        let pathParts: string[] = [];

        let nameAddon = "";
        if (this.location) {
            const filePath = fileToGraphKey(this.relativePath, null, filter, settings);
            if (filePath.length)
                pathParts.push(filePath);
            nameAddon = "-L" + this.location.line;
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
            device: "callee-" + this.type,
            op: this.name,
            attr: <CallsiteNodeAttributes>{
                label: this.type + ":" + this.name,

                // "predicate": "--",
                state: "callee",
                location: this.location,
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
        return !this.callee;//|| !this._jcallsite.loc;
        //TODO varInfo must not be null (probably)
    }


    public constructor(jcallsite: json.JCallsite, callee: Callee, cfile: CFile) {
        super(jcallsite, cfile);

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
        if (this.callee.location) {
            const filePath = fileToGraphKey(this.relativePath, this.name, filter, settings);
            if (filePath.length)
                pathParts.push(filePath);
            nameAddon = "-L" + this.callee.location.line;
        }

        pathParts.push(this.name + nameAddon);

        return encodeGraphKey(pathParts.join('/'));
    }





    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {
        let nodeDef: NodeDef = {

            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: "callsite-" + this.jcallsitetype,
            op: this.name,
            attr: <CallsiteNodeAttributes>{
                label: this.jcallsitetype + ":" + this.name,
                state: "callsite",
                location: this.callee.location,
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
    public constructor(jcallsite: json.JCallsite, cfile: CFile) {
        super(jcallsite, cfile);
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
                runAsyncTask("reading JSON data", 0, () => this.readJsonFiles(jsonfiles, projectFs, readingJsonTracker), _tracker)
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

            const idx = file.lastIndexOf(CONTRACTS_DIR);
            if (idx > 0) {
                const absSourceDir = file.substr(0, idx);
                const capp: CApp = projectFs.getCApp(absSourceDir);


                const c: CFileContractXml = CFileContractXml.fromXml(file);
                const cFile = capp.getCFile(c.name + ".c");
                c.file = cFile;
                cc.addContract(c);
            }



            cnt++;
            tracker.updateProgress(files.length / cnt);
        }
        tracker.updateProgress(1);
        return cc;
    }

    private readJsonFiles(files: string[], projectFs: FileSystem, tracker: ProgressTracker): CAnalysisImpl {

        const inc = 100 / files.length;
        this.cAnalysisResult = new CAnalysisImpl();
        files.forEach(file => {
            const jsonParsingTracker: ProgressTracker = tracker.getSubtaskTracker(inc, "parsing JSON data");
            this.readJsonFile(file, projectFs, jsonParsingTracker);
        });

        return this.cAnalysisResult;
    }


    private readJsonFile(file: string, projectFs: FileSystem, tracker: ProgressTracker): CAnalysisImpl {

        try {
            const contents = runTask("reading " + file, 5, () => fs.readFileSync(file).toString(), tracker);
            const json = runTask("parsing " + file, 15, () => <json.JAnalysis>JSON.parse(contents), tracker);
            let subtracker = tracker.getSubtaskTracker(80, "processing");
            runTask("processing " + file, 0, () => this.mergeJsonData(json, projectFs, subtracker), tracker);

        }
        catch (e) {
            console.error("cannot parse " + file, e);
            console.error("try removing it and re-opening project");
        }

        return this.cAnalysisResult;
    }

    private mergeJsonData(data: json.JAnalysis, projectFs: FileSystem, tracker: ProgressTracker): void {


        data.apps.forEach(app => {
            // console.log("source dir:" + app.sourceDir);

            let capp: CApp = projectFs.getCApp(app.baseDir, app.actualSourceDir);

            //tracker.updateProgress(trackerInc);
            const fileTrackerInc = 100 / app.files.length;

            app.files.forEach(file => {

                const cfile = capp.getCFile(file.name);

                setTimeout(() => tracker.updateProgress(fileTrackerInc), 100);


                const cfunctions = this.toCFuncArray(file.functions, cfile);


                cfunctions.forEach(cfun => {
                    /*
                     * make function by file map
                     */
                    if (!this.cAnalysisResult.functionByFile[cfun.relativePath]) {
                        this.cAnalysisResult.functionByFile[cfun.relativePath] = [];
                    }
                    this.cAnalysisResult.functionByFile[cfun.relativePath].push(cfun);

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



    private toCFuncArray(jfunctions: json.JFunc[], cfile: CFile): CFunction[] {

        const cFunctionsArray: CFunction[] = [];


        jfunctions && jfunctions.forEach(jfun => {

            const cfun = new CFunctionImpl(jfun, cfile);
            cFunctionsArray.push(cfun);

            jfun.ppos &&
                jfun.ppos.forEach(ppo => {
                    const mPPOImpl: PPOImpl = new PPOImpl(ppo, cfun);
                    this.cAnalysisResult.pushPo(mPPOImpl);
                    cfun._indexPpo(mPPOImpl);
                });


            jfun.returnsites &&
                jfun.returnsites.forEach(jReturnsite => {


                    const crfile = cfile.app.getCFile(jReturnsite.loc.file);
                    const returnsite = new ReturnsiteImpl(jReturnsite, crfile);



                    jReturnsite.spos && jReturnsite.spos.forEach(spo => {
                        const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, returnsite);
                        this.cAnalysisResult.pushPo(mSPOImpl);
                        returnsite.pushSPo(mSPOImpl);
                        cfun._indexSpo(mSPOImpl)
                    });



                });

            jfun.callsites &&
                jfun.callsites.forEach(jcallsite => {



                    let callsite = null;
                    if (jcallsite.callee) {



                        const callsiteFile = cfile.app.getCFile(jcallsite.loc.file);
                        let calleeFile = callsiteFile;//
                        if (jcallsite.callee.loc)
                            calleeFile = cfile.app.getCFile(jcallsite.callee.loc.file);

                        const callee = new CalleeImpl(jcallsite.callee, calleeFile, jcallsite.type);
                        callsite = new CallsiteImpl(jcallsite, callee, callsiteFile);
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
       
        let jsonfiles: string[] = [];//projectFs.listFilesRecursively(".kt.analysis.json");//XXX

        if (jsonfiles.length > 0) {
            tracker.updateProgress(100);
            tracker.setMessage("skipping parsing XML, because json files exist");
            resolve(jsonfiles);

        } else {
            const resulting_jsons: string[] = [];
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
                console.log(`KT to JSON done, code:, ${code}, ${signal} `);
                if (code == 0) {
                    console.log(resulting_jsons);
                    if (resulting_jsons.length == 0) {
                        console.error("no JSON file known");
                        reject("no JSON files produced");
                    } else {
                        resolve(resulting_jsons);
                    }

                } else {
                    reject("XML parser exit code is " + code + " signal: " + signal);
                }
            });


            let lastProg = 0;
            process.stdout.on('data', (data) => {
                let msg = data.toString();
                let parts = msg.split(":");

                if (parts[0] === 'PROGRESS') {
                    let prog = parseFloat(parts[1]);
                    tracker.updateProgress(prog - lastProg);
                    tracker.setMessage("parsing XML files: " + Math.round(prog * 10) / 10 + "%");
                    lastProg = prog;
                }
                else if (parts[0] == 'RESULT_JSON') {
                    resulting_jsons.push(parts[1].trim())
                    console.log(parts[1]);
                    tracker.setMessage("about to read " + parts[1]);
                } else {
                    console.log('XML_PARSER: ' + msg);
                }

            });

            process.stderr.on('data', function (data) {
                console.log('ERROR: ' + data.toString());
            });
        }




    });





}
