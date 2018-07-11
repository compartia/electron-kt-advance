import * as path from 'path';
// const assert = require('assert');

// import { suite, test } from "mocha-typescript";
import './contracts';
import { contracts } from './contracts';
import { CFileContractXml } from './xml';

 
// const contract: contracts.CFileContract = new  CFileContractXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
const contract: contracts.CFileContract = new  CFileContractXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_2.xml');
//const contract2: contracts.CFileContract = new  CFileContractXml('/Users/artem/work/KT/ktadvance/tests/B/cleanflight-CLFL_v2.3.2/ktacontracts/src/main/flight/mixer_c.xml');

// contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/contract_sample.xml');

console.log("===========================");
// contract.fromXml('/Users/artem/work/KT/electron-kt-advance/docs/contracts/sample_contract_1.xml');
// console.log(JSON.stringify(contract, null, ' '));