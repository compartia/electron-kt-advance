import * as path from 'path';
const assert = require('assert');

import { suite, test } from "mocha-typescript";
import './contracts';
import { contracts } from './contracts';
import * as xml from './xml';

Error.stackTraceLimit = 30;

let testDir = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_1.xml');
let testDir2 = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_2.xml');






function testWriteContract() {

    const contract: contracts.CFileContract = new xml.CFileContractXml(testDir2);

    let xmlStr = xml.toXml(contract);
    console.log(xmlStr);

}


testWriteContract();