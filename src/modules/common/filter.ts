import { AnySet, StringSet, isEmpty } from './collections';
import { CFunctionBase, HasPath, PoDischargeTypesArr, PoStates, PoStatesArr, ProofObligation, CFile } from './xmltypes';


export function sharedStart(array: string[]): string {
    if (!array || !array.length) {
        return '';
    }
    const A = array.concat().sort();
    let a1 = A[0];
    let a2 = A[A.length - 1];
    let L = a1.length;
    let i = 0;
    while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
    return a1.substring(0, i);
}

export class Filter {

    private _predicates: StringSet = new StringSet([]);
    private _states: AnySet<PoStates> = new AnySet<PoStates>([]);
    private _levels: StringSet = new StringSet([]);
    private _dischargeTypes: StringSet = new StringSet([]);


    private _cfunction: CFunctionBase;
    private _file: HasPath;
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


    get file(): HasPath {
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

    set cfunction(_cfunction: CFunctionBase) {
        this._line = null;
        if (_cfunction) {
            this.file = _cfunction;
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

 
    set file(file: HasPath) {
        if ((file && this._file) || (!file)) {
            if (file.relativePath != this._file.relativePath) {
                this._cfunction = null;
                this._line = null;
            }
        }
        this._file = file;
    }




    private acceptFile(po: ProofObligation): boolean {
        return this.acceptCFunctionFile(po.cfunction);
    }

    public acceptCFunctionFile(func: HasPath): boolean {
        if (!this.fileName) {
            return true;
        } else {

            if (!this._file.dir) {
                return func.relativePath == this.fileName;
            } else {
                return func.relativePath.startsWith(this.fileName) || this.fileName == ".";
            }

        }
    }

     


    public acceptCFunction(func: CFunctionBase): boolean {
        return (!this.cfunction || func.name == this.cfunction.name) && this.acceptCFunctionFile(func);
    }

    private acceptFunction(po: ProofObligation): boolean {
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

    private acceptLevel(po: ProofObligation): boolean {
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

    public acceptPrd(predicate: string): boolean {
        if (isEmpty(this._predicates)) {
            return true;
        }
        if (this._predicates.contains(predicate)) {
            return true;
        }
        return false;
    }

    private acceptPredicate(po: ProofObligation): boolean {
        if (isEmpty(this._predicates)) {
            return true;
        }
        if (this._predicates.contains(po.predicate)) {
            return true;
        }
        return false;
    }

    public accept(po: ProofObligation): boolean {
        if (!po) return false;
        return this.acceptIgnoreLocation(po) && this.acceptFile(po) && this.acceptFunction(po);
    }

    public acceptIgnoreLocation(po: ProofObligation): boolean {
        if (!po) return false;
        return this.acceptState(po) && this.acceptLevel(po) && this.acceptPredicate(po) && this.acceptDischargeType(po);
    }



}



/**
@deprecated;
*/
export const PO_FILTER: Filter = new Filter();

