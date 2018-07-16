import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as _ from 'lodash';

import { contracts } from './contracts'

const ______DEBUG = false;

function isPrimitive(test) {
    return (test !== Object(test));
}



export function toXml(fileContract: contracts.CFileContract): string {
    var x_cfile = {
        $: { name: fileContract.name },
        "data-structures": dataStructuresToXml(fileContract.dataStructures),
        "global-variables": globalVariablesToXml(fileContract.globalVariables),
        "functions": functionsToXml(fileContract.functions),
    };

    let obj = {};
    obj["header"] = {};
    obj["cfile"] = x_cfile;

    var builder = new xml2js.Builder({
        rootName: "c-analysis",
        preserveChildrenOrder: true,
        explicitChildren: true
    });

    var xml = builder.buildObject(obj);
    return xml;
}

function dataStructuresToXml(dataStructures: any) {
    return {};
}


function globalVariablesToXml(globalVariables: contracts.GVar[]) {
    let r = {
        gvar: globalVariables.map(gv => {
            return { "$": gv };
        })
    };

    return r;
}

function nonEmpty(arr: any[] | null | undefined): boolean {
    if (arr) {
        return arr.length > 0;
    }
    return false;
}

function functionsToXml(funcs: contracts.CFunctionContract[]) {
    let r = {
        "function":
            funcs.map(fun => {
                let xfun = { "$": { name: fun.name } };

                if (nonEmpty(fun.parameters))
                    xfun["parameters"] = { param: parameters2Xml(fun.parameters) };
                if (nonEmpty(fun.preconditions))
                    xfun["preconditions"] = { pre: conditions2Xml(fun.preconditions) };
                if (nonEmpty(fun.postconditions))
                    xfun["postconditions"] = { post: conditions2Xml(fun.postconditions) };
                return xfun;
            })
    };

    return r;
}

function parameters2Xml(parameters: string[]): any {
    if (!parameters || parameters.length == 0) return {};
    return parameters.map((c, i) => {
        return { $: { name: c, nr: (i + 1) } }
    });
}

function conditions2Xml(conditions: contracts.Math[]): any {
    if (!conditions || conditions.length == 0) return {};
    return conditions.map(c => {
        return condition2Xml(c);
    });
}

function condition2Xml(condition: contracts.Math): any {
    return { math: { "apply": condition.apply.toXmlObj() } };
}


export class CFileContractXml extends contracts.CFileContractImpl {



    static SCHEMA = {
        "postconditions": "post",
        "preconditions": "pre",
        "functions": "function",
        "parameters": "par",
        "global-variables": "gvar"
    };


    constructor(xmlfile: string) {
        super();
        this.fromXml(xmlfile);
    }

    public fromXml(filename) {
        this.functions = [];

        const parser = new xml2js.Parser({
            trim: true,
            emptyTag: true
        });

        const data = fs.readFileSync(filename);

        parser.parseString(data, (err, result) => {

            if (err) {
                console.error(err);
                return;
            }

            const jfile = result["c-analysis"]["cfile"][0];

            const flattened = this._flatten(jfile);

            if (______DEBUG) this.log(0, JSON.stringify(flattened, null, ' '));

            (<any>Object).assign(this, flattened);

            this.convertToObjects();

        });
    }

    private convertToObjects() {
        this.globalVariables = this['global-variables'];
        delete this['global-variables'];

        this.functions = this.functions.map(fn => {

            let fnObj = new contracts.CFunctionContract();

            if (fn.parameters) {
                fn.parameters = _.sortBy(fn.parameters, v => v["nr"]);
                fn.parameters = fn.parameters.map(x => x["name"]);
            }

            (<any>Object).assign(fnObj, fn);
            this.log(1, fnObj.name);

            this._functionsByName[fnObj.name] = fnObj;//XXX: mind overloaded!!

            if (fnObj.postconditions) {
                fnObj.postconditions = fnObj.postconditions.map(
                    pc => new contracts.Math((pc as any).math.apply)
                );
            }

            if (fnObj.preconditions) {
                fnObj.preconditions = fnObj.preconditions.map(
                    pc => new contracts.Math((pc as any).math.apply)
                );
            }

            return fnObj;
        });
    }



    private tabs(n) {
        let t = '';
        for (let i = 0; i < n; i++) {
            t += "\t\t";
        }
        return t;
    }

    private log(n, str) {
        if (______DEBUG)
            console.log("FFF:" + this.tabs(n) + str);
    }

    private _flatten(_xml, tabs?): any {
        if (!tabs) tabs = 0; //just for debug logging
        if (isPrimitive(_xml)) return _xml;


        const dest = {};

        if (_xml.$) {
            this.log(tabs, "attributes:" + Object.keys(_xml.$));
            (<any>Object).assign(dest, _xml.$);
        }

        const props = Object.keys(_xml);
        this.log(tabs, "properties:" + props);

        for (const prop of props) {

            this.log(tabs, "---------------->>" + prop)

            if (prop !== "$") {
                let val = _xml[prop];
                if (CFileContractXml.SCHEMA[prop]) {

                    // property is an array
                    if (Array.isArray(val)) {
                        val = val[0];
                    }

                    if (isPrimitive(val)) {
                        this.log(tabs, val + " is primitive")
                        // empty Array
                        dest[prop] = [];

                    } else {
                        let arrayElementName = CFileContractXml.SCHEMA[prop];

                        dest[prop] = [];
                        for (const el of val[arrayElementName]) {
                            const flattened = this._flatten(el, tabs + 1);
                            if (flattened) {
                                dest[prop].push(flattened);
                            } else {
                                this.log(tabs, "cannot flatten " + arrayElementName);
                                console.error(el);
                            }
                        }
                    }

                } else {
                    //flatten
                    dest[prop] = this._flatten(val[0], tabs + 1);
                }
            }
        }

        return dest;
    }
}