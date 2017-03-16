module kt.graph.kt_graph {
    const fs = require('fs');
    const path = require('path');
    const sax = require('sax')


    export class XmlReader {


        public parseCfileXml(filename: string): Promise<Array<any>> {

            let strict = true;
            let parser = sax.createStream(strict);
            console.log("reading " + filename);
            //////

            let functionsScope: boolean;

            let functions = new Array<any>();

            let func;

            parser.onopentag = (tag) => {
                if (tag.name == 'functions') {
                    functionsScope = true;
                }
                else {

                    if (functionsScope) {
                        if (tag.name == 'gfun') {
                            func = {}
                        }

                        else if (tag.name == 'svar') {
                            func = {
                                "name": tag.attributes["vname"]
                            }
                        }

                        else if (tag.name == 'loc') {
                            func["file"] = tag.attributes["file"];
                            func["line"] = tag.attributes["line"];
                        }
                    }

                }

            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'gfun') {
                    functions.push(func);
                    func = null;
                }

                else if (tagName == 'functions') {
                    functionsScope = false;
                }
            }


            return new Promise((resolve, reject) => {
                let stream = fs.createReadStream(filename);
                stream.pipe(parser);

                stream.on('end', () => {
                    resolve(functions);
                });

            });

        }



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



        public parseApiXml(filename: string): Promise<Array<kt.graph.api_node.ApiNode>> {

            let ppos = new Array<kt.graph.api_node.ApiNode>();

            let strict = true;
            let parser = sax.createStream(strict);

            let functionName;
            let sourceFilename;

            let currentAssumption: kt.graph.api_node.ApiNode;
            let dependentPos = [];


            parser.onopentag = (tag) => {
                if (tag.name == 'function') {
                    functionName = tag.attributes["name"];
                    sourceFilename = tag.attributes["cfilename"];
                }

                else if (tag.name == 'api-assumption' || tag.name == 'global-assumption' || tag.name == 'rv-assumption') {
                    currentAssumption = new kt.graph.api_node.ApiNode({});
                    currentAssumption.functionName = functionName;
                    currentAssumption.id = tag.attributes["nr"];

                    currentAssumption.file = sourceFilename;

                    if (tag.name == 'api-assumption') {
                        currentAssumption.type = "api";
                    }
                    else if (tag.name == 'rv-assumption') {
                        currentAssumption.type = "rv";
                    }
                    else if (tag.name == 'global-assumption') {
                        currentAssumption.type = "global";
                    }
                }

                else if (tag.name == 'predicate') {
                    currentAssumption.predicateType = tag.attributes["tag"];
                }

                else if (tag.name == 'dependent-primary-proof-obligations') {
                    dependentPos = [];
                }

                else if (tag.name == 'po' && dependentPos) {
                    dependentPos.push(tag.attributes["id"]);
                }




            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'api-assumption' || tagName == 'global-assumption' || tagName == 'rv-assumption') {
                    ppos.push(currentAssumption);
                    currentAssumption = null;
                }
                else if (tagName == 'dependent-primary-proof-obligations') {
                    currentAssumption.dependentPos = dependentPos;
                    dependentPos == null;
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


        private readAndBindEvFiles(dirName: string, suffix: string, ppoMap: { [id: string]: kt.graph.po_node.PONode }): Promise<any> {
            const parser = this;
            let err: number = 0;
            return parser.readXmls(dirName, suffix, parser.parsePevXml).then(pevs => {
                let pevMap = _.indexBy(pevs, "key");
                console.info("total objects: " + pevs.length + " \t\ttotal unique keys: " + Object.keys(pevMap).length);

                for (let key in pevMap) {
                    // console.info(key);
                    let ppo = ppoMap[key];
                    if (ppo) {
                        ppo.discharge = pevMap[key];
                        if (ppo.state == "VIOLATION")
                            console.info(ppo);
                    } else {
                        console.warn((err++) + " no PO info for the key " + key);
                    }

                }

            });

        }



        public readFunctionsMap(dirName: string): Promise<{ [key: string]: Array<any> }> {
            const parser = this;
            let err: number = 0;
            return parser.readXmls(dirName, "_cfile.xml", parser.parseCfileXml).then(funcs => {
                let byNameMap = _.indexBy(funcs, 'name');
                console.info("total objects: " + funcs.length + " \t\ttotal unique keys: " + Object.keys(byNameMap).length);
                // console.info(byNameMap);

                let resultingMap: { [key: string]: Array<any> } = {};
                for (let f of funcs) {
                    if (!resultingMap[f.name]) {
                        resultingMap[f.name] = [];
                    }
                    resultingMap[f.name].push(f);
                }
                return resultingMap;
            });

        }

        private bindCallsiteFunctions(spos: Array<kt.graph.po_node.PONode>, functionsMap: { [key: string]: Array<any> }) {
            for (let spo of spos) {
                let funcs = functionsMap[spo.callsiteFname];
                if (funcs.length > 1) {
                    console.error("ambigous fname");
                    console.error(funcs);
                } else {
                    spo.callsiteFileName = funcs[0].file;
                }
            }
        }

        public readDir(dirName: string, functionsMap: { [key: string]: Array<any> }): Promise<any> {
            // this.readPPOs(dirName);
            const parser = this;
            let spoMap;
            let ppoMap;
            let apiMap;

            return Promise.all([
                /*[0]*/
                parser.readXmls(dirName, "_ppo.xml", parser.parsePpoXml)
                    .then(ppos => {
                        ppoMap = _.indexBy(ppos, "key");
                        return parser.readAndBindEvFiles(dirName, "_pev.xml", ppoMap);
                    }),

                /*[1]*/
                parser.readXmls(dirName, "_spo.xml", parser.parseSpoXml)
                    .then(spos => {
                        spoMap = _.indexBy(spos, "key");
                        parser.readAndBindEvFiles(dirName, "_sev.xml", spoMap);
                        parser.bindCallsiteFunctions(spos, functionsMap);
                    })

            ]).then(results => {

                return parser.readXmls(dirName, "_api.xml", parser.parseApiXml).then(apis => {
                    apiMap = _.indexBy(apis, "key");

                    /**
                        link assumptions dependencies
                    */
                    for (let api of apis) {
                        for (let refId of api.dependentPos) {
                            let refKey = kt.graph.po_node.makeKey(refId, api.functionName, api.file);
                            let po = ppoMap[refKey];
                            if (!po) {
                                po = spoMap[refKey];
                            }
                            if (!po) {
                                console.error("api-assumption " + api.key + " refers missing(or discharged) PO " + refKey);
                            } else {
                                api.addOutput(po);
                            }
                        }
                    }

                    /**
                        link SPO apis
                    */
                    for (let spoKey in spoMap) {
                        let spo = spoMap[spoKey];
                        // console.info(spoKey + " --> " + spo.apiKey);
                        let api = apiMap[spo.apiKey];
                        if (api) {
                            spo.addOutput(api);
                        } else {
                            console.error("SPO " + spo.key + " refers missing api-assumption " + spo.apiKey);
                        }

                    }


                    /**
                        link DISCHARGE apis
                    */

                    this.bindDischargeAssumptions(spoMap, apiMap);
                    this.bindDischargeAssumptions(ppoMap, apiMap);


                });

            }).then(results => {
                console.info("total SPO unique keys: " + Object.keys(spoMap).length);
                console.info("total PPO unique keys: " + Object.keys(ppoMap).length);
                console.info("total API unique keys: " + Object.keys(apiMap).length);
                console.info("reading " + dirName + " DONE");
            });
        }

        private bindDischargeAssumptions(
                spoMap: { [key: string]: kt.graph.po_node.PONode },
                apiMap: { [key: string]: kt.graph.api_node.ApiNode }) {
                    
            for (let spoKey in spoMap) {
                let spo = spoMap[spoKey];
                let dischargeApiKey = spo.dischargeApiKey;
                if (dischargeApiKey) {
                    let api = apiMap[dischargeApiKey];
                    if (api) {
                        spo.addOutput(api);//XXX: Input? or Output?
                    } else {
                        console.error("SPO " + spo.key + " refers missing discharge assumption " + dischargeApiKey);
                    }
                }


            }
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
        // reader.readDir(paths[0]);
        reader.readFunctionsMap(path.dirname(paths[0])).then(
            funcs => {
                reader.readDir(paths[0], funcs);
            }
        );

    }
}
