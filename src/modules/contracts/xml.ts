import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as _ from 'lodash';

import { contracts } from './contracts'


function isPrimitive(test) {
    return (test !== Object(test));
};


export class CFileContractXml extends contracts.CFileContractImpl {
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
            const jfile = result["c-analysis"]["cfile"][0];
            Object.assign(this, this.flatten(jfile));

            this.functions = this.functions.map(fn => {
                let fnObj = new contracts.CFunctionContract();

                if (fn.parameters) {
                    fn.parameters = _.sortBy(fn.parameters, v => v["nr"]);
                    fn.parameters = fn.parameters.map(x => x["name"]);
                }
                Object.assign(fnObj, fn);

                this._functionsByName[fnObj.name] = fnObj;//XXX: mind overloaded!!
                return fnObj;
            });

        });
    }


    static ARRAYS = {
        "postconditions": "post",
        "preconditions": "pre",
        "functions": "function",
        "parameters": "par",
        "global-variables": "gvar"
    };

    private flatten(_xml): any {
        if (isPrimitive(_xml)) return _xml;


        const dest = {};

        if (_xml.$) {
            Object.assign(dest, _xml.$);
        }

        for (const prop of Object.keys(_xml)) {
            var val = _xml[prop];

            if (prop != "$") {
                if (CFileContractXml.ARRAYS[prop]) {
                    // property is array
                    val = val[0];
                    if (isPrimitive(val)) {
                        // empty Array
                        dest[prop] = [];
                        return dest;
                    }

                    let arrayElementName = CFileContractXml.ARRAYS[prop];

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