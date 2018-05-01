const assert = require('assert');


import { suite, test, slow, timeout } from "mocha-typescript";

import { Filter, PO_FILTER } from './filter';
import * as tf from '../tf_graph_common/lib/common'

const path = require('path');
const fs = require('fs');


@suite
class TestFilter {

    @test
    testNewFilterIsTransparent() {
        const newFilter = new Filter();
        assert.equal(true, PO_FILTER.isTransparent(), "by default PO_FILTER should accept everything");
        assert.equal(true, newFilter.isTransparent(), "by default a newly created filter should accept everything");

        newFilter.line = 0;
        assert.equal(true, newFilter.isTransparent());
        newFilter.line = -1;
        assert.equal(true, newFilter.isTransparent());
        newFilter.line = null;
        assert.equal(true, newFilter.isTransparent());
    }





}
