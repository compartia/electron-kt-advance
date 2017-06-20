import * as _ from "lodash"
import { CONF } from './storage';

import *  as xml from '../xml/xml_types';
import { XmlReader, XmlAnalysis } from '../xml/xml_reader';

import { ProofObligation, AbstractNode, sortPoNodes } from '../model/po_node';
import { ApiNode } from '../model/api_node';
import { Stats } from '../stats/stats';
import { Filter, PO_FILTER } from './filter';
import { buildGraph } from '../graph_builder'

import { getChDir, selectDirectory } from "./fs"

import * as tf from '../tf_graph_common/lib/common'
import * as util from '../tf_graph_common/lib/util'
import { NodeDef } from '../tf_graph_common/lib/proto'



const path = require('path');
const fs = require('fs');


export const CH_DIR: string = "ch_analysis";

export var TABS = [
    'summary', 'source', 'proof obligations', 'assumptions', 'graphs', '?'
];


export enum GraphGrouppingOptions { file, predicate };

export class GraphSettings {
    groupBy: GraphGrouppingOptions = GraphGrouppingOptions.file;
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


export interface FileContents {
    src: string;
}

export class JsonReadyProject {
    baseDir: string;
    analysisDir: string;
    stats: Stats;
}

export class Project {
    functionByFile: { [key: string]: Array<xml.CFunction> } = {};
    baseDir: string;
    analysisDir: string;
    stats: Stats;

    _proofObligations: Array<ProofObligation> = [];
    _filteredProofObligations: Array<ProofObligation> = null;
    _filteredAssumptions: Array<ApiNode> = null;

    _apis: { [key: string]: ApiNode } = null;

    allPredicates: Array<string>;

    constructor(baseDir: string) {
        this.baseDir = path.normalize(baseDir);
        this.open(this.baseDir);
    }

    public buildGraph(filter: Filter): NodeDef[] {
        return buildGraph(filter, this);
    }

    public readAndParse(tracker: tf.ProgressTracker): Promise<Project> {
        const project: Project = this;
        let reader: XmlReader = new XmlReader();

        tracker.setMessage("reading XML data");

        const readFunctionsMapTracker = util.getSubtaskTracker(tracker, 10, 'Reading functions map (*._cfile.xml)');
        const readDirTracker = util.getSubtaskTracker(tracker, 90, 'Reading Proof Oblications data');


        return reader.readFunctionsMap(path.dirname(project.analysisDir), readFunctionsMapTracker)
            .then((functions: xml.CFunction[]) => {

                // console.log("readFunctionsMap complete");

                let resultingMap = new xml.FunctionsMap(functions);

                project.functionByFile = reader.buildFunctionsByFileMap(functions);
                let result: Promise<XmlAnalysis> = reader.readDir(project.analysisDir, resultingMap, readDirTracker);
                return result;
            })
            .then((POs: XmlAnalysis) => {
                project.proofObligations = sortPoNodes(POs.ppos.concat(POs.spos));
                project.apis = POs.apis;

                project.save();

                return project;
            });
    }

    public save(): string {

        const stats = new Stats();
        stats.build(this.proofObligations, this.proofObligations);

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

    public loadFile(relativePath: string): Promise<FileContents> {
        let self = this;
        let filename = path.join(this.baseDir, relativePath);
        console.info("reading " + filename);

        return new Promise((resolve, reject) => {

            fs.readFile(filename, 'utf8', (err, data: string) => {
                if (err) {
                    console.log(err);
                    reject(null);
                } else {
                    let fileContents = {
                        lines: self.parseSourceFile(data)
                    }
                    resolve(fileContents);
                }
                // data is the contents of the text file we just read
            });
        });
    }

    private parseSourceFile(contents: string) {
        //XXX: types!!
        let lines = contents.split(/\r\n|\r|\n/g);
        let ret = [];
        let index = 1;
        for (let line of lines) {
            ret.push({
                index: index,
                text: line,
                stats: {
                    violations: 0,
                    open: 0
                }
            });
            index++;
        }
        return ret;
    }

    set apis(_apis) {
        this._apis = _apis;
    }

    get proofObligations(): Array<ProofObligation> {
        return this._proofObligations;
    }

    set proofObligations(_proofObligations: Array<ProofObligation>) {
        this._proofObligations = _proofObligations;
        this.allPredicates = _.uniq(_.map(this._proofObligations, (e) => e.predicate)).sort();
    }


    private hasIntersection(inputs: AbstractNode[], base: AbstractNode[]): boolean {
        for (let input of inputs) {
            if (_.contains(base, input)) {
                return true;
            }
        }
        return false;
    }

    public applyFilter(filter): void {

        this._filteredProofObligations = null;
        this._filteredAssumptions = null;

        this.filterProofObligations(filter);
        this.filterAssumptions();
    }

    private filterProofObligations(_filter: Filter): void {
        let filter = (x) => _filter.accept(x);
        this._filteredProofObligations = sortPoNodes(_.filter(this.proofObligations, filter));
    }

    private filterAssumptions(): void {

        let _filteredAssumptions = [];

        for (let apiKey in this._apis) {
            let api = this._apis[apiKey];
            if (this.hasIntersection(api.inputs, this.filteredProofObligations) ||
                this.hasIntersection(api.outputs, this.filteredProofObligations)) {
                _filteredAssumptions.push(api);
            }
        }

        for (let po of this.filteredProofObligations) {
            for (let input of po.inputs) {
                _filteredAssumptions.push(<ApiNode>input);
            }

            for (let output of po.outputs) {
                _filteredAssumptions.push(<ApiNode>output);
            }
        }


        _filteredAssumptions = _.uniq(_filteredAssumptions);
        this._filteredAssumptions = _filteredAssumptions;

    }


    get filteredAssumptions(): Array<ApiNode> {
        return this._filteredAssumptions;
    }

    get filteredProofObligations(): Array<ProofObligation> {
        return this._filteredProofObligations;
    }

    public open(baseDir: string): void {
        this.baseDir = baseDir;
        this.analysisDir = path.join(this.baseDir, CH_DIR);
        this._filteredAssumptions = null;
        this._filteredProofObligations = null;

        CONF.addRecentProject(path.basename(baseDir), baseDir);
        //XXX: reset all data
    }

    public buildStatistics(): Stats {
        this.stats = new Stats();
        this.stats.build(this.proofObligations, this.filteredProofObligations);
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

export function openNewProject(tracker: tf.ProgressTracker): Project {
    let dir = selectDirectory();
    if (dir && dir.length > 0) {

        let projectDir = getChDir(dir[0]);
        if (projectDir) {
            projectDir = path.dirname(projectDir);
            let project = new Project(projectDir);
            return project;

        } else {
            const msg = CH_DIR + " dir not found";
            tracker.reportError(msg, new Error(msg));
        }

    }
    return null;
}


// }
