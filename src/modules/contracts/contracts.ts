import { CFile, CFunction } from "../common/xmltypes";



export module contracts {

    export const ZEROARY_RELATIONS = ['preserves-all-memory', 'false'];
    export const UNARY_RELATIONS = [
        'initialized',
        'tainted',
        'allocation-base',
        'new-memory',
        'not-zero',
        'not-null',
        'non-negative'];

    export const BINARY_RELATIONS = ['eq', 'neq', 'gt', 'lt', 'geq', 'leq', 'buffer', 'initialized-range'];

    export const RELATIONS = [].concat(UNARY_RELATIONS).concat(BINARY_RELATIONS).concat(ZEROARY_RELATIONS);
    export const RELATIONS_NAMES = {
        'eq': "==",
        'neq': "!=",
        'gt': ">",
        'lt': "<",
        'geq': ">=",
        'leq': "<=",
        'buffer': 'Is buffer',
        'initializes-range': 'Initializes range',
        'preserves-all-memory': 'Preserves all memory',
        'false': 'False'
    }

    export const ARGUMENT_TYPES_NAMES = {
        'return': 'Return value',
        'ci': 'API reference',
        'cn': 'Constant',
        'field': 'Field',
        'apply': 'Addressed value',
        'func': 'Function'
    };

    export const ARGUMENT_TYPES = Object.keys(ARGUMENT_TYPES_NAMES);

    export interface Apply {
    }

    export class Math {
        apply?: XPredicate;

        public static makeDefault(): Math {
            const ret = new Math({ "not-null": true, "return": true });
            return ret;
        }

        constructor(apply?: Apply) {
            if (apply) {
                // console.log("app: " + apply)
                this.apply = parse_mathml_xpredicate(apply);
                if (!this.apply) {
                    console.error(this.apply)
                    throw "illegal argument " + apply;
                }
                // console.log(this.apply)
            } else {
                console.error(apply)
                throw "illegal argument";
            }
        }

        get displayString(): string {
            return this.apply ? this.apply.displayString : "UNKNOWN";
        }
    }

    export class CFunctionContract {
        ignore?: boolean;
        name: string;
        src: string;

        parameters: string[];
        postconditions: contracts.Math[] = [];
        preconditions: contracts.Math[] = [];

        _cfunction?: CFunction;

        static makeByCFunction(f: CFunction): CFunctionContract {
            let fc = new CFunctionContract();
            fc.cfunction = f;
            //XXX: mind parameters!!
            return fc;
        }

        get cfunction() {
            return this._cfunction;
        }

        set cfunction(f) {
            this._cfunction = f;
            this.name = f.name;
        }

        get preconditionsCount() {
            return this.preconditions.length;
        }

        get postconditionsCount() {
            return this.postconditions.length;
        }

        get hasContracts(): boolean {
            return (this.postconditions && this.postconditions.length > 0) || (this.preconditions && this.preconditions.length > 0);
        }

        get preconditionsString(): string {
            if (this.preconditions) {
                let ret = "preconditions:";
                for (let pc of this.preconditions) {
                    ret += (pc as XApiPredicate).displayString + "\n";
                }
                return ret;
            }
        }

        get postconditionsString(): string {

            if (this.postconditions) {
                let ret = "postconditions:";

                for (let pc of this.postconditions) {
                    ret += (pc as XApiPredicate).displayString + "\n";
                }
                return ret;
            }

        }

    }

    export interface GVar {
        name: string;
        const?: string;
        lib?: number;
        static?: string;
        value?: number;
        ub?: number;
        lb?: number;
    }


    export interface CFileContract {
        functions: CFunctionContract[];

        name: string;

        dataStructures: any[];
        globalVariables: GVar[];


        getFunctionContractByName(name: string): CFunctionContract | undefined;

        hasContracts: boolean;

        save(xmlPath?: string);

        file: CFile;

        addFunctionContract(cfun: CFunctionContract);
    }



