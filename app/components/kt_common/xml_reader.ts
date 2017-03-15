module kt.graph.kt_graph {
    const fs = require('fs');
    const path = require('path');
    const sax = require('sax')


    export class XmlReader {

        public parsePpoXml(filename: string): Promise<Array<kt.graph.po_node.PONode>> {

            // let deferredResult = defer<Array<kt.graph.po_node.PONode>>();

            let ppos = new Array<kt.graph.po_node.PONode>();

            let strict = true;
            let parser = sax.createStream(strict);
            let functionName;

            let currentPo = {}


            parser.onopentag = (tag) => {
                if (tag.name == 'function') {
                    functionName = tag.attributes["name"];
                    console.log(functionName);
                }

                else if (tag.name == 'proof-obligation') {
                    currentPo = {
                        "id": tag.attributes["id"],
                        "functionName": functionName,
                        "level": "PRIMARY",
                        "state": "OPEN"
                    }
                }

                else if (tag.name == 'location') {
                    currentPo["file"] = tag.attributes["file"];
                    let line: number = tag.attributes["line"];
                    currentPo["textRange"] = [[line, 0], [line, 200]];
                }

                else if (tag.name == 'predicate') {
                    currentPo["predicateType"] = tag.attributes["tag"];
                }




            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'proof-obligation') {
                    // currentPo["referenceKey"] = currentPo["id"] + "::" + currentPo["functionName"] + "::" + currentPo["file"];
                    let ppoNode = new kt.graph.po_node.PONode(currentPo);
                    ppos.push(ppoNode);
                }
            }


            return new Promise((resolve, reject) => {
                let stream = fs.createReadStream(filename);
                stream.pipe(parser);

                stream.on('end', () => {
                    resolve(ppos);
                });

            });

        }





        public parseSpoXml(filename: string): Promise<Array<kt.graph.po_node.PONode>> {


            let spos = new Array<kt.graph.po_node.PONode>();

            let strict = true;
            let parser = sax.createStream(strict);

            let functionName;
            let currentSpo = {}
            let callsiteObligation = {}
            let lasttag = '';


            parser.onopentag = (tag) => {
                if (tag.name == 'function') {
                    functionName = tag.attributes["name"];
                }

                if (tag.name == 'callsite-obligation') {
                    callsiteObligation = {
                        fname: tag.attributes["fname"]
                    }
                }

                else if (tag.name == 'obligation') {
                    currentSpo = {
                        "id": tag.attributes["id"],
                        "apiId": tag.attributes["api-id"],
                        "functionName": functionName,
                        "file": callsiteObligation["fileName"],
                        "callsiteFname": callsiteObligation["fname"],
                        "callsiteFileName": callsiteObligation["callsiteFileName"],
                        "level": "SECONDARY",
                        "state": "OPEN",
                        "textRange": [[callsiteObligation["line"], 0], [callsiteObligation["line"], 200]]
                    }
                }

                else if (tag.name == 'location') {
                    if (callsiteObligation) {
                        callsiteObligation["fileName"] = tag.attributes["file"];
                        callsiteObligation["line"] = parseInt(tag.attributes["line"]);
                    } else {
                        //post-expectation or return-site
                        //console.error("found location tag in the scope of "+lasttag+" tag, parsing "+filename);
                    }
                }

                else if (tag.name == 'predicate') {
                    currentSpo["predicateType"] = tag.attributes["tag"];
                }


                lasttag = tag.name;

            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'obligation') {
                    // currentPo["referenceKey"] = currentPo["id"] + "::" + currentPo["functionName"] + "::" + currentPo["file"];
                    let ppoNode = new kt.graph.po_node.PONode(currentSpo);
                    spos.push(ppoNode);
                } else if (tagName == 'callsite-obligation') {
                    callsiteObligation = null;
                }
            }


            return new Promise((resolve, reject) => {
                let stream = fs.createReadStream(filename);
                stream.pipe(parser);
                stream.on('end', () => {
                    resolve(spos);
                });

            });

        }



        public parsePevXml(filename: string): Promise<Array<kt.graph.po_node.PODischarge>> {

            // let deferredResult = defer<Array<kt.graph.po_node.PONode>>();

            let ppos = new Array<kt.graph.po_node.PODischarge>();

            let strict = true;
            let parser = sax.createStream(strict);
            let functionName;
            let sourceFilename;

            let currentPo: kt.graph.po_node.PODischarge;


            parser.onopentag = (tag) => {
                if (tag.name == 'function') {
                    functionName = tag.attributes["name"];
                    // console.log(functionName);
                }

                else if (tag.name == 'discharged') {
                    currentPo = new kt.graph.po_node.PODischarge();
                    currentPo.functionName = functionName;
                    currentPo.id = tag.attributes["id"];
                    currentPo.method = tag.attributes["method"];
                    currentPo.type = tag.attributes["type"];
                    currentPo.violation = ("true" == tag.attributes["violation"]);
                    currentPo.file = sourceFilename;
                }

                else if (tag.name == 'evidence') {
                    currentPo.evidence = {
                        comment: tag.attributes["comment"]
                    };

                }

                else if (tag.name == 'assumptions') {
                    currentPo.assumptions = [];
                }

                else if (tag.name == 'application') {
                    sourceFilename = tag.attributes["file"].replace("//", "/");
                    for (let po of ppos) {
                        po.file = sourceFilename;
                    }
                }



                else if (tag.name == 'uses') {
                    currentPo.assumptions.push({
                        apiId: tag.attributes["a-id"],
                        type: tag.attributes["a-type"],
                    })
                }

            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'discharged') {
                    ppos.push(currentPo);
                    currentPo = null;
                }
            }


            return new Promise((resolve, reject) => {
                let stream = fs.createReadStream(filename);
                stream.pipe(parser);

                stream.on('end', () => {
                    resolve(ppos);
                });

            });

        }


        private readAndBindEvFiles(dirName: string, suffix: string, ppoMap: { [id: string]: kt.graph.po_node.PONode }) {
            const parser = this;
            let err: number = 0;
            parser.readXmls(dirName, suffix, parser.parsePevXml).then(pevs => {
                let pevMap = _.indexBy(pevs, "key");
                console.info("total objects: " + pevs.length + " \t\ttotal unique keys: " + Object.keys(pevMap).length);

                for (let key in pevMap) {
                    // console.info(key);
                    let ppo = ppoMap[key];
                    if (ppo) {
                        ppo.discharge = pevMap[key];
                    } else {
                        console.warn((err++) + " no PO info for the key " + key);
                    }

                }



            });

        }



        public readDir(dirName: string): void {
            // this.readPPOs(dirName);
            const parser = this;

            parser.readXmls(dirName, "_ppo.xml", parser.parsePpoXml)
                .then(ppos => {
                    let ppoMap = _.indexBy(ppos, "key");
                    console.info("total objects: " + ppos.length + " \t\ttotal unique keys: " + Object.keys(ppoMap).length);

                    parser.readAndBindEvFiles(dirName, "_pev.xml", ppoMap);

                });

            parser.readXmls(dirName, "_spo.xml", parser.parseSpoXml)
                .then(spos => {
                    let spoMap = _.indexBy(spos, "key");
                    console.info("total objects: " + spos.length + " \t\ttotal unique keys: " + Object.keys(spoMap).length);
                    console.info(spos[0]);
                    parser.readAndBindEvFiles(dirName, "_sev.xml", spoMap);
                });
        }


        /**
        reads all files ending with the given suffix inthe given direcory. Parses them with provided parsingFunc param.
        The results are joined in the resulting array;
        TODO: might be better to return a map filename->Array<X>
        **/
        private readXmls<X>(dirName: string, suffixFilter: string, parsingFunc: (filename: string) => Promise<Array<X>>): Promise<Array<X>> {
            let parser = this;

            return new Promise((resolve, reject) => {

                fs.readdir(dirName, function(err, items) {

                    let pposPromisesArray = new Array<Promise<X[]>>();

                    for (let item of items) {
                        if (item.endsWith(suffixFilter)) {
                            pposPromisesArray.push(parsingFunc(path.join(dirName, item)));
                        }
                    }

                    Promise.all(pposPromisesArray).then((arrayOfResults) => {
                        let flat: Array<X> = _.flatten(arrayOfResults);

                        console.info("parsed " + arrayOfResults.length + " *" + suffixFilter + "  files, total objects: " + flat.length);
                        resolve(flat);

                    });

                });

            });



        }



    }


    export function test() {
        console.info("test");

        const paths = ["/Users/artem/work/KestrelTechnology/IN/dnsmasq/ch_analysis/src/cache/"];

        let reader: XmlReader = new XmlReader();
        reader.readDir(paths[0]);
    }
}
