import { CFunction, FileInfo } from '../xml/xml_types';
import { ApiNode } from '../model/api_node';
import { ProofObligation, PoStates, AbstractNode } from '../model/po_node';
import { StringSet, AnySet, isEmpty } from './util';



const model = require('../model/po_node');


export class Filter {

    private _predicates: StringSet = new StringSet([]);
    private _states: AnySet<PoStates> = new AnySet<PoStates>([]);
    private _levels: StringSet = new StringSet([]);
    private _dischargeTypes: StringSet = new StringSet([]);


    private _cfunction: CFunction;
    private _file: FileInfo;
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


    get file(): FileInfo {
        return this._file;
    }

    get predicates(): StringSet {
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

    get singleState(): PoStates {
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

    set predicates(_predicates: StringSet) {
        this._predicates = _predicates;
    }

    set dischargeTypes(newDischargeTypes: StringSet) {
        this._dischargeTypes = newDischargeTypes;
    }

    get dischargeTypes(): StringSet {
        return this._dischargeTypes;
    }

    set states(_states: AnySet<PoStates>) {
        this._states = _states;
    }

    get states(): AnySet<PoStates> {
        return this._states;
    }


    set levels(_levels: StringSet) {
        this._levels = _levels;
    }

    get levels(): StringSet {
        return this._levels;
    }



    public reset() {
        this._cfunction = null;
        this._file = null;
        this._states.values = model.PoStatesArr;
        this._dischargeTypes.values = model.PoDischargeTypesArr;
    }

    set cfunction(_cfunction: CFunction) {
        this._line = null;
        if (_cfunction) {
            this.file = _cfunction.fileInfo;
        }
        this._cfunction = _cfunction;
    }

    get cfunction() {
        return this._cfunction;
    }

    set state(_state: PoStates) {
        this._states.values = [_state];
    }

    get fileName() {
        if (this._file)
            return this._file.relativePath;
        return null;
    }


    set file(file: FileInfo) {
        if ((file && this._file) || (!file)) {
            if (file.relativePath != this._file.relativePath) {
                this._cfunction = null;
                this._line = null;
            }
        }
        this._file = file;
    }




    private acceptFile(po: AbstractNode): boolean {
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



    private acceptFunction(po: AbstractNode): boolean {
        if (!this.cfunction) {
            return true;
        } else {
            return po.functionName == this.cfunction.name;//XXX: compare file
        }
    }

    private acceptState(po: ProofObligation): boolean {
        if (isEmpty(this._states)) {
            return true;
        }
        if (this._states.contains(po.state)) {
            return true;
        }
        return false;
    }

    private acceptLevel(po: AbstractNode): boolean {
        if (isEmpty(this.levels)) {
            return true;
        }
        return this.levels.contains((<ProofObligation>po).level);
    }


    private acceptDischargeType(po: ProofObligation): boolean {
        if (isEmpty(this._dischargeTypes)) {
            return true;
        }
        if (!po.dischargeType) {
            return this._dischargeTypes.contains("default");
        } else {
            if (this._dischargeTypes.contains(po.dischargeType.toLowerCase())) {
                return true;
            }
        }
        return false;
    }


    private acceptPredicate(po: ProofObligation): boolean {
        if (isEmpty(this._predicates)) {
            return true;
        }
        if (this._predicates.contains(po.predicate.toLowerCase())) {
            return true;
        }
        return false;
    }

    public accept(po: ProofObligation): boolean {
        return this.acceptState(po) && this.acceptLevel(po) && this.acceptFile(po) && this.acceptFunction(po) && this.acceptPredicate(po) && this.acceptDischargeType(po);
    }

    public acceptApi(po: ApiNode): boolean {
        return this.acceptFile(po) && this.acceptFunction(po);// && this.acceptPredicate(po) && this.acceptState(po) && this.acceptDischargeType(po);
    }

}



/**
@deprecated;
*/
export const PO_FILTER: Filter = new Filter();

