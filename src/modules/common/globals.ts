import * as _ from "lodash";
import { CAnalysisJsonReaderImpl } from '../data/dataprovider';
import { XmlReader } from '../data/xmlreader';
import { buildCallsGraph, buildGraph } from '../graph_builder';
import { Stats } from '../stats/stats';
import * as tf from '../tf_graph_common/lib/common';
import { NodeDef } from '../tf_graph_common/lib/proto';
import { Filter } from './filter';
import * as kt_fs from './fstools';
import { CONF, loadProjectMayBe } from './storage';
import { AbstractNode, CAnalysis, CApiAssumption, CFunction, Callee, PoStates, ProofObligation, RenderInfo, sortPoNodes } from './xmltypes';



const path = require('path');
const fs = require('fs');
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
export interface CProjectProto {
    baseDir: string;
}
export interface CProject {
    id: number;
    functionByFile: { [key: string]: Array<CFunction> };
    baseDir: string;
    stats: Stats;
    filteredAssumptions: Array<CApiAssumption>;
    assumptions: Array<CApiAssumption>;
    filteredProofObligations: Array<ProofObligation>;
    proofObligations: Array<ProofObligation>;

    forEachFunction(callbackfn: (value: CFunction, index: number, array: CFunction[]) => void);
    applyRenderInfos();
}

export class ProjectImpl implements CProject {

    functionByFile: { [key: string]: Array<CFunction> } = {};
    baseDir: string;
    appPath: string;
    stats: Stats;

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


    constructor(baseDir: string, appPath: string) {
        if (!baseDir) throw "baseDir is required";
        if (!appPath) throw "appPath is required";

        this.appPath = appPath;
        this.baseDir = path.normalize(baseDir);
        this.open(this.baseDir);
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
        const previouslySavedData: JsonReadyProject = loadProjectMayBe(this.baseDir);
        if (previouslySavedData) {
            this.oldstats = previouslySavedData.stats;
            if (this.oldstats) {
                console.log("old stats was saved at " + this.oldstats.date);
            }
        }

        const pCAnalysis: Promise<CAnalysis> = this.reader.readDir(
            project.baseDir,
            this.appPath,
            tracker
        );


        return pCAnalysis.then(mCAnalysis => {

            project.functionByFile = mCAnalysis.functionByFile;

            project.proofObligations = sortPoNodes(mCAnalysis.proofObligations);
            project.assumptions = mCAnalysis.assumptions;
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
        ret.baseDir = this.baseDir;
        ret.stats = this.stats;
        return ret;
    }

    public getPosAtLine(fileName: string, line: number): Array<ProofObligation> {
        let ret = new Array<ProofObligation>();
        for (let po of this.filteredProofObligations) {
            if (po.location.line == line && po.file == fileName) {
                ret.push(po);
            } 
        }
        return ret;
    } 

    public loadFile(relativePath: string): Promise<kt_fs.FileContents> {
        return kt_fs.loadFile(this.baseDir, relativePath);
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

    public open(baseDir: string): void {
        this.baseDir = baseDir;
        this._filteredProofObligations = null;

        CONF.addRecentProject(path.basename(baseDir), baseDir);
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

    var ret: Array<X> = [];
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

export function openNewProject(tracker: tf.ProgressTracker): CProjectProto {
    console.log("openNewProject");
    let dir: string = selectDirectory();
    if (dir && dir.length > 0) {
        return { baseDir: dir[0] };
    }
    return null;
}
