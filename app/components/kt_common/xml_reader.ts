module kt.xml {
    const fs = require('fs');
    const path = require('path');
    const sax = require('sax')



    export class XmlReader {


        public parseCfileXml(filename: string): Promise<Array<kt.xml.CFunction>> {

            let strict = true;
            let parser = sax.createStream(strict);
            console.log("reading " + filename);
            //////

            let functionsScope: boolean;

            let functions = new Array<kt.xml.CFunction>();

            let func;

            parser.onopentag = (tag) => {
                if (tag.name == 'functions') {
                    functionsScope = true;
                }
                else {

                    if (functionsScope) {
                        if (tag.name == 'gfun') {
                            func = new kt.xml.CFunction();
                        }

                        else if (tag.name == 'svar') {
                            func = new kt.xml.CFunction();
                            func.name = tag.attributes["vname"];
                        }

                        else if (tag.name == 'loc') {
                            func.file = tag.attributes["file"];
                            func.line = tag.attributes["line"];
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



        public parsePpoXml(filename: string): Promise<Array<kt.graph.PONode>> {

            let ppos = new Array<kt.graph.PONode>();

            let strict = true;
            let parser = sax.createStream(strict);
            let functionName;
            let predicateXmlParser: kt.xml.PredicateXmlParser = null;
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
                    predicateXmlParser = new kt.xml.PredicateXmlParser();
                    predicateXmlParser.onopentag(tag);
                    currentPo["predicateType"] = tag.attributes["tag"]; //XXX: remove this tag
                }


                else if (predicateXmlParser != null) {
                    predicateXmlParser.onopentag(tag);
                }

            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'proof-obligation') {
                    // currentPo["referenceKey"] = currentPo["id"] + "::" + currentPo["functionName"] + "::" + currentPo["file"];
                    let ppoNode = new kt.graph.PONode(currentPo);
                    ppos.push(ppoNode);
                }
                else if (tagName == "predicate") {
                    predicateXmlParser.onclosetag(tagName);
                    currentPo["symbol"] = predicateXmlParser.result.varName;
                    currentPo["expression"] = predicateXmlParser.result.expression;
                    predicateXmlParser = null;
                }

                else if (predicateXmlParser) {
                    predicateXmlParser.onclosetag(tagName);
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



        public parseSpoXml(filename: string): Promise<Array<kt.graph.PONode>> {


            let spos = new Array<kt.graph.PONode>();

            let strict = true;
            let parser = sax.createStream(strict);

            let functionName;
            let currentSpo = {}
            let callsiteObligation = {}
            let lasttag = '';

            let predicateXmlParser: kt.xml.PredicateXmlParser = null;


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
                    predicateXmlParser = new kt.xml.PredicateXmlParser();
                    predicateXmlParser.onopentag(tag);
                    currentSpo["predicateType"] = tag.attributes["tag"];
                }

                else if (predicateXmlParser != null) {
                    predicateXmlParser.onopentag(tag);
                }


                lasttag = tag.name;

            };

            parser.onclosetag = (tagName: string) => {
                if (tagName == 'obligation') {
                    // currentPo["referenceKey"] = currentPo["id"] + "::" + currentPo["functionName"] + "::" + currentPo["file"];
                    let ppoNode = new kt.graph.PONode(currentSpo);
                    spos.push(ppoNode);
                } else if (tagName == 'callsite-obligation') {
                    callsiteObligation = null;
                }
                else if (tagName == "predicate") {
                    predicateXmlParser.onclosetag(tagName);
                    currentSpo["symbol"] = predicateXmlParser.result.varName;
                    currentSpo["expression"] = predicateXmlParser.result.expression;
                    predicateXmlParser = null;
                }
                else if (predicateXmlParser) {
                    predicateXmlParser.onclosetag(tagName);
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



        public parsePevXml(filename: string): Promise<Array<kt.graph.PODischarge>> {

            let ppos = new Array<kt.graph.PODischarge>();

            let strict = true;
            let parser = sax.createStream(strict);
            let functionName;
            let sourceFilename;

            let currentPo: kt.graph.PODischarge;


            parser.onopentag = (tag) => {
                if (tag.name == 'function') {
                    functionName = tag.attributes["name"];
                    // console.log(functionName);
                }

                else if (tag.name == 'discharged') {
                    currentPo = new kt.graph.PODischarge();
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



        public parseApiXml(filename: string): Promise<Array<kt.graph.ApiNode>> {

            let ppos = new Array<kt.graph.ApiNode>();

            let strict = true;
            let parser = sax.createStream(strict);

            let functionName;
            let sourceFilename;

            let currentAssumption: kt.graph.ApiNode;
            let dependentPos = [];

            let predicateXmlParser: kt.xml.PredicateXmlParser;


            parser.onopentag = (tag) => {
                if (tag.name == 'function') {
                    functionName = tag.attributes["name"];
                    sourceFilename = tag.attributes["cfilename"];
                }

                else if (tag.name == 'api-assumption' || tag.name == 'global-assumption' || tag.name == 'rv-assumption') {
                    currentAssumption = new kt.graph.ApiNode({});
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
                    predicateXmlParser = new kt.xml.PredicateXmlParser();
                    predicateXmlParser.onopentag(tag);
                }

                else if (tag.name == 'dependent-primary-proof-obligations') {
                    dependentPos = [];
                }

                else if (tag.name == 'po' && dependentPos) {
                    dependentPos.push(tag.attributes["id"]);
                }

                else if (predicateXmlParser != null) {
                    predicateXmlParser.onopentag(tag);
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
                else if (tagName == "predicate") {
                    predicateXmlParser.onclosetag(tagName);
                    currentAssumption.symbol = predicateXmlParser.result.varName;
                    currentAssumption.expression = predicateXmlParser.result.expression;
                    predicateXmlParser = null;
                }
                else if (predicateXmlParser) {
                    predicateXmlParser.onclosetag(tagName);
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


        private readAndBindEvFiles(dirName: string, suffix: string, ppoMap: { [id: string]: kt.graph.PONode }, tracker: tf.ProgressTracker): Promise<any> {
            const parser = this;
            let err: number = 0;
            return parser.readXmls(dirName, suffix, parser.parsePevXml, tracker).then(pevs => {
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



        public readFunctionsMap(dirName: string, tracker: tf.ProgressTracker): Promise<{ [key: string]: Array<kt.xml.CFunction> }> {
            const bigJobTrackingAddon: number = 80;
            const parser = this;
            let err: number = 0;

            return parser.readXmls(dirName, "_cfile.xml", parser.parseCfileXml, tracker)
                .then(funcs => {


                    let byNameMap = _.indexBy(funcs, 'name');
                    console.info("total functions: " + funcs.length + " \t\ttotal unique keys: " + Object.keys(byNameMap).length);
                    // console.info(byNameMap);

                    let resultingMap: { [key: string]: Array<kt.xml.CFunction> } = {};


                    for (let f of funcs) {
                        if (!resultingMap[f.name]) {
                            resultingMap[f.name] = [];
                        }
                        resultingMap[f.name].push(f);

                    }

                    return resultingMap;

                });

        }

        private bindCallsiteFunctions(spos: Array<kt.graph.PONode>, functionsMap: { [key: string]: Array<kt.xml.CFunction> }) {
            for (let spo of spos) {
                let funcs = functionsMap[spo.callsiteFname];
                if (funcs) {
                    if (funcs.length > 1) {
                        console.error("ambigous fname");
                        console.error(funcs);
                    } else {
                        spo.callsiteFileName = funcs[0].file;
                    }
                } else {
                    let m = "source file is unknow for the function name " + spo.callsiteFname;
                    console.error(m);
                    // throw m;
                }
            }
        }

        public readDir(dirName: string, functionsMap: { [key: string]: Array<any> }, tracker: tf.ProgressTracker): Promise<any> {
            // this.readPPOs(dirName);
            const parser = this;
            let spoMap;
            let ppoMap;
            let apiMap;

            const ppoTracker = tf.graph.util.getSubtaskTracker(tracker, 20, 'reading PPOs');
            const pevTracker = tf.graph.util.getSubtaskTracker(tracker, 20, 'reading PEVs');
            const spoTracker = tf.graph.util.getSubtaskTracker(tracker, 20, 'reading SPOs');
            const sevTracker = tf.graph.util.getSubtaskTracker(tracker, 20, 'reading SEVs');
            const apiTracker = tf.graph.util.getSubtaskTracker(tracker, 20, 'reading APIs');

            return Promise.all([
                /*[0]*/
                parser.readXmls(dirName, "_ppo.xml", parser.parsePpoXml, ppoTracker)
                    .then(ppos => {
                        ppoMap = _.indexBy(ppos, "key");
                        return parser.readAndBindEvFiles(dirName, "_pev.xml", ppoMap, pevTracker);
                    }),

                /*[1]*/
                parser.readXmls(dirName, "_spo.xml", parser.parseSpoXml, spoTracker)
                    .then(spos => {
                        spoMap = _.indexBy(spos, "key");
                        parser.readAndBindEvFiles(dirName, "_sev.xml", spoMap, sevTracker);
                        parser.bindCallsiteFunctions(spos, functionsMap);
                    })

            ]).then(results => {
                /**
                executed after ppo,spo,sev,pev files are read.
                */

                return parser.readXmls(dirName, "_api.xml", parser.parseApiXml, apiTracker)
                    .then(apis => {
                        apiMap = _.indexBy(apis, "key");

                        /**
                            link assumptions dependencies
                        */
                        parser.linkAssumptionsDeps(ppoMap, spoMap, apis);

                        /**
                            link SPO apis
                        */

                        parser.linkSpoApis(spoMap, apiMap);

                        /**
                            link DISCHARGE apis
                        */

                        parser.bindDischargeAssumptions(spoMap, apiMap);
                        parser.bindDischargeAssumptions(ppoMap, apiMap);

                        return {
                            "spoMap": spoMap,
                            "ppoMap": ppoMap,
                            "apiMap": apiMap
                        }


                    });

            }).then(results => {
                console.info("total SPO unique keys: " + Object.keys(results.spoMap).length);
                console.info("total PPO unique keys: " + Object.keys(results.ppoMap).length);
                console.info("total API unique keys: " + Object.keys(results.apiMap).length);
                console.info("reading " + dirName + " DONE");

                return results;
            });
        }

        private linkAssumptionsDeps(
            ppoMap: { [key: string]: kt.graph.PONode },
            spoMap: { [key: string]: kt.graph.PONode },
            apis: Array<kt.graph.ApiNode>) {

            for (let api of apis) {
                for (let refId of api.dependentPos) {
                    let refKey = kt.graph.makeKey(refId, api.functionName, api.file);
                    let po = ppoMap[refKey];
                    if (!po) {
                        po = spoMap[refKey];
                    }
                    if (!po) {
                        console.error("api-assumption " + api.key + " refers missing(or discharged) PO " + refKey);
                    } else {
                        po.addOutput(api);
                        api.addInput(po);
                    }
                }
            }

        }

        private linkSpoApis(
            spoMap: { [key: string]: kt.graph.PONode },
            apiMap: { [key: string]: kt.graph.ApiNode }) {

            for (let spoKey in spoMap) {
                let spo = spoMap[spoKey];
                // console.info(spoKey + " --> " + spo.apiKey);
                let api = apiMap[spo.apiKey];
                if (api) {
                    spo.addOutput(api);
                    api.addInput(spo);
                } else {
                    console.error("SPO " + spo.key + " refers missing api-assumption " + spo.apiKey);
                }

            }
        }

        private bindDischargeAssumptions(
            spoMap: { [key: string]: kt.graph.PONode },
            apiMap: { [key: string]: kt.graph.ApiNode }) {

            for (let spoKey in spoMap) {
                let spo = spoMap[spoKey];
                let dischargeApiKey = spo.dischargeApiKey;
                if (dischargeApiKey) {
                    let api = apiMap[dischargeApiKey];
                    if (api) {
                        spo.addOutput(api);//XXX: Input? or Output?
                        api.addInput(spo);
                    } else {
                        console.error("SPO " + spo.key + " refers missing discharge assumption " + dischargeApiKey);
                    }
                }


            }
        }


        /**
        reads all files ending with the given suffix in the given direcory. Parses them with provided parsingFunc param.
        The results are joined in the resulting array;
        TODO: might be better to return a map filename->Array<X>
        **/
        private readXmls<X>(
            dirName: string,
            suffixFilter: string,
            parsingFunc: (filename: string) => Promise<Array<X>>,
            tracker: tf.ProgressTracker): Promise<Array<X>> {

            let parser = this;

            tracker.setMessage("reading *" + suffixFilter + " files");

            let items = fs.readdirSync(dirName);

            let filesToParse = _.filter(items, (v: string) => v.endsWith(suffixFilter));
            filesToParse = _.map(filesToParse, (x) => path.join(dirName, x));

            return this.parseFiles(filesToParse, parsingFunc, tracker);

        }



        private parseFiles<X>(
            items: Array<string>,
            parsingFunc: (filename: string) => Promise<Array<X>>,
            tracker: tf.ProgressTracker): Promise<Array<X>> {

            return new Promise((resolve, reject) => {

                let pposPromisesArray = new Array<Promise<X[]>>();

                for (let item of items) {
                    let obj = parsingFunc(item);
                    pposPromisesArray.push(obj);
                }

                Promise.all(pposPromisesArray).then((arrayOfResults) => {
                    let flat: Array<X> = _.flatten(arrayOfResults);

                    console.info("parsed " + arrayOfResults.length + "  files, total objects: " + flat.length);
                    tracker.updateProgress(100);
                    resolve(flat);

                });



            });



        }



    }


}