    /////////////////


    export function makeContractByCFile(cfile: CFile): CFileContractImpl {
        const _c = new CFileContractImpl();
        _c.file = cfile;
        return _c;
    }

    export class CFileContractImpl implements CFileContract {
        functions: CFunctionContract[] = [];
        name: string;
        dataStructures: any[];
        globalVariables: GVar[];

        _file: CFile;
        _functionsByName = {};



        get file(): CFile {
            return this._file;
        }

        set file(cfile: CFile) {
            this._file = cfile;
            this.name = this.removeExtension(cfile.relativePath);
        }

        private removeExtension(x: string) {

            if (x.endsWith('.c'))
                return x.substring(0, x.length - 2);
            return x;
        }



        public addFunctionContract(cfun: CFunctionContract) {
            if (this._functionsByName[cfun.name]) {
                throw "Function Contract already exists";
            }
            this._functionsByName[cfun.name] = cfun;
            this.functions.push(cfun);
        }

        get preconditionsCount() {
            let cnt = 0;
            for (let func of this.functions) {
                cnt += func.preconditionsCount;
            }
            return cnt;
        }

        get postconditionsCount() {
            let cnt = 0;
            for (let func of this.functions) {
                cnt += func.postconditionsCount;
            }
            return cnt;
        }

        get globalVariablesNames(): string[] {
            return this.globalVariables.map(x => x.name);
        }

        public getFunctionContractByName(name: string): CFunctionContract | undefined {
            return this._functionsByName[name];
        }


        public save(xmlPath?: string) {
            throw "not implemented";
        }

        public addFuctionContract(fc: CFunctionContract) {
            if (this.functions && this.functions.indexOf(fc) >= 0) {
                throw "Function contract is already there";
            }
            this.functions.push(fc);
        }

        get hasContracts(): boolean {
            for (const fun of this.functions) {
                if (fun.hasContracts) return true;
            }
            return false;
        }



    }

    // *************************
    export class ContractsCollection {
        contractsByFile: { [key: string]: CFileContract } = {};
        public fileContracts: CFileContract[] = [];

        constructor() {
        }

        public addContract(c: CFileContract) {
            this.contractsByFile[c.file.relativePath] = c;
            this.fileContracts.push(c);
        }
    }

    // *****************************



    export interface XPredicate {
        displayString: string;
        kind: string;
        toXmlObj(): string;

        error: string;
    }

    abstract class XPredicateBase implements XPredicate {

        get error(): string {
            return null;
        }

        get displayString(): string {
            throw "not implemented";
        }

        get kind(): string {
            throw "not implemented";
        }

        toXmlObj(): string {
            throw "not implemented";
        }
    }

    export class XReturnPredicate extends XPredicateBase implements XPredicate {
        get displayString(): string {
            return "return_value";
        }

        get kind(): string {
            return "return";
        }

        public toXmlObj(): any {
            return {};
        }
    }

    export class XDummiePredicate extends XPredicateBase implements XPredicate {
        get displayString(): string {
            return "";
        }

        get kind(): string {
            return "func";
        }

        public toXmlObj(): any {
            return {};
        }
    }

    export class XZeroaryPredicate extends XPredicateBase implements XPredicate {
        public static XDummiePredicateInstance = new XDummiePredicate();
        argument1 = XZeroaryPredicate.XDummiePredicateInstance;
        private _kind: string;

        constructor(kind) {
            super();
            this._kind = kind;
        }

        get displayString(): string {
            return this.kind;
        }

        get kind(): string {
            return this._kind;
        }

        public toXmlObj(): any {
            const ret = {};
            ret[this._kind] = null;
            return ret;
        }

        get displayName(): string {
            return RELATIONS_NAMES[this.kind] ? RELATIONS_NAMES[this.kind] : this.kind;
        }


    }

    export class XApiPredicate extends XPredicateBase implements XPredicate {
        private _ref: string;

        public toXmlObj(): any {
            return this.ref;
        }

        get ref(): string {
            return this._ref;
        }

        set ref(ref: string) {
            this._ref = ref;
        }


        get error(): string {
            if (!this.ref) {
                return "API reference is mandatory";
            }
            return null;
        }

        constructor(ref: string) {
            super();
            this.ref = ref;
        }

        get displayString(): string {
            return this.ref;
        }

        get kind(): string {
            return "ci";
        }

        get isApiRef(): boolean {
            return true;
        }
    }






    export class XUnaryExpr extends XPredicateBase implements XPredicate {

        op: string;
        private _argument1: XPredicate;

        constructor(op: string, argument1: XPredicate) {
            super();
            this.op = op;
            this.argument1 = argument1;
        }


        public toXmlObj(): any {
            const ret = {};
            ret[this.op] = null;
            ret[this.argument1.kind] = this.argument1.toXmlObj();
            return ret;
        }


        set argument1(a1: XPredicate) {
            this._argument1 = a1;
        }

        get argument1() {
            return this._argument1;
        }


        get error(): string {
            if (!this._argument1) {
                return "First term is mandatory";

            } else if (this._argument1.error) {
                return this._argument1.error;
            }

            return null;
        }


        get displayString(): string {
            return `${this.op}(${this.argument1.displayString})`;
        }

        get kind(): string {
            return this.op;
        }

        get displayName(): string {
            return RELATIONS_NAMES[this.op] ? RELATIONS_NAMES[this.op] : this.op;
        }
    }


    export class XRelationalExpr extends XUnaryExpr {

        private _argument2: XPredicate;

        constructor(op: string, argument1: XPredicate, argument2: XPredicate) {
            super(op, argument1)
            this.op = op;
            this.argument1 = argument1;
            this.argument2 = argument2;
        }

        set argument2(a2: XPredicate) {
            this._argument2 = a2;
        }

        get argument2() {
            return this._argument2;
        }

        get error(): string {
            if (!super.error) {
                if (!this.argument2) {
                    return "Second term is mandatory";
                } else if (this.argument2.error) {
                    return this.argument2.error;
                }

                if (this.argument2.constructor == this.argument1.constructor) {
                    return "Second term must be of a different kind";
                }
            }

            return null;
        }

        get displayString(): string {
            return `(${this.argument1.displayString} ${RELATIONS_NAMES[this.op]} ${this.argument2.displayString})`;
        }

        get binary() {
            return true;
        }

        public toXmlObj(): any {
            const ret = {};
            ret[this.op] = null;
            ret[this.argument1.kind] = this.argument1.toXmlObj();
            ret[this.argument2.kind] = this.argument2.toXmlObj();
            return ret;
        }

    }

    export class XArgAddressedValue extends XRelationalExpr {

        constructor(op: string, a: XPredicate, b: XPredicate) {
            super(op, a, b)
        }

        get displayString(): string {
            return `(${this.argument1.displayString} --> ${this.argument2.displayString})`;
        }

        get addressed(): boolean {
            return true;
        }

        get kind(): string {
            return "apply";
        }
    }


    export class XFieldExpr extends XPredicateBase implements XPredicate {
        field: string;

        constructor(value: any) {
            super();
            this.field = value.fname;
        }

        get displayString(): string {
            return `${this.field}`;
        }

        get kind(): string {
            return "field";
        }

        get isField(): boolean {
            return true;
        }

        public toXmlObj(): any {
            return { $: { fname: this.field } };
        }

    }

    export class XConstantExpr extends XPredicateBase implements XPredicate {
        value: string;

        constructor(value: string) {
            super();
            this.value = value;
        }

        get displayString(): string {
            return `'${this.value}'`;
        }

        get kind(): string {
            return "cn";
        }

        get isConst(): boolean {
            return true
        }

        public toXmlObj(): any {
            return this.value;
        }

    }



    function isBinaryConstraint(op: string): boolean {
        return BINARY_RELATIONS.indexOf(op) >= 0;
    }

