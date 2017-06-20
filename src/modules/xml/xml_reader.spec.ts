const assert = require('assert');

import { suite, test, slow, timeout } from "mocha-typescript";
import { XmlReader } from './xml_reader'
import { CFunction, FunctionsMap } from './xml_types'

import * as tf from '../tf_graph_common/lib/common'


const path = require('path');
const fs = require('fs');

@suite
class TestXmlReader {



    @test(timeout(4000))
    readXmls(done) {
        const basedir = path.join(__dirname, '../../../test_resources', 'dnsmasq');

        let x: XmlReader = new XmlReader();
        x.readXmls(basedir, "_cfile.xml", x.parseCfileXml, new tf.ProgressTrackerDummie()).then(
            (r: CFunction[]) => {
                assert.equal(r.length, 416);
                done();
            }
        );
    }




}