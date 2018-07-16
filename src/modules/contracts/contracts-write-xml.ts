import * as path from 'path';
const assert = require('assert');

import * as xml2js from 'xml2js';
import './contracts';
import { contracts } from './contracts';
import * as xml from './xml';

Error.stackTraceLimit = 30;

// let testDir = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_1.xml');
let testDir2 = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_2.xml');






function testWriteContract() {

    const contract: contracts.CFileContract = xml.CFileContractXml.fromXml(testDir2);

    let xmlStr = xml.toXml(contract);
    console.log(xmlStr);

}

function testXmlExport() {

    var builder = new xml2js.Builder({
        rootName: "c-analysis",
        preserveChildrenOrder: true,
        explicitChildren: true
    });

    let obj = {
        math: {

            $: {
                a: "d"
            },
            apply: {
                "cn": 8,
                "leq": null,
                "not-null": null,
                "return": null,
            }
        }
    }
    var xmlStr = builder.buildObject(obj);
    console.log(xmlStr);

}


testWriteContract();
// testXmlExport();