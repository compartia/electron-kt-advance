const assert = require('assert');

import { suite, test } from "mocha-typescript";
import { AnySet, StringSet } from "./collections";



@suite class TestAnySet {


    @test testConstructSet() {
        let aset = new AnySet([]);
        assert.equal(aset.length, 0, "length must be zero");
    }

    @test testAddToSet() {
        let aset = new AnySet([]);
        aset.add("one");
        aset.add("one");
        aset.add("two");
        assert.equal(aset.length, 2, "length must be 2");
    }

    @test testContainsAndDelete() {
        let aset = new StringSet([]); 
        aset.add("one");
        assert.equal(aset.contains("one"), true, "should contain 'one'");
        assert.equal(aset.contains("other"), false, "should not contain 'other'");

        aset.add("one");
        aset.add("one");
        aset.add("one");

        aset.delete("one");
        assert.equal(aset.contains("one"), false, "should not contain 'one'");
    }
}
