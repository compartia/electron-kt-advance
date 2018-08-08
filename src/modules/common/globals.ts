import * as fs from 'fs';
import * as _ from "lodash";
import * as path from 'path';
import { contracts as Contracts } from "../contracts/contracts";
import * as XmlWriter from '../contracts/xml';
import { CAnalysisJsonReaderImpl } from '../data/dataprovider';
import { XmlReader } from '../data/xmlreader';
import { buildCallsGraph, buildGraph } from '../graph_builder';
import { Stats } from '../stats/stats';
import * as tf from '../tf_graph_common/lib/common';
import { NodeDef } from '../tf_graph_common/lib/proto';
import { runAsyncPromiseTask } from "../tf_graph_common/lib/util";
import { CONTRACTS_DIR, FileSystem } from "./filesystem";
import { Filter } from './filter';
import { FileContents } from "./source";
import { CONF, loadProjectMayBe } from './storage';
import { AbstractNode, Callee, CAnalysis, CApiAssumption, CFile, CFunction, HasPath, PoStates, ProofObligation, RenderInfo, sortPoNodes } from './xmltypes';
import { ProjectStatus, ProjectStatusImpl } from './status';





const dialog = require('electron').remote.dialog;


export var TABS = [
    'summary', 'source', 'proof obligations', 'assumptions', 'contracts', 'graphs', 'calls', '?'
];


export enum GraphGrouppingOptions { file, predicate };

export class GraphSettings {
    groupBy: GraphGrouppingOptions = GraphGrouppingOptions.file;
    includeCallsites = true;
}

export class JsonReadyProject {
    baseDir: string;
    stats: Stats;
}



export interface ContractsController {
    saveContract(c: Contracts.CFileContract, callbackfn?: Function): boolean;
    getFileContracts(file: HasPath): Contracts.CFileContract;
    getFunctionContracts(fun: CFunction): Contracts.CFunctionContract;
}

export interface CProject {
    id: number;
    functionByFile: { [key: string]: Array<CFunction> };
    fs: FileSystem;
    status: ProjectStatus;
    stats: Stats;
    filteredAssumptions: Array<CApiAssumption>;
    assumptions: Array<CApiAssumption>;
    filteredContracts: Array<Contracts.CFileContract>;
    contracts: Contracts.ContractsCollection;
    filteredProofObligations: Array<ProofObligation>;
    proofObligations: Array<ProofObligation>;

    forEachFunction(callbackfn: (value: CFunction, index: number, array: CFunction[]) => void);
    applyRenderInfos();

    contractsController: ContractsController;
}

export class ProjectImpl implements CProject, ContractsController {

    functionByFile: { [key: string]: Array<CFunction> } = {};
    fs: FileSystem;
    status: ProjectStatus;

    stats: Stats;
    private _contracts: Contracts.ContractsCollection;

    /* deprecated */
    filteredContracts: Array<Contracts.CFileContract>;
    /**
    * previously saved statistics
    */
    oldstats: Stats;
    id: number = Math.random();
    _proofObligations: Array<ProofObligation> = [];
    _filteredProofObligations: Array<ProofObligation> = null;
    _filteredAssumptions: Array<CApiAssumption> = null;

    _assumptions: Array<CApiAssumption> = [];

    allPredicates: Array<string>;

    renderInfos: { [key: string]: RenderInfo } = {};

    constructor(fs: FileSystem) {
        this.status = new ProjectStatusImpl(this);
        this._contracts = new Contracts.ContractsCollection()
        if (!fs) throw "param is required";
        this.open(fs);
    }

    get contracts(): Contracts.ContractsCollection {
        return this._contracts;
    }

    set contracts(contracts: Contracts.ContractsCollection) {
        this._contracts = contracts;
    }

    get contractsController(): ContractsController {
        return this;
    }

    getFunctionContracts(fun: CFunction): Contracts.CFunctionContract {
        if (!fun) return null;

        let cfile = fun.loc.cfile;
        let fileContract = this.getFileContracts(cfile);
        let funC = fileContract.getFunctionContractByName(fun.name);
        if (!funC) {
            funC = Contracts.CFunctionContract.makeByCFunction(fun);
            fileContract.addFunctionContract(funC);
        }
        return funC;
    }

    getFileContracts(file: HasPath): Contracts.CFileContract {
        if (!file) return null;
        let c = this.contracts.contractsByFile[file.relativePath];
        if (!c) {
            c = Contracts.makeContractByCFile(<CFile>file);
            this.contracts.addContract(c);
        }
        return c;
    }

