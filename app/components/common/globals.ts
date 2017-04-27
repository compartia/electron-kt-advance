
module kt.Globals {
    const path = require('path');
    const fs = require('fs');

    export const CH_DIR: string = "ch_analysis";

    export var TABS = [
        'summary', 'source', 'proof obligations', 'assumptions', 'graphs'
    ];

    export class Filter {

        private _predicates: kt.util.StringSet = new kt.util.StringSet([]);
        private _states: kt.util.AnySet<kt.graph.PoStates>  = new kt.util.AnySet<kt.graph.PoStates> ([]);
        private _dischargeTypes: kt.util.StringSet = new kt.util.StringSet([]);


        private _cfunction: kt.xml.CFunction;
        private _file: kt.treeview.FileInfo;


        get file(): kt.treeview.FileInfo {
            return this._file;
        }

        get predicates(): kt.util.StringSet {
            return this._predicates;
        }

        get singlePredicate(): string {
            if (this._predicates) {
                if (this._predicates.length == 1) {
                    return this._predicates.first;
                }
                else if (this._predicates.length > 1) {
                    return undefined;
                }
            }
            return null;
        }

        get singleState(): kt.graph.PoStates {
            if (this._states) {
                if (this._states.length == 1) {
                    return  this._states.first;
                }
                else if (this._predicates.length > 1) {
                    return undefined;
                }
            }
            return null;
        }

        set predicates(_predicates: kt.util.StringSet) {
            this._predicates = _predicates;
        }

        set dischargeTypes(newDischargeTypes: kt.util.StringSet) {
            this._dischargeTypes = newDischargeTypes;
        }

        get dischargeTypes(): kt.util.StringSet {
            return this._dischargeTypes;
        }

        set states(_states: kt.util.AnySet<kt.graph.PoStates>) {
            this._states = _states;
        }

        get states(): kt.util.AnySet<kt.graph.PoStates> {
            return this._states;
        }

        public reset() {
            this._cfunction = null;
            this._file = null;
            this._states.values = kt.graph.PoStatesArr;
            this._dischargeTypes.values = kt.graph.PoDischargeTypesArr;
        }

        set cfunction(_cfunction: kt.xml.CFunction) {
            this._cfunction = _cfunction;
        }

        get cfunction() {
            return this._cfunction;
        }

        set state(_state: kt.graph.PoStates) {
            this._states.values = [_state];
        }

        get fileName() {
            if (this._file)
                return this._file.relativePath;
            return null;
        }


        set file(file: kt.treeview.FileInfo) {
            if (this._file != file) {
                this._cfunction = null;
            }
            this._file = file;
        }

        private acceptFile(po: kt.graph.AbstractNode): boolean {
            if (!this.fileName) {
                return true;
            } else {
                if (!this._file.dir) {
                    return po.file == this.fileName;
                } else {
                    return po.file.startsWith(this.fileName) || this.fileName == ".";
                }

            }
        }

        private acceptFunction(po: kt.graph.AbstractNode): boolean {
            if (!this.cfunction) {
                return true;
            } else {
                return po.functionName == this.cfunction.name;//XXX: compare file
            }
        }

        private acceptState(po: kt.graph.PONode): boolean {
            if (this.states == null || this._states.contains(po.state )) {
                return true;
            }
            return false;
        }

        private acceptDischargeType(po: kt.graph.PONode): boolean {
            if (!po.dischargeType) {
                return this._dischargeTypes.contains("default");
            } else {
                if (this._dischargeTypes == null || this._dischargeTypes.contains(po.dischargeType.toLowerCase())) {
                    return true;
                }
            }

            return false;
        }


        private acceptPredicate(po: kt.graph.PONode): boolean {
            if (this._predicates == null || this._predicates.contains(po.predicate.toLowerCase())) {
                return true;
            }
            return false;
        }

        public accept(po: kt.graph.PONode): boolean {
            return this.acceptFile(po) && this.acceptFunction(po) && this.acceptPredicate(po) && this.acceptState(po) && this.acceptDischargeType(po);
        }

        public acceptApi(po: kt.graph.ApiNode): boolean {
            return this.acceptFile(po) && this.acceptFunction(po);// && this.acceptPredicate(po) && this.acceptState(po) && this.acceptDischargeType(po);
        }

    }

    export const PO_FILTER: Filter = new Filter();
    export interface FileContents {
        src: string;
    }
    export class Project {
        functionByFile: { [key: string]: Array<kt.xml.CFunction> } = {};
        baseDir: string;
        analysisDir: string;
        stats: kt.stats.Stats;

        _proofObligations: Array<kt.graph.PONode> = [];
        _filteredProofObligations: Array<kt.graph.PONode> = null;
        _filteredAssumptions: Array<kt.graph.ApiNode> = null;

        _apis: { [key: string]: kt.graph.ApiNode } = null;

        allPredicates: Array<string>;

        public loadFile(relativePath: string): Promise<FileContents> {
            let self=this;
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
                } );



            });

        }

        private parseSourceFile(contents: string) {
            let lines = contents.split(/\r\n|\r|\n/g);
            let ret = [];
            for (let line of lines) {
                ret.push({
                    text: line,
                    stats: {
                        violations: 34,
                        open: 34,
                    }
                }

                );
            }
            return ret;
        }

        set apis(_apis) {
            this._apis = _apis;
        }

        get proofObligations(): Array<kt.graph.PONode> {
            return this._proofObligations;
        }

        set proofObligations(_proofObligations: Array<kt.graph.PONode>) {
            this._proofObligations = _proofObligations;
            this.allPredicates = _.uniq(_.map(this._proofObligations, (e) => e.predicate)).sort();
        }


        constructor(baseDir: string) {
            this.baseDir = baseDir;
        }


        public onFilterChanged(filter) {
            this._filteredProofObligations = null;
            this._filteredAssumptions = null;
        }

        private hasIntersection(inputs: kt.graph.AbstractNode[], base: kt.graph.AbstractNode[]): boolean {
            for (let input of inputs) {
                if (_.contains(base, input)) {
                    return true;
                }
            }
            return false;
        }


        get filteredAssumptions(): Array<kt.graph.ApiNode> {
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
                        _filteredAssumptions.push(<kt.graph.ApiNode>input);
                    }

                    for (let output of po.outputs) {
                        _filteredAssumptions.push(<kt.graph.ApiNode>output);
                    }
                }

                _filteredAssumptions = _.uniq(_filteredAssumptions);
                this._filteredAssumptions = _filteredAssumptions;

            }
            return this._filteredAssumptions;
        }

        get filteredProofObligations(): Array<kt.graph.PONode> {
            if (!this._filteredProofObligations) {
                let filter = (x) => PO_FILTER.accept(x);
                this._filteredProofObligations = kt.graph.sortPoNodes(_.filter(this.proofObligations, filter));
            }
            return this._filteredProofObligations;
        }

        public open(baseDir: string, tracker: tf.ProgressTracker): void{
            this.baseDir = baseDir;
            this.analysisDir = path.join(this.baseDir, CH_DIR);
            this._filteredAssumptions = null;
            this._filteredProofObligations = null;
            //XXX: reset all data
        }

        public buildStatistics(): kt.stats.Stats {
            this.stats = new kt.stats.Stats();
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
                const msg = kt.Globals.CH_DIR + " dir not found";
                tracker.reportError(msg, new Error(msg));
            }

        }
        return null;
    }


    // export var project: Project = new Project(null);

}
