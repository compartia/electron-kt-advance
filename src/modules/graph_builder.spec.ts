const assert = require('assert');

import { ProofObligation  } from "xml-kt-advance/lib/model/po_node"
import { Filter  } from "./common/filter"
import { GraphSettings  } from "./common/globals"

import { makeProofObligationName  } from "./graph_builder"
import { suite, test, slow, timeout } from "mocha-typescript";


@suite class TestGraphBuilder {


    @test testMakeProofObligationName() {
        let po = new ProofObligation({});
        po.id = 'PO_ID';
        let settings = new GraphSettings();
        let filter = new Filter();
        po.cfunction.file = "/dir/file.ext";
        po.cfunction.name = "func";
        let poname = makeProofObligationName(po, filter, settings);

        assert.equal(poname, "file.ext/func/I(PO_ID)-expression-");

    }


}
