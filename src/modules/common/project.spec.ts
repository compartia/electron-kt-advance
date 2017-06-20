const assert = require('assert');

import { Project } from "./globals"
import { suite, test, slow, timeout } from "mocha-typescript";



@suite class TestSaveProject {


    @test testSaveProject() {
        let project = new Project('.');
        project.save();
    }


}
