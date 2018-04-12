import { CFunction, FileInfo } from 'xml-kt-advance/lib/xml/xml_types';
import { ApiNode } from 'xml-kt-advance/lib/model/api_node';
import { ProofObligation, PoStates, AbstractNode, PoStatesArr, PoDischargeTypesArr } from 'xml-kt-advance/lib/model/po_node';
import { StringSet, AnySet, isEmpty } from './collections';



// const model = require('xml-kt-advance/lib/model/po_node');


export class Filter {

    private _predicates: StringSet = new StringSet([]);
    private _states: AnySet<PoStates> = new AnySet<PoStates>([]);
    private _levels: StringSet = new StringSet([]);
    private _dischargeTypes: StringSet = new StringSet([]);


    private _cfunction: CFunction;
    private _file: FileInfo;
    private _line: number = null;


    /**
     * true if filter acceps every-any-thing;
     */
    public isTransparent(): boolean {
        // line is not counted because file is not selected;
        return isEmpty(this._predicates) &&
            isEmpty(this._states) &&
            isEmpty(this._levels) &&
            isEmpty(this._dischargeTypes)
            && !this._cfunction
            && !this._file;
    }

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
        this._states.values = PoStatesArr;
        this._dischargeTypes.values = PoDischargeTypesArr;
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
        return this.acceptCFunctionFile(po.cfunction);
    }

    public acceptCFunctionFile(func: CFunction): boolean {
        if (!this.fileName) {
            return true;
        } else {
            if (!this._file.dir) {
                return func.file == this.fileName;
            } else {
                return func.file.startsWith(this.fileName) || this.fileName == ".";
            }

        }
    }


    public acceptCFunction(func: CFunction): boolean {
        return (!this.cfunction || func.name == this.cfunction.name) && this.acceptCFunctionFile(func);
    }

    private acceptFunction(po: AbstractNode): boolean {
        return this.acceptCFunction(po.cfunction);
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

