import * as path from 'path';
const assert = require('assert');

import { suite, test } from "mocha-typescript";
import './contracts';
import { contracts } from './contracts';
import { CFileContractXml, toXml } from './xml';
import { ProjectImpl } from '../common/globals';
import { FileSystem } from '../common/filesystem';
import { CFunction } from '../common/xmltypes';

Error.stackTraceLimit = 30;

@suite class TestContracts {
    testDir = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_1.xml');
    testDir2 = path.normalize(__dirname + '/../../../docs/contracts/sample_contract_2.xml');

    testDir1 = path.normalize(__dirname + '/../../../docs');

    @test testReadContract() {

        const contract: contracts.CFileContract = CFileContractXml.fromXml(this.testDir);
        // contract.fromXml(this.testDir);

        assert.equal(contract.functions.length, 19, "number of functions must be 19, was " + contract.functions.length);

        for (const fn of contract.functions) {
            // console.error("FNL:"+fn);
            assert(fn, "function is not Ok:" + fn);
            assert(fn.name, "function name is not Ok:" + fn);

            if (fn.name === "sbufInit") {
                assert.equal(fn.parameters.length, 3, "number of params must be 3");
                assert.equal(fn.parameters[2], 'end');
                assert.equal(fn.postconditions.length, 4);
            }

        }


    }


    @test testReadContract2() {

        const contract: contracts.CFileContract = CFileContractXml.fromXml(this.testDir2);
        this.validateContract(contract);

    }

    private validateContract(contract: contracts.CFileContract) {
        assert.equal(contract.functions.length, 2, "number of functions must be 2, was " + contract.functions.length);


        assert.equal(contract.globalVariables.length, 2);
        assert.equal(contract.globalVariables[0].name, 'currentPidProfile');
        for (const fn of contract.functions) {

            assert(fn, "function is not Ok:" + fn);
            assert(fn.name, "function name is not Ok:" + fn);

            if (fn.name === "getMotorCount") {
                assert.equal(fn.parameters.length, 0, "number of params must be 0");
                assert.equal(fn.postconditions.length, 2);
                assert.equal(fn.preconditions.length, 1);
            }


        }
    }

    @test
    testSerialize2Xml() {

        let contract: contracts.CFileContract = CFileContractXml.fromXml(this.testDir2);
        let xmlStr = toXml(contract);

        const contractRestored: contracts.CFileContract = CFileContractXml.fromXmlStr(xmlStr);
        this.validateContract(contractRestored);
        // console.log(xmlStr);

    }


    @test
    testSaveNewContract() {

        const prj = new ProjectImpl(new FileSystem(this.testDir1, __dirname));

        let cfile = prj.fs.getCApp(this.testDir1).getCFile("dir1/dir2/sampleFile.ext.c");
        assert(cfile);
        assert(cfile.relativePath);
        assert.equal(cfile.relativePath, "dir1/dir2/sampleFile.ext.c");

        const contract = prj.contractsController.getFileContracts(cfile);
        assert(contract);
        assert.equal(contract.file, cfile);
        assert.equal(contract.hasContracts, false);
        assert.equal(contract.name, "dir1/dir2/sampleFile.ext");

        // FUNCTION
        const cfunction = <CFunction>{
            name: "funcName",
            loc: {
                cfile: cfile
            }
        };
        const funcContract = prj.contractsController.getFunctionContracts(cfunction);
        assert.equal(funcContract.name, "funcName");
        assert.equal(funcContract.cfunction, cfunction);


        const saved = prj.contractsController.saveContract(contract);
        assert(saved);
    }
}