    public saveContract(c: Contracts.CFileContract, callbackfn?: Function): boolean {
        try {
            const _dirToSave = path.join(c.file.app.baseDir, CONTRACTS_DIR);
            const fileToSave = path.join(_dirToSave, c.name + "_c.xml");
            const dir = path.dirname(fileToSave);

            if (!fs.existsSync(dir)) {
                console.log("making " + dir);
                let mkdirp = require('mkdirp');
                mkdirp.sync(dir);
            }


            const data = XmlWriter.toXml(c);
            console.log(data);
            console.log(`saving contract to ${fileToSave}`);
            fs.writeFileSync(fileToSave, data);
            if (callbackfn) {
                callbackfn("saved to " + fileToSave);
            }
            return true;
        } catch (e) {
            console.log(e);
            if (callbackfn) {
                callbackfn("Failed saving:" + e);
            }
            return false;
        }
    }


    private getOrCreateRenderInfo(po: ProofObligation): RenderInfo {
        const stateName = PoStates[po.state];
        const icon = ["kt:state", stateName, po.dischargeType].join('-').toLowerCase();
        const clazz = ["po", stateName, po.dischargeType].join('-').toLowerCase();
        return this.addUniqueRI(clazz, icon);
    }

    private getOrCreateAssumptionRenderInfo(po: CApiAssumption): RenderInfo {
        const icon = ["kt:state-assumption", po.assumptionType].join('-').toLowerCase();
        const clazz = ["po-assumption", po.assumptionType].join('-').toLowerCase();
        return this.addUniqueRI(clazz, icon);
    }

    private getOrCreateCalleeRenderInfo(po: Callee): RenderInfo {
        const icon = "kt:arrow-forward";
        const clazz = ["callee", po.type].join('-').toLowerCase();
        return this.addUniqueRI(clazz, icon);
    }

    private addUniqueRI(clazz: string, icon: string): RenderInfo {
        let ri: RenderInfo = new RenderInfo();
        ri.clazz = clazz;
        ri.icon = icon;
        if (!this.renderInfos[ri.key]) {
            this.renderInfos[ri.key] = ri;
        }
        return this.renderInfos[ri.key];
    }


    public applyRenderInfos() {
        this._proofObligations.forEach(
            po => {
                po.renderInfo = this.getOrCreateRenderInfo(po);
            }
        );

        this._assumptions.forEach(
            aa => {
                aa.renderInfo = this.getOrCreateAssumptionRenderInfo(aa);
            }
        );

        this.forEachFunction(cfun => {
            cfun.callsites.forEach(callsite => {
                if (callsite.callee)
                    callsite.callee.renderInfo = this.getOrCreateCalleeRenderInfo(callsite.callee);
            });
        });
    }


    public forEachFunction(callbackfn: (value: CFunction, index: number, array: CFunction[]) => void) {
        for (let file in this.functionByFile) {
            const funcs = this.functionByFile[file];
            funcs.forEach(callbackfn);
        }
    }




    public buildGraph(filter: Filter): NodeDef[] {
        return buildGraph(filter, this);
    }

    public buildCallsGraph(filter: Filter): NodeDef[] {
        return buildCallsGraph(filter, this);
    }

    private reader: XmlReader;
    public readAndParse(tracker: tf.ProgressTracker): Promise<CProject> {
        if (!!this.reader) {
            throw ("cannot read 2 projects at the same time");
        }
        const project: CProject = this;

        this.reader = new CAnalysisJsonReaderImpl();

        tracker.setMessage("reading XML data");


        /**
         * loading old stats
         */
        const previouslySavedData: JsonReadyProject = loadProjectMayBe(this.fs);

        if (previouslySavedData) {
            this.oldstats = previouslySavedData.stats;
            if (this.oldstats) {
                console.log("old stats was saved at " + this.oldstats.date);
            }
        }


        const pCAnalysis: Promise<CAnalysis> = runAsyncPromiseTask("reading", 0,
            () => this.reader.readDir(project, tracker),
            tracker);

        return pCAnalysis.then(mCAnalysis => {

            project.functionByFile = mCAnalysis.functionByFile;

            project.proofObligations = sortPoNodes(mCAnalysis.proofObligations);
            project.assumptions = mCAnalysis.assumptions;
            project.contracts = mCAnalysis.contracts;
            project.applyRenderInfos();

            this.reader = null;
            return project;
        });



    }

    public save(): string {
        const stats = new Stats();
        stats.build(this.proofObligations);
        stats.filteredOutCount = 0;

        const jsonReadyProject: JsonReadyProject = this.toJsonReadyProject();
        jsonReadyProject.stats = stats;
        return CONF.saveProject(jsonReadyProject);
    }

