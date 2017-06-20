const assert = require('assert');

import { Project } from "./globals"
import { suite, test, slow, timeout } from "mocha-typescript";
import { ProofObligation, PoStates, PODischarge } from "../model/po_node"
import { Filter, PO_FILTER } from './filter';
import * as tf from '../tf_graph_common/lib/common'

const path = require('path');
const fs = require('fs');



@suite
class TestFilter {

    @test(timeout(12000))
    testApplyEmptyFilter(done) {
        const basedir = path.join(__dirname, '../../../test_resources', 'dnsmasq');
        let project = new Project(basedir);
        project.readAndParse(new tf.ProgressTrackerDummie()).then(
            (project: Project) => {
                assert(project.proofObligations.length > 0);
                project.applyFilter(PO_FILTER);
                // console.log(project.proofObligations.length + " vs " + project.filteredProofObligations.length);

                assert.equal(project.proofObligations.length, project.filteredProofObligations.length, "zero- filter must not remove POs");
                done();
            }
        );
    }




}
