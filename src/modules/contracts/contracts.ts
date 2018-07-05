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

export class Math {
    apply: any;
    constructor(_math) {

        Object.assign(this, _math.$);
        this.apply = {};
        let _applyNode = _math.math[0].apply[0];
        Object.keys(_applyNode).forEach(p => {
            this.apply[p] = _applyNode[p][0];
        });
    }
}

export class CFunctionContractImpl implements CFunctionContract {
    ignore?: boolean;
    name: string;
    src: string;

    parameters: CFunctionParameter[];
    postconditions: Math[];
    preconditions: Math[];

    constructor(fn: any) {

        Object.assign(this, fn.$);
        this.ignore = (fn.$.ignore === 'yes');


        if (fn.parameters && fn.parameters[0].par) {
            let _params = fn.parameters[0].par.map(jpar => jpar.$);
            _params = _.sortBy(_params, v => v["nr"]);
            _params = _params.map(x => x["name"]);
            this.parameters = _params;
        }

        this.postconditions = fn.postconditions && fn.postconditions[0].post &&
            fn.postconditions[0].post.map(p => new Math(p));

        this.preconditions = fn.preconditions && fn.preconditions[0].post &&
            fn.preconditions[0].post.map(p => new Math(p));


    }
}

/////////////////


export class CFileContractImpl implements CFileContract {
    functions: CFunctionContract[];
    name: string;
    dataStructures: any[];
    globalVariables: GVar[];

    // private _functionsByName

    public addFuctionContract(fc: CFunctionContract) {
        if (this.functions.includes(fc)) {
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
            console.debug(JSON.stringify(jfile, null, ' '));//TODO: remove it!!
            this.parseJFile(jfile);
        });
    }

    private parseJFile(jfile) {
        Object.assign(this, jfile.$);
        this.functions = jfile.functions[0].function && jfile.functions[0].function.map(
            fn => new CFunctionContractImpl(fn));

        if (jfile["global-variables"][0].gvar) {
            this.globalVariables = jfile["global-variables"][0].gvar.map(x => <GVar>x.$);
        }

        this.dataStructures= jfile["data-structures"][0];


    }


}

// const contract: CFileContract = new CFileContractImpl();
// contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/contract_sample.xml');

// console.log("===========================");
// console.log(JSON.stringify(contract, null, ' '));
// // contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');