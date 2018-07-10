



export module contracts {

    export const UNARY_RELATIONS = ['false', 'initialized', 'preserves-all-memory', 'tainted', 'not-zero', 'not-null'];
    export const BINARY_RELATIONS = ['eq', 'neq', 'gt', 'lt', 'geq', 'leq'];

    export const RELATIONS = [].concat(UNARY_RELATIONS).concat(BINARY_RELATIONS);
    export const RELATIONS_NAMES = {
        'eq': "==", 'neq': "!=", 'gt': ">", 'lt': "<", 'geq': ">=", 'leq': "<="
    }

    export interface Apply {
    }

    export interface Math {
        apply?: Apply;
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
                    ret += JSON.stringify(pc);
                }
                return ret;
            }
        }

        get postconditionsString(): string {

            if (this.postconditions) {
                let ret = "postconditions:";

                for (let pc of this.postconditions) {
                    ret += JSON.stringify(pc);
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





}



// const contract: contracts.CFileContract = new contracts.CFileContractImpl('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
// // contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/contract_sample.xml');

// console.log("===========================");
// // contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
// console.log(JSON.stringify(contract, null, ' '));
