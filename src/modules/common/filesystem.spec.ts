const assert = require('assert');


import { suite, test, slow, timeout } from "mocha-typescript";

import { Filter, PO_FILTER } from './filter';
import * as tf from '../tf_graph_common/lib/common'
import { ProjectImpl } from "./globals";
import { FileSystem } from "./filesystem";

const path = require('path');
const fs = require('fs');


@suite
class TestFilesystem {

    testDir1 = path.normalize(__dirname + '/../../../docs');

    @test
    testGetCApp() {
        const actualSourceDirFake = "/usr/sources/lib"
        const p1 = path.join(this.testDir1, "/app/subdir/");
        const p2 = path.join(this.testDir1, "/app/subdir");

        const fs = new FileSystem(this.testDir1, __dirname);
        let capp = fs.getCApp(p2, actualSourceDirFake);

        assert.equal(capp.baseDir, p1);
        assert.equal(capp.sourceBaseRelative, "app/subdir/");

        assert.equal(capp.actualSourceDir, actualSourceDirFake + "/");

        let capp2 = fs.getCApp(p2, actualSourceDirFake);
        assert.equal(capp, capp2);
    }

    @test
    testGetCFile() {
        const actualSourceDirFake = "/usr/sources/lib"
        const fileIdentityName = "dir1/dir2/sampleFile.c";
        const fs = new FileSystem(this.testDir1, __dirname);

        let cfile = fs.getCApp(this.testDir1 + "/app1", actualSourceDirFake).getCFile(fileIdentityName);


        assert.equal(cfile.shortName, "sampleFile.c");
        assert.equal(cfile.absFile, path.join(this.testDir1, "app1", fileIdentityName));
        assert.equal(cfile.relativePath, "app1/" + fileIdentityName);
        assert.equal(cfile.actualFile, path.join(actualSourceDirFake, fileIdentityName));
    }


    @test
    testGetAbsCFile() {
        const actualSourceDirFake = "/usr/sources/lib"
        const fileIdentityName = "/usr/sources/lib/sampleFile.c";
        const fs = new FileSystem(this.testDir1, __dirname);

        let cfile = fs.getCApp(this.testDir1 + "/app1", actualSourceDirFake).getCFile(fileIdentityName);


        assert.equal(cfile.shortName, "sampleFile.c");
        assert.equal(cfile.absFile, fileIdentityName);
        assert.equal(cfile.relativePath, fileIdentityName);
        assert.equal(cfile.actualFile, fileIdentityName);
    }


}
