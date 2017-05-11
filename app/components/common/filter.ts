module kt.Globals {

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

        set states(_states: util.AnySet<model.PoStates>) {
            this._states = _states;
        }

        get states(): util.AnySet<model.PoStates> {
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
            return this.levels.contains((<model.ProofObligation>po).level);
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
}
