const assert = require('assert');

import { ProjectImpl } from "./globals"
import { suite, test, slow, timeout } from "mocha-typescript";



@suite class TestSaveProject {

    @test testSaveProject() {
        let project = new ProjectImpl('.', '.');
        project.save();
    }

}
