const assert = require('assert');

import { ProjectImpl } from "./globals"
import { suite, test, slow, timeout } from "mocha-typescript";
import { FileSystem } from "./filesystem";



@suite class TestSaveProject {

    @test testSaveProject() {
        
        let project = new ProjectImpl(new FileSystem ('.', '.'));        
        project.save();
    }

}
