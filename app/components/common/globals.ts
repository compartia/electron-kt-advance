module kt.Globals {

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

    export function groupProofObligationsByFileFunctions(pos: model.AbstractNode[]): { [key: string]: { [key: string]: model.AbstractNode[] } } {
        let byfile = _.groupBy(pos, "file");
        let byFileFunc = {};
        for (let filename in byfile) {
            let subgroup = _.groupBy(byfile[filename], "functionName");
            byFileFunc[filename] = subgroup;
        }

        return byFileFunc;
    }

    export function unzipPoGroup(byFileFuncGroup: { [key: string]: { [key: string]: model.AbstractNode[] } }) {
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

    export class Project {
        functionByFile: { [key: string]: Array<xml.CFunction> } = {};
        baseDir: string;
        analysisDir: string;
        stats: stats.Stats;

        _proofObligations: Array<model.ProofObligation> = [];
        _filteredProofObligations: Array<model.ProofObligation> = null;
        _filteredAssumptions: Array<model.ApiNode> = null;

        _apis: { [key: string]: model.ApiNode } = null;

        allPredicates: Array<string>;

        constructor(baseDir: string) {
            this.baseDir = baseDir;
        }

        public getPosAtLine(fileName: string, line: number): Array<model.ProofObligation> {
            let ret = new Array<model.ProofObligation>();
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
            for (let line of lines) {
                ret.push({
                    text: line,
                    stats: {
                        violations: 0,
                        open: 0,
                    }
                });
            }
            return ret;
        }

        set apis(_apis) {
            this._apis = _apis;
        }

        get proofObligations(): Array<model.ProofObligation> {
            return this._proofObligations;
        }

        set proofObligations(_proofObligations: Array<model.ProofObligation>) {
            this._proofObligations = _proofObligations;
            this.allPredicates = _.uniq(_.map(this._proofObligations, (e) => e.predicate)).sort();
        }


        public onFilterChanged(filter) {
            this._filteredProofObligations = null;
            this._filteredAssumptions = null;
        }

        private hasIntersection(inputs: model.AbstractNode[], base: model.AbstractNode[]): boolean {
            for (let input of inputs) {
                if (_.contains(base, input)) {
                    return true;
                }
            }
            return false;
        }


        get filteredAssumptions(): Array<model.ApiNode> {
            if (!this._filteredAssumptions) {
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
                        _filteredAssumptions.push(<model.ApiNode>input);
                    }

                    for (let output of po.outputs) {
                        _filteredAssumptions.push(<model.ApiNode>output);
                    }
                }

                _filteredAssumptions = _.uniq(_filteredAssumptions);
                this._filteredAssumptions = _filteredAssumptions;

            }
            return this._filteredAssumptions;
        }

        get filteredProofObligations(): Array<model.ProofObligation> {
            if (!this._filteredProofObligations) {
                let filter = (x) => kt.Globals.PO_FILTER.accept(x);
                this._filteredProofObligations = model.sortPoNodes(_.filter(this.proofObligations, filter));
            }
            return this._filteredProofObligations;
        }

        public open(baseDir: string, tracker: tf.ProgressTracker): void {
            this.baseDir = baseDir;
            this.analysisDir = path.join(this.baseDir, CH_DIR);
            this._filteredAssumptions = null;
            this._filteredProofObligations = null;
            //XXX: reset all data
        }

        public buildStatistics(): stats.Stats {
            this.stats = new stats.Stats();
            this.stats.build(this);
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
        let dir = kt.fs.selectDirectory();
        if (dir && dir.length > 0) {

            let projectDir = kt.fs.getChDir(dir[0]);
            if (projectDir) {
                projectDir = path.dirname(projectDir);
                let project = new Project(projectDir);
                project.open(projectDir, tracker);
                return project;

            } else {
                const msg = Globals.CH_DIR + " dir not found";
                tracker.reportError(msg, new Error(msg));
            }

        }
        return null;
    }


}
