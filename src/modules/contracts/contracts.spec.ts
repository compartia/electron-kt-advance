import * as path from 'path';
const assert = require('assert');

import { suite, test } from "mocha-typescript";
import { CFileContract, CFileContractImpl } from './contracts';


Error.stackTraceLimit = 30;

@suite class TestContracts {
    testDir = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_1.xml');

    @test testReadContract() {

        const contract: CFileContract = new CFileContractImpl();

        contract.fromXml(this.testDir);
        console.log(JSON.stringify(contract, null, ' '));

    }
}