    function isUnaryConstraint(op: string): boolean {
        return UNARY_RELATIONS.indexOf(op) >= 0;
    }

    function isZeroaryConstraint(op: string): boolean {
        return ZEROARY_RELATIONS.indexOf(op) >= 0;
    }



    export function parse_term(term: string, value: any): XPredicate {
        switch (term) {
            case 'ci':
                return new XApiPredicate(value);
            case 'cn':
                return new XConstantExpr(value);
            case 'field':
                return new XFieldExpr(value);
            case 'return':
                return new XReturnPredicate();
            case 'func':
                return new XDummiePredicate();
            case 'apply':
                return parse_mathml_xpredicate(value);
            default:
                console.error("unknwn term " + term);
                throw "unknwn term " + term;

        }
    }

    export function changeArgumentType(term: string): XPredicate {
        switch (term) {
            case 'ci':
                return new XApiPredicate('');
            case 'cn':
                return new XConstantExpr('0');
            case 'field':
                return new XFieldExpr({ fname: null });
            case 'return':
                return new XReturnPredicate();
            case 'apply':
                return new XArgAddressedValue('addressed-value', new XReturnPredicate(), new XConstantExpr('0'));
            case 'func': {
                return new XDummiePredicate();
            }
            default:
                throw "unknwn term " + term;

        }
    }

    export function changeRelationType(old: XPredicate, op: string): XPredicate {
        if (op === old.kind) {
            return old;
        }
        else {

            let term1: XPredicate = (old as XRelationalExpr).argument1;

            if (!term1) {
                term1 = new XReturnPredicate();
            }

            if (op == "addressed-value") {
                let term2: XPredicate = (old as XRelationalExpr).argument2;
                if (!term2) {
                    term2 = new XConstantExpr('0');
                }
                return new XArgAddressedValue(op, term1, term2);
            } else if (isBinaryConstraint(op)) {
                let term2: XPredicate = (old as XRelationalExpr).argument2;
                if (!term2) {
                    term2 = new XConstantExpr('0');
                }
                return new XRelationalExpr(op, term1, term2);
            } else if (isUnaryConstraint(op)) {
                return new XUnaryExpr(op, term1);
            } else if (isZeroaryConstraint(op)) {
                return new XZeroaryPredicate(op);
            } else throw "unknown constraint " + op;


        }
    }

    export function parse_mathml_xpredicate(anode: Apply): XPredicate {
        if (!anode) {
            throw "wring parameter";
        }
        const pairs = Object.keys(anode);
        const op = pairs[0];

        if (op == "addressed-value") {
            const term1 = pairs[1];
            const term2 = pairs[2];

            if (!term2) {
                console.error(`error parsing ${op}, no second term found`);
            }

            const prd1: XPredicate = term1 ? parse_term(term1, anode[term1]) : new XReturnPredicate();
            const prd2: XPredicate = term2 ? parse_term(term2, anode[term2]) : new XReturnPredicate();

            return new XArgAddressedValue(op, prd1, prd2);
        } else if (isBinaryConstraint(op)) {

            const term1 = pairs[1];
            const term2 = pairs[2];

            if (!term2) {
                console.error(`error parsing ${op}, no second term found`);
            }

            const prd1: XPredicate = term1 ? parse_term(term1, anode[term1]) : new XReturnPredicate();
            const prd2: XPredicate = term2 ? parse_term(term2, anode[term2]) : new XReturnPredicate();

            return new XRelationalExpr(op, prd1, prd2);

        }
        else if (isZeroaryConstraint(op)) {
            return new XZeroaryPredicate(op);
        }
        else if (isUnaryConstraint(op)) {

            const term1 = pairs[1];
            // console.error(`UNARY: ${op} ${term1} `);
            return new XUnaryExpr(op, parse_term(term1, anode[term1]));
        } else throw "unknown constraint " + op;

    }




}


