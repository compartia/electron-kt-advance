import * as path from 'path';
const assert = require('assert');

import { suite, test } from "mocha-typescript";
import './contracts';
import { contracts } from './contracts';
import { CFileContractXml } from './xml';

Error.stackTraceLimit = 30;

@suite class TestContracts {
    testDir = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_1.xml');

    @test testReadContract() {

        const contract: contracts.CFileContract = new CFileContractXml(this.testDir);
        // contract.fromXml(this.testDir);

        assert.equal(contract.functions.length, 19, "number of functions must be 19, was " + contract.functions.length);

        for (const fn of contract.functions) {
            // console.error("FNL:"+fn);
            assert(fn, "function is not Ok:" + fn);
            assert(fn.name, "function name is not Ok:" + fn);

            if(fn.name==="sbufInit"){
                assert.equal(fn.parameters.length, 3, "number of params must be 3");
                assert.equal(fn.parameters[2], 'end' );
            }
            
        }
        

        // console.log(JSON.stringify(contract, null, ' '));

    }
}

