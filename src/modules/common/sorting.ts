import { AbstractNode } from "./xmltypes";
// import {groupBy} from "lodash";
// const _ = require("lodash");
export function groupProofObligationsByFileFunctions(pos: AbstractNode[]): { [key: string]: { [key: string]: AbstractNode[] } } {
    let byfile = _.groupBy(pos, "file");
    let byFileFunc = {};
    for (let filename in byfile) {
        let subgroup = _.groupBy(byfile[filename], "functionName");
        byFileFunc[filename] = subgroup;
    }

    return byFileFunc;
}

export function unzipPoGroup(byFileFuncGroup: { [key: string]: { [key: string]: AbstractNode[] } }) {
    let ret = [];
    for (let filename in byFileFuncGroup) {

        for (let funcname in byFileFuncGroup[filename]) {

            ret.push({
                value: funcname,
                parent: filename,
                type: "function",
                group: true,
            });

            for (let po of byFileFuncGroup[filename][funcname]) {
                ret.push({
                    value: po,
                    type: "po"
                });
            }
        }
    }
    return ret;

}