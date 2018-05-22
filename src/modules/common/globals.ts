import * as _ from "lodash"
import * as tools from "./tools"


import * as tf from '../tf_graph_common/lib/common'
import * as util from '../tf_graph_common/lib/util'


import { CONF, loadProjectMayBe } from './storage';
import { XmlReader } from '../data/xmlreader';
import { CAnalysisJsonReaderImpl } from '../data/dataprovider';

import * as kt_fs from './fstools';

import { CAnalysis, ProofObligation, AbstractNode, CFunction, sortPoNodes, CApiAssumption } from './xmltypes';
import { Stats } from '../stats/stats';
import { Filter, PO_FILTER } from './filter';
import { buildGraph, buildCallsGraph } from '../graph_builder'



import { NodeDef } from '../tf_graph_common/lib/proto'


const path = require('path');
const fs = require('fs');
const dialog = require('electron').remote.dialog;



export const CH_DIR: string = "ch_analysis";

export var TABS = [
    'summary', 'source', 'proof obligations', 'assumptions', 'graphs', 'calls', '?'
];


export enum GraphGrouppingOptions { file, predicate };

export class GraphSettings {
    groupBy: GraphGrouppingOptions = GraphGrouppingOptions.file;
    includeCallsites = true;
}

export function groupProofObligationsByFileFunctions(pos: AbstractNode[]): { [key: string]: { [key: string]: AbstractNode[] } } {
    let byfile = _.groupBy(pos, "file");
    let byFileFunc = {};
    for (let filename in byfile) {
        let subgroup = _.groupBy(byfile[filename], "functionName");
        byFileFunc[filename] = subgroup;
    }

    return byFileFunc;
}

export function unzipPoGroup(byFileFuncGroup: { [key: string]: { [key: string]: AbstractNode[] } }) {
    let ret = [];
    for (let filename in byFileFuncGroup) {
        // ret.push({
        //     value: filename,
        //     type: "file",
        //     group: true,
        // });
        for (let funcname in byFileFuncGroup[filename]) {

            ret.push({
                value: funcname,
                parent: filename,
                type: "function",
                group: true,
            });

            for (let po of byFileFuncGroup[filename][funcname]) {
                ret.push({
                    value: po,
                    type: "po"
                });
            }
        }
    }
    return ret;

}


export class JsonReadyProject {
    baseDir: string;
    analysisDir: string;
    stats: Stats;
}

export interface CProject {
    id: number;
    functionByFile: { [key: string]: Array<CFunction> };
    baseDir: string;
    analysisDir: string;
    stats: Stats;
    // calls: Array<FunctionCalls>;
    filteredAssumptions: Array<CApiAssumption>;
    assumptions: Array<CApiAssumption>;
    filteredProofObligations: Array<ProofObligation>;
    proofObligations: Array<ProofObligation>;

    forEachFunction(callbackfn: (value: CFunction, index: number, array: CFunction[]) => void);
}

export class ProjectImpl implements CProject {

    functionByFile: { [key: string]: Array<CFunction> } = {};
    baseDir: string;
    appPath: string;
    analysisDir: string;
    stats: Stats;
    // calls: Array<FunctionCalls>;
    /**
     * previously saved statistics
     */
    oldstats: Stats;
    id: number = Math.random();
    _proofObligations: Array<ProofObligation> = [];
    _filteredProofObligations: Array<ProofObligation> = null;
    _filteredAssumptions: Array<CApiAssumption> = null;

    _assumptions: Array<CApiAssumption> = [];

    // _apis: { [key: string]: ApiNode } = null;


    allPredicates: Array<string>;


    public forEachFunction(callbackfn: (value: CFunction, index: number, array: CFunction[]) => void) {
        for (let file in this.functionByFile) {
            const funcs = this.functionByFile[file];
            funcs.forEach(callbackfn);
        }
    }



    constructor(baseDir: string, appPath: string) {
        // this.id=Math.random();
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

    public readAndParse(tracker: tf.ProgressTracker): Promise<CProject> {

        const project: CProject = this;

        let reader: XmlReader = new CAnalysisJsonReaderImpl();

        tracker.setMessage("reading XML data");

        const readFunctionsMapTracker = tracker.getSubtaskTracker(10, 'Reading functions map (*._cfile.xml)');
        const readDirTracker = tracker.getSubtaskTracker(90, 'Reading Proof Obligations data');

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

        const pCAnalysis: Promise<CAnalysis> = reader.readDir(
            path.dirname(project.analysisDir),
            this.appPath,
            readFunctionsMapTracker
        );


        return pCAnalysis.then(mCAnalysis => {
            project.functionByFile = mCAnalysis.functionByFile;

            project.proofObligations = sortPoNodes(mCAnalysis.proofObligations);
            project.assumptions = mCAnalysis.assumptions;
            return project;
        });



        // return Promise.resolve(project);

        // new Promise((resolve, reject) => {
        //     resolve(project);
        // });

        // return reader.readFunctionsMap(path.dirname(project.analysisDir), readFunctionsMapTracker)
        //     .then((functions: CFunction[]) => {
        //         let resultingMap = new xml.FunctionsMap(functions);
        //         project.functionByFile = resultingMap.functionByFile;
        //         let result: Promise<XmlAnalysis> = reader.readDir(project.analysisDir, resultingMap, readDirTracker);

        //         return result;
        //     })
        //     .then((POs: XmlAnalysis) => {
        //         project.proofObligations = sortPoNodes(POs.ppos.concat(POs.spos));

        //         project.apis = POs.apis;
        //         project.calls = POs.calls;
        //         project.save();

        //         return project;
        //     });
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
        ret.analysisDir = this.analysisDir;
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


    // get filteredAssumptions(): Array<ApiNode> {
    //     return this._filteredAssumptions;
    // }

    get filteredProofObligations(): Array<ProofObligation> {
        return this._filteredProofObligations;
    }

    get filteredAssumptions(): Array<CApiAssumption> {
        return this._filteredAssumptions;
    }

    public open(baseDir: string): void {
        this.baseDir = baseDir;
        this.analysisDir = path.join(this.baseDir, CH_DIR);
        // this._filteredAssumptions = null;
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

export function openNewProject(tracker: tf.ProgressTracker): CProject {
    let dir: string = selectDirectory();
    if (dir && dir.length > 0) {
        let project = new ProjectImpl(dir[0]);
        return project;

        // let projectDir = getChDir(dir[0]);
        // if (projectDir) {
        //     projectDir = path.dirname(projectDir);
        //     let project = new Project(projectDir);
        //     return project;

        // } else {
        //     const msg = CH_DIR + " dir not found";
        //     tracker.reportError(msg, new Error(msg));
        // }

    }
    return null;
}
