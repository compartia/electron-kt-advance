



export module contracts {

    export const UNARY_RELATIONS = ['false', 'initialized', 'preserves-all-memory', 'tainted', 'not-zero', 'not-null', 'addressed-value', 'non-negative'];
    export const BINARY_RELATIONS = ['eq', 'neq', 'gt', 'lt', 'geq', 'leq'];

    export const RELATIONS = [].concat(UNARY_RELATIONS).concat(BINARY_RELATIONS);
    export const RELATIONS_NAMES = {
        'eq': "==", 'neq': "!=", 'gt': ">", 'lt': "<", 'geq': ">=", 'leq': "<="
    }

    export interface Apply {
    }

    export class Math {
        apply?: XPredicate;
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
        postconditions: contracts.Math[];
        preconditions: contracts.Math[];

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
        globalVariables: any[];


        getFunctionContractByName(name: string): CFunctionContract | undefined;

        hasContracts: boolean;
    }



    /////////////////


    export class CFileContractImpl implements CFileContract {
        functions: CFunctionContract[];
        name: string;
        dataStructures: any[];
        globalVariables: GVar[];


        getFunctionContractByName(name: string): CFunctionContract | undefined {
            return this._functionsByName[name];
        }

        _functionsByName = {};



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
        private baseDir: string;
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
        displayString: string
    }

    export class XReturnPredicate implements XPredicate {
        get displayString(): string {
            return "return_value";
        }
    }

    export class XApiPredicate implements XPredicate {
        ref: string;
        constructor(ref: string) {
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
    }



    


    export class XUnaryExpr implements XPredicate {
        op: string; 
        argument1: XPredicate;
        constructor(op: string, argument1: XPredicate) {

            if (!argument1) {
                throw "wrong argument 2";
            }

            this.op = op;
            this.argument1 = argument1;            
        }

        get displayString(): string {
            return `${this.op}(${this.argument1.displayString})`;
        }
    }


    export class XRelationalExpr extends XUnaryExpr {
        // op: string; 
        // argument1: XPredicate; 
        argument2: XPredicate;

        constructor(op: string, argument1: XPredicate, argument2: XPredicate) {
            super(op, argument1)
            this.op = op;
            this.argument1 = argument1;
            this.argument2 = argument2;

            // console.log(this.displayString)
        }

        get displayString(): string {
            // let a=this.a;
            return `(${this.argument1.displayString} ${RELATIONS_NAMES[this.op]} ${this.argument2.displayString})`;
        }
    }

    export class XArgAddressedValue extends XRelationalExpr {
        
        constructor(op: string, a: XPredicate, b: XPredicate) {
            super(op, a, b)            
        }

        get displayString(): string {
            // let a=this.a;
            return `(${this.argument1.displayString} --> ${this.argument2.displayString})`;
        }
    }


    export class XFieldExpr implements XPredicate {
        field: string;
        constructor(value: any) {
            this.field = value.fname;
        }

        get displayString(): string {
            return `${this.field}`;
        }
    }

    export class XConstantExpr implements XPredicate {
        value: string;
        constructor(value: string) {
            this.value = value;
        }

        get displayString(): string {
            return `'${this.value}'`;
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
                throw "unknwn term " + term;

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

            return new XArgAddressedValue(op, parse_term(term1, anode[term1]), parse_term(term2, anode[term2]));
        } else if (isBinaryConstraint(op)) {
            const term1 = pairs[1];
            const term2 = pairs[2];

            return new XRelationalExpr(op, parse_term(term1, anode[term1]), parse_term(term2, anode[term2]));

        } else if (isUnaryConstraint(op)) {

            const term1 = pairs[1];
            // console.error(`UNARY: ${op} ${term1} `);
            return new XUnaryExpr(op, parse_term(term1, anode[term1]));
        } else throw "unknown constraint " + op;

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



// const contract: contracts.CFileContract = new contracts.CFileContractImpl('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
// // contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/contract_sample.xml');

// console.log("===========================");
// // contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
// console.log(JSON.stringify(contract, null, ' '));
