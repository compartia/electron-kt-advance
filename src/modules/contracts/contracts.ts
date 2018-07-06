
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as _ from 'lodash';

export module contracts {


    export interface Math {
    }

    export interface CFunctionContract {
        ignore?: boolean;
        name: string;
        src: string;

        parameters: string[];
        postconditions: contracts.Math[];
        preconditions: contracts.Math[];
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
        fromXml(filename: string): void;
    }



    /////////////////


    export class CFileContractImpl implements CFileContract {
        functions: CFunctionContract[];
        name: string;
        dataStructures: any[];
        globalVariables: GVar[];

        // private _functionsByName

        constructor(xmlfile: string) {
            this.fromXml(xmlfile);
        }

        public addFuctionContract(fc: CFunctionContract) {
            if (this.functions && this.functions.indexOf(fc) >= 0) {
                throw "Function contract is already there";
            }
            this.functions.push(fc);
            // this._functionsByName[fc.name]=fc;
        }

        public fromXml(filename) {
            this.functions = [];
            const parser = new xml2js.Parser({
                trim: true,
                emptyTag: true
            });

            const data = fs.readFileSync(filename);

            parser.parseString(data, (err, result) => {
                const jfile = result["c-analysis"]["cfile"][0];
                Object.assign(this, this.flatten(jfile));

                this.functions.forEach(fn => {
                    if (fn.parameters) {
                        fn.parameters = _.sortBy(fn.parameters, v => v["nr"]);
                        fn.parameters = fn.parameters.map(x => x["name"]);
                    }
                });

            });
        }


        static ARRAYS = {
            "postconditions": "post",
            "preconditions": "pre",
            "functions": "function",
            "parameters": "par",
            "global-variables": "gvar"
            // "math":true,

        };

        private flatten(_xml): any {
            if (isPrimitive(_xml)) return _xml;
            if (_xml.__visited) throw "already visited";
            _xml.__visited = true;

            const dest = {};

            if (_xml.$) {
                Object.assign(dest, _xml.$);
            }

            for (const prop of Object.keys(_xml)) {
                var val = _xml[prop];

                if (prop != "$") {
                    if (CFileContractImpl.ARRAYS[prop]) {
                        // property is array
                        val = val[0];
                        if (isPrimitive(val)) {
                            // empty Array
                            dest[prop] = [];
                            return dest;
                        }

                        let arrayElementName = CFileContractImpl.ARRAYS[prop];

                        try {
                            dest[prop] = [];
                            for (const el of val[arrayElementName]) {
                                const flattened = this.flatten(el);
                                if (!flattened) {
                                    console.error("cannot flatten " + arrayElementName);
                                    console.error(el);
                                } else {
                                    dest[prop].push(flattened);
                                }
                            }
                        } catch (e) {
                            console.error(e);
                        }

                    } else {
                        //flatten
                        dest[prop] = this.flatten(val[0]);
                    }
                }
            }

            return dest;
        }

    }

    export class ContractsCollection {
        contractsByFile: { [key: string]: CFileContract } = {};
        public readXml(file: string) {
            const c: CFileContract = new CFileContractImpl(file);
            this.contractsByFile[c.name] = c;
        }
    }


    function isPrimitive(test) {
        return (test !== Object(test));
    };


}



const contract: contracts.CFileContract = new contracts.CFileContractImpl('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
// contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/contract_sample.xml');

console.log("===========================");
// contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
console.log(JSON.stringify(contract, null, ' '));
