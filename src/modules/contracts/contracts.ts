
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as _ from 'lodash';

export interface CFunctionParameter {
    name: string;
    nr: number;
}

export interface CFunctionContract {
    ignore?: boolean;
    name: string;
    src: string;

    parameters: CFunctionParameter[];
    postconditions: Math[];
    preconditions: Math[];
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
            // console.debug(JSON.stringify(jfile, null, ' '));//TODO: remove it!!

            Object.assign(this, this.flatten(jfile));
        });
    }


    static ARRAYS = {
        "postconditions": true,
        "preconditions": true,
        "functions": true,
        "parameters": true,
        "global-variables": true
        // "math":true,

    };

    private flatten(_xml): any {
        if (isPrimitive(_xml)) return _xml;
        if (_xml.__visited) return;
        _xml.__visited = true;

        let dest = {};
        if (_xml.$) {
            Object.assign(dest, _xml.$);
        }

        for (const prop of Object.keys(_xml)) {
            var val = _xml[prop];

            if (prop != "$") {
                if (CFileContractImpl.ARRAYS[prop]) {
                    // property is array
                    val = val[0];
                    if(isPrimitive(val)){
                        // empty Array
                        dest[prop] = [];
                        return;
                    }
                    
                    let k = Object.keys(val)[0];
                    if(k){
                        try {
                            dest[prop] = [];
                            for (const el of val[k]) {
                                dest[prop].push(this.flatten(el));
                            }
                        } catch (e) {
                            console.error(k);
                            console.error(val);
                            console.error(e);
                        }
                    }else{
                        console.error(prop+"="+val);
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
        const c: CFileContract = new CFileContractImpl();
        c.fromXml(file);
        this.contractsByFile[c.name] = c;
    }
}


function isPrimitive(test) {
    return (test !== Object(test));
};



const contract: CFileContract = new CFileContractImpl();
// contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/contract_sample.xml');

console.log("===========================");
contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
console.log(JSON.stringify(contract, null, ' '));
