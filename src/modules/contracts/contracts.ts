import { ENGINE_METHOD_DIGESTS } from "constants";
import { CFile } from "../common/xmltypes";




export module contracts {

    export const UNARY_RELATIONS = ['false', 'initialized', 'preserves-all-memory', 'tainted', 'not-zero', 'not-null', 'non-negative'];
    export const BINARY_RELATIONS = ['eq', 'neq', 'gt', 'lt', 'geq', 'leq'];

    export const RELATIONS = [].concat(UNARY_RELATIONS).concat(BINARY_RELATIONS);
    export const RELATIONS_NAMES = {
        'eq': "==", 'neq': "!=", 'gt': ">", 'lt': "<", 'geq': ">=", 'leq': "<="
    }


    export const ARGUMENT_TYPES = ['ci', 'cn', 'field', 'return', 'apply'];
    export const ARGUMENT_TYPES_NAMES = {
        'ci': 'API reference',
        'cn': 'Constant',
        'field': 'Field',
        'return': 'Return value',
        'apply': 'Addressed value'
    };



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
    }



    /////////////////


    export class CFileContractImpl implements CFileContract {
        functions: CFunctionContract[] = [];
        name: string;
        dataStructures: any[];
        globalVariables: GVar[];

        file: CFile;

        _functionsByName = {};

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

        getFunctionContractByName(name: string): CFunctionContract | undefined {
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
        public baseDir: string;
        constructor(baseDir: string) {
            this.baseDir = baseDir;
        }

        public addContract(c: CFileContract) {
            this.contractsByFile[c.name] = c;
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



            // def parse_mathml_api_parameter(self,name,pars,gvars=[]):
            // if (not name in pars) and (not name in gvars):
            //     print('Error in reading user data: ' + name)
            // if name in pars:
            //     tags = [ 'pf' ]
            //     args = [ pars[name] ]
            //     def f(index,key): return AP.APFormal(self,index,tags,args)
            //     return self.api_parameter_table.add(IT.get_key(tags,args),f)
            // if name in gvars:
            //     tags = ['pg', name ]
            //     args = []
            //     def f(index,key): return AP.APGlobal(self,index,tags,args)
            //     return self.api_parameter_table.add(IT.get_key(tags,args),f)
            // print('Api parameter name ' + name + ' not found in parameters or global variables')
            // exit(1)
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

        public toXmlObj(): any {
            const ret = {};
            ret[this.op] = null;
            ret[this.argument1.kind] = this.argument1.toXmlObj();
            return ret;
        }

        constructor(op: string, argument1: XPredicate) {
            super();
            this.op = op;
            this.argument1 = argument1;
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
            let term2: XPredicate = (old as XRelationalExpr).argument2;

            if (!term1) {
                term1 = new XReturnPredicate();
            }
            if (!term2) {
                term2 = new XConstantExpr('0');
            }

            if (op == "addressed-value") {
                return new XArgAddressedValue(op, term1, term2);
            } else if (isBinaryConstraint(op)) {
                return new XRelationalExpr(op, term1, term2);
            } else if (isUnaryConstraint(op)) {
                return new XUnaryExpr(op, term1);
            } else throw "unknown constraint " + op;
        }
    }

    export function parse_mathml_xpredicate(anode: Apply): XPredicate {
        if (!anode) {
            throw "wring parameter";
        }
        // delete anode["addressed-value"];
        const pairs = Object.keys(anode);
        const op = pairs[0];

        if (op == "addressed-value") {
            const term1 = pairs[1];
            const term2 = pairs[2];
            let error = null;
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

        } else if (isUnaryConstraint(op)) {

            const term1 = pairs[1];
            // console.error(`UNARY: ${op} ${term1} `);
            return new XUnaryExpr(op, parse_term(term1, anode[term1]));
        } else throw "unknown constraint " + op;


        //XXX: support  'preserves-all-mem' && 'false'




        // def pt(t): return self.parse_mathml_term(t,pars,gvars=gvars)
        // (op,terms) = (anode[0].tag,anode[1:])
        // optransformer = { 'eq':'eq', 'neq':'ne', 'gt':'gt', 'lt':'lt',
        //                       'geq':'ge', 'leq':'le' }
        // if op in ['eq','neq','gt','lt','geq','leq']:
        //     args = [ pt(t) for t in terms ]
        //     op = optransformer[op]
        //     tags = [ 'x', op ]
        //     def f(index,key): return XP.XRelationalExpr(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // if op == 'not-null':
        //     args = [ pt(terms[0]) ]
        //     tags = [ 'nn' ]
        //     def f(index,key): return XP.XNotNull(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // if op == 'not-zero':
        //     args = [ pt(terms[0]) ]
        //     tags = [ 'nz' ]
        //     def f(index,key): return XP.XNotZero(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // if op == 'non-negative':
        //     args = [ pt(terms[0]) ]
        //     tags = [ 'nng' ]
        //     def f(index,key): return XP.XNonNegative(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // if op == 'preserves-all-memory':
        //     args = []
        //     tags = [ 'prm' ]
        //     def f(index,key): return XP.XPreservesAllMemory(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // if op == 'false':
        //     args = []
        //     tags = [ 'f' ]
        //     def f(index,key): return XP.XFalse(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // if op == 'initialized':
        //     args = [ pt(terms[0]) ]
        //     tags = [ 'i' ]
        //     def f(index,key): return XP.XInitialized(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // if op == 'tainted':
        //     args = [ pt(terms[0]) ]
        //     tags = [ 'tt' ]
        //     def f(index,key): return XP.XTainted(self,index,tags,args)
        //     return self.xpredicate_table.add(IT.get_key(tags,args),f)
        // else:
        //     print('Parse mathml xpredicate not found for ' + op)
        //     exit(1)
    }




}