    public toJsonReadyProject(): JsonReadyProject {
        const ret = new JsonReadyProject();
        ret.baseDir = this.fs.baseDir;
        ret.stats = this.stats;
        return ret;
    }

    public getPosAtLine(fileName: string, line: number): Array<ProofObligation> {
        let ret = new Array<ProofObligation>();
        for (let po of this.filteredProofObligations) {
            if (po.location.line == line && po.relativePath == fileName) {
                ret.push(po);
            }
        }
        return ret;
    }


    public hasContractsAtLine(fileName: string, line: number) {
        let fileContract: Contracts.CFileContract = this.contracts.contractsByFile[fileName];
        if (fileContract) {


            let funcs = this.functionByFile[fileName];
            if (funcs) {
                for (let fun of funcs) {
                    if (fun.line === line) {
                        return fileContract.getFunctionContractByName(fun.name);
                    }
                }
            }

        }
    }


    public loadFile(file: CFile): Promise<FileContents> {
        return this.fs.loadFile(file);
    }



    get proofObligations(): Array<ProofObligation> {
        return this._proofObligations;
    }

    set proofObligations(_proofObligations: Array<ProofObligation>) {
        this._proofObligations = _proofObligations;
        this.allPredicates = _.uniq(_.map(this._proofObligations, (e) => e.predicate)).sort();
    }


    get assumptions(): Array<CApiAssumption> {
        return this._assumptions;
    }

    set assumptions(_assumptions: Array<CApiAssumption>) {
        this._assumptions = _assumptions;
    }

    private hasIntersection(inputs: AbstractNode[], base: AbstractNode[]): boolean {
        for (let input of inputs) {
            if (_.contains(base, input)) {
                return true;
            }
        }
        return false;
    }

    public applyFilter(filter: Filter): void {

        this._filteredProofObligations = null;
        this._filteredAssumptions = null;

        this.filterProofObligations(filter);
        this.filterAssumptions(filter);

        this.filterConracts(filter);
        // this.filteredContracts = _.filter(this.contracts.fileContracts, x => x.hasContracts);
    }

    private filterConracts(_filter: Filter) {
        // this.filteredContracts = _.filter(this.contracts.fileContracts, x => x.hasContracts)

        let filter = (x: Contracts.CFileContract) => _filter.acceptCFunctionFile(x.file);
        if (this.contracts) {
            this.filteredContracts = _.filter(this.contracts.fileContracts, filter);
        } else {
            //happens when opening new project
            this.filteredContracts = [];
        }

    }
    private filterProofObligations(_filter: Filter): void {
        let filter = (x) => _filter.accept(x);
        this._filteredProofObligations = sortPoNodes(_.filter(this.proofObligations, filter));
    }

    private filterAssumptions(_filter: Filter): void {

        const filter = (aa) => _filter.acceptCFunction(aa.cfunction) &&
            _filter.acceptPrd(aa.predicate);

        this._filteredAssumptions = _.filter(this.assumptions, filter);

    }


    get filteredProofObligations(): Array<ProofObligation> {
        return this._filteredProofObligations;
    }

    get filteredAssumptions(): Array<CApiAssumption> {
        return this._filteredAssumptions;
    }

    public open(fs: FileSystem): void {
        this.fs = fs;
        this._filteredProofObligations = null;

        CONF.addRecentProject(fs.projectName, fs.baseDir);
        //XXX: reset all data
    }

    public buildStatistics(): Stats {
        this.stats = new Stats();
        this.stats.build(this.filteredProofObligations);
        this.stats.filteredOutCount = this.proofObligations.length - this.filteredProofObligations.length;
        return this.stats;
    }
}

export function onBigArray<X>(array: Array<X>, op: (x: Array<X>) => Array<X>, tracker: tf.ProgressTracker): Array<X> {
    const len = array.length;
    const chunkSize = 1000;
    const numberOfChunks = len / chunkSize;

    let ret: Array<X> = [];
    for (let i = 0; i <= len; i += chunkSize) {
        let part = array.slice(i, i + chunkSize);
        let processed = op(part);
        ret = ret.concat(processed);
        tracker.updateProgress(100.0001 / numberOfChunks);
        tracker.setMessage(i + " of " + len);
    }

    return ret;
}


function selectDirectory(): any {
    let dir = dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return dir;
}


export function openNewProject(tracker: tf.ProgressTracker): any {
    console.log("openNewProject");
    let dir: string = selectDirectory();
    if (dir && dir.length > 0) {
        return { baseDir: dir[0] };
    }
    return null;
}
