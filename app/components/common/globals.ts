module kt.Globals {

    const path = require('path');
    const fs = require('fs');

    export const CH_DIR: string = "ch_analysis";

    export var TABS = [
        'summary', 'source', 'proof obligations', 'assumptions', 'graphs'
    ];

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

    export class Filter {

        private _predicates: util.StringSet = new util.StringSet([]);
        private _states: util.AnySet<model.PoStates> = new util.AnySet<model.PoStates>([]);
        private _levels: util.StringSet = new util.StringSet([]);
        private _dischargeTypes: util.StringSet = new util.StringSet([]);


        private _cfunction: xml.CFunction;
        private _file: treeview.FileInfo;
        private _line: number = null;

        set line(line: number) {
            this._line = line;
        }

        get line(): number {
            if (this._line != null && this._line >= 0) {
                return this._line;
            } else {
                if (this.cfunction) {
                    return this.cfunction.line;
                }
            }
            return 0;
        }


        get file(): treeview.FileInfo {
            return this._file;
        }

        get predicates(): util.StringSet {
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

        get singleState(): model.PoStates {
            if (this._states) {
                if (this._states.length == 1) {
                    return this._states.first;
                }
                else if (this._predicates.length > 1) {
                    return undefined;
                }
            }
            return null;
        }

        set predicates(_predicates: util.StringSet) {
            this._predicates = _predicates;
        }

        set dischargeTypes(newDischargeTypes: util.StringSet) {
            this._dischargeTypes = newDischargeTypes;
        }

        get dischargeTypes(): util.StringSet {
            return this._dischargeTypes;
        }

        set states(_states: util.AnySet<kt.model.PoStates>) {
            this._states = _states;
        }

        get states(): util.AnySet<kt.model.PoStates> {
            return this._states;
        }


        set levels(_levels: util.StringSet) {
            this._levels = _levels;
        }

        get levels(): util.StringSet {
            return this._levels;
        }



        public reset() {
            this._cfunction = null;
            this._file = null;
            this._states.values = model.PoStatesArr;
            this._dischargeTypes.values = model.PoDischargeTypesArr;
        }

        set cfunction(_cfunction: xml.CFunction) {
            this._line = null;
            if (_cfunction) {
                this.file = _cfunction.fileInfo;
            }
            this._cfunction = _cfunction;
        }

        get cfunction() {
            return this._cfunction;
        }

        set state(_state: model.PoStates) {
            this._states.values = [_state];
        }

        get fileName() {
            if (this._file)
                return this._file.relativePath;
            return null;
        }


        set file(file: treeview.FileInfo) {
            if ((file && this._file) || (!file)) {
                if (file.relativePath != this._file.relativePath) {
                    this._cfunction = null;
                    this._line = null;
                }
            }
            this._file = file;
        }




        private acceptFile(po: model.AbstractNode): boolean {
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



        private acceptFunction(po: model.AbstractNode): boolean {
            if (!this.cfunction) {
                return true;
            } else {
                return po.functionName == this.cfunction.name;//XXX: compare file
            }
        }

        private acceptState(po: model.ProofObligation): boolean {
            if (this.states == null || this._states.contains(po.state)) {
                return true;
            }
            return false;
        }

        private acceptLevel(po: model.AbstractNode): boolean {
            return this.levels.contains((<kt.model.ProofObligation>po).level);
        }

        private acceptDischargeType(po: model.ProofObligation): boolean {
            if (!po.dischargeType) {
                return this._dischargeTypes.contains("default");
            } else {
                if (this._dischargeTypes == null || this._dischargeTypes.contains(po.dischargeType.toLowerCase())) {
                    return true;
                }
            }

            return false;
        }


        private acceptPredicate(po: model.ProofObligation): boolean {
            if (this._predicates == null || this._predicates.contains(po.predicate.toLowerCase())) {
                return true;
            }
            return false;
        }

        public accept(po: model.ProofObligation): boolean {
            return this.acceptState(po) && this.acceptLevel(po) && this.acceptFile(po) && this.acceptFunction(po) && this.acceptPredicate(po) && this.acceptDischargeType(po);
        }

        public acceptApi(po: model.ApiNode): boolean {
            return this.acceptFile(po) && this.acceptFunction(po);// && this.acceptPredicate(po) && this.acceptState(po) && this.acceptDischargeType(po);
        }

    }

    /**
    @deprecated;
    */
    export const PO_FILTER: Filter = new Filter();
    export interface FileContents {
        src: string;
    }
    export class Project {
        functionByFile: { [key: string]: Array<kt.xml.CFunction> } = {};
        baseDir: string;
        analysisDir: string;
        stats: stats.Stats;

        _proofObligations: Array<kt.model.ProofObligation> = [];
        _filteredProofObligations: Array<kt.model.ProofObligation> = null;
        _filteredAssumptions: Array<kt.model.ApiNode> = null;

        _apis: { [key: string]: model.ApiNode } = null;

        allPredicates: Array<string>;

        constructor(baseDir: string) {
            this.baseDir = baseDir;
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

        get proofObligations(): Array<kt.model.ProofObligation> {
            return this._proofObligations;
        }

        set proofObligations(_proofObligations: Array<kt.model.ProofObligation>) {
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


        get filteredAssumptions(): Array<kt.model.ApiNode> {
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
                        _filteredAssumptions.push(<kt.model.ApiNode>input);
                    }

                    for (let output of po.outputs) {
                        _filteredAssumptions.push(<kt.model.ApiNode>output);
                    }
                }

                _filteredAssumptions = _.uniq(_filteredAssumptions);
                this._filteredAssumptions = _filteredAssumptions;

            }
            return this._filteredAssumptions;
        }

        get filteredProofObligations(): Array<kt.model.ProofObligation> {
            if (!this._filteredProofObligations) {
                let filter = (x) => PO_FILTER.accept(x);
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


    // export var project: Project = new Project(null);

}
