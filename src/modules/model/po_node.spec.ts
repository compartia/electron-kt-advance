const assert = require('assert');
import { ProofObligation } from "./po_node"
import { suite, test, slow, timeout } from "mocha-typescript";



@suite class TestProofObligationModel {


    @test testMakeProofObligation() {
        let po = new ProofObligation({});
       
    }


}
