
module kt.Globals {
    const path = require('path');
    const fs = require('fs');

    export const CH_DIR: string = "ch_analysis";

    export var TABS = [
        'summary', 'source', 'proof obligations', 'assumptions', 'graphs'
    ];

    export class Filter {

        private _predicates: Array<string> = new Array<string>();
        private _states: Array<string> = new Array<string>();
        private _dischargeTypes: Array<string> = new Array<string>();


        private _functionName: string;
        private _file: kt.treeview.FileInfo;
        private _state: kt.graph.PoStates = null;

        public isPredicateSelected(p: string) {
            return _.contains(this._predicates, p);
        }

        public isDischargeTypeSelected(p: string) {
            return _.contains(this._dischargeTypes, p);
        }

        public isStateSelected(p: string) {
            return _.contains(this.states, p);
        }

        get predicates(): Array<string> {
            return this._predicates;
        }

        set predicates(_predicates: Array<string>) {
            kt.util.replaceArrayObservably(this._predicates, _predicates);
        }

        set dischargeTypes(_dischargeTypes: Array<string>) {
            kt.util.replaceArrayObservably(this._dischargeTypes, _dischargeTypes);
        }

        get dischargeTypes(): Array<string> {
            return this._dischargeTypes;
        }

        set states(_states: Array<string>) {
            kt.util.replaceArrayObservably(this._states, _states);            
        }

        get states(): Array<string> {
            return this._states;
        }




        set predicate(_predicate) {
            this.predicates = [_predicate];
        }

        public reset() {
            this._functionName = null;
            this._file = null;
            this._state = null;
            this.states = kt.graph.PoStatesArr;
            this.dischargeTypes = kt.graph.PoDischargeTypesArr;
        }

        set functionName(_functionName: string) {
            this._functionName = _functionName;
        }

        get functionName() {
            return this._functionName;
        }

        set state(_state: kt.graph.PoStates) {
            this.states = [kt.graph.PoStates[_state]];
        }

        get state() {
            if (this._states && this._states.length)
                return kt.graph.PoStates[this._states[0]];
            else return null;
        }


        get stateName() {
            return kt.graph.PoStates[this._state];
        }

        get fileName() {
            if (this._file)
                return this._file.relativePath;
            return null;
        }



        get predicate() {
            if (this._predicates.length)
                return this._predicates[0];
            return "";
        }

        set file(file: kt.treeview.FileInfo) {
            if (this._file != file) {
                this._functionName = null;
            }
            this._file = file;
        }

        private acceptFile(po: kt.graph.PONode): boolean {
            if (!this.fileName) {
                return true;
            } else {
                if (!this._file.dir) {
                    return po.file == this.fileName;
                } else {
                    // let relative=path.relative(this.fileName, po.file);
                    return po.file.startsWith(this.fileName);
                }

            }
        }

        private acceptFunction(po: kt.graph.PONode): boolean {
            if (!this.functionName) {
                return true;
            } else {
                return po.functionName == this.functionName;
            }
        }

        private acceptState(po: kt.graph.PONode): boolean {
            if (this.states == null || _.contains(this.states, po.state.toLowerCase())) {
                return true;
            }
            return false;
        }

        private acceptDischargeType(po: kt.graph.PONode): boolean {
            // if(this._dischargeTypes ==null || _.contains(this._dischargeTypes,  po.state.toLowerCase())){
            //     return true;
            // }
            // return false;
            return true;
        }


        private acceptPredicate(po: kt.graph.PONode): boolean {
            if (this._predicates == null || _.contains(this._predicates, po.predicate)) {
                return true;
            }
            return false;
        }

        public accept(po: kt.graph.PONode): boolean {
            return this.acceptFile(po) && this.acceptFunction(po) && this.acceptPredicate(po) && this.acceptState(po) && this.acceptDischargeType(po);
        }

    }

    export const PO_FILTER: Filter = new Filter();

    export class Project {
        functionByFile: { [key: string]: Array<kt.xml.CFunction> } = {};
        baseDir: string;
        analysisDir: string;
        stats: kt.stats.Stats;

        _proofObligations: Array<kt.graph.PONode> = [];
        _filteredProofObligations: Array<kt.graph.PONode> = null;

        allPredicates: Array<string>;


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
        }

        get filteredProofObligations(): Array<kt.graph.PONode> {
            if (!this._filteredProofObligations) {
                let filter = (x) => PO_FILTER.accept(x);
                this._filteredProofObligations = kt.graph.sortPoNodes(_.filter(this.proofObligations, filter));
            }
            return this._filteredProofObligations;
        }

        public open(baseDir: string, tracker: tf.ProgressTracker): Promise<{ [key: string]: Array<kt.xml.CFunction> }> {
            this.baseDir = baseDir;
            this.analysisDir = path.join(this.baseDir, CH_DIR);

            console.info("opening new project:" + baseDir);



            let reader: kt.xml.XmlReader = new kt.xml.XmlReader();
            tracker.setMessage("reading XML data");

            const readFunctionsMapTracker = tf.graph.util.getSubtaskTracker(tracker, 100, 'reading functions map (*._cfile.xml)');

            return reader.readFunctionsMap(this.analysisDir, readFunctionsMapTracker);
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

    export function openNewProject(tracker: tf.ProgressTracker): Promise<{ [key: string]: Array<kt.xml.CFunction> }> {
        let dir = kt.fs.selectDirectory();
        if (dir && dir.length > 0) {

            let projectDir = kt.fs.getChDir(dir[0]);
            if (projectDir) {
                projectDir = path.dirname(projectDir);
                project = new Project(projectDir);

                return project.open(projectDir, tracker);

            } else {
                const msg = kt.Globals.CH_DIR + " dir not found";
                tracker.reportError(msg, new Error(msg));
            }

        }
        return null;
    }


    export var project: Project = new Project(null);

}
