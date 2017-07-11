// import * as _ from "lodash"

import { CFunction, FunctionsMap } from "./xml_types"
import { PredicateXmlParser } from "./xml_parser_tools"
import { ProofObligation, PODischarge, makeKey } from "../model/po_node"
import { ApiNode } from "../model/api_node"
import { getChDir, listFilesRecursively } from "../common/fs"

import * as tf from '../tf_graph_common/lib/common'
import * as util from '../tf_graph_common/lib/util'


const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const sax = require('sax');


export class XmlAnalysis {
    ppos: Array<ProofObligation>;
    spos: Array<ProofObligation>;
    apis: { [key: string]: ApiNode };
}

function runParser<X>(parser, filename: string, resultingArray: Array<X>, tracker: tf.ProgressTracker): Promise<Array<X>> {

    return new Promise((resolve, reject) => {
        let stream = fs.createReadStream(filename);
        stream.pipe(parser);


        stream.on('error', (e) => {
            tracker.updateProgress(100);
            console.error(e);
            resolve([]);
        });

        stream.on('end', () => {
            tracker.updateProgress(100);
            resolve(resultingArray);
        });

    });

}


export class XmlReader {


    public parseCfileXml(filename: string, tracker: tf.ProgressTracker): Promise<Array<CFunction>> {

        let strict = true;
        let parser = sax.createStream(strict);
        console.debug("reading " + filename);
        //////

        let functionsScope: boolean;

        let functions = new Array<CFunction>();

        let func;

        parser.onopentag = (tag) => {
            if (tag.name == 'functions') {
                functionsScope = true;
            }
            else {

                if (functionsScope) {
                    if (tag.name == 'gfun') {
                        func = new CFunction();
                    }

                    else if (tag.name == 'svar') {
                        func = new CFunction();
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



        return runParser(parser, filename, functions, tracker);

    }



    private parsePpoXml(filename: string, tracker: tf.ProgressTracker): Promise<Array<ProofObligation>> {

        let ppos = new Array<ProofObligation>();

        let strict = true;
        let parser = sax.createStream(strict);
        let functionName;
        let predicateXmlParser: PredicateXmlParser = null;
        let currentPo = {}

        let header = {}


        parser.onopentag = (tag) => {
            if (tag.name == 'function') {
                functionName = tag.attributes["name"];
            }

            else if (tag.name == 'proof-obligation') {
                currentPo = {
                    "id": tag.attributes["id"],
                    "functionName": functionName,
                    "level": "primary",
                    "complexityP": tag.attributes["p-complexity"],
                    "complexityC": tag.attributes["c-complexity"],
                    "complexityG": tag.attributes["g-complexity"]
                }
            }

            else if (tag.name == 'location') {
                currentPo["file"] = tag.attributes["file"];
                let line: number = tag.attributes["line"];
                currentPo["textRange"] = [[line, 0], [line, 200]];
            }

            else if (tag.name == 'predicate') {
                predicateXmlParser = new PredicateXmlParser();
                predicateXmlParser.onopentag(tag);
                currentPo["predicateType"] = tag.attributes["tag"]; //XXX: remove this tag
            }


            else if (predicateXmlParser != null) {
                predicateXmlParser.onopentag(tag);
            }

        };

        parser.onclosetag = (tagName: string) => {
            if (tagName == 'proof-obligation') {
                let ppoNode = new ProofObligation(currentPo);
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


        return runParser(parser, filename, ppos, tracker);

    }



    private parseSpoXml(filename: string, tracker: tf.ProgressTracker): Promise<Array<ProofObligation>> {


        let spos = new Array<ProofObligation>();

        let strict = true;
        let parser = sax.createStream(strict);

        let functionName;
        let currentSpo = {}
        let callsiteObligation = {}
        let lasttag = '';

        let predicateXmlParser: PredicateXmlParser = null;


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
                    "level": "secondary",
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
                predicateXmlParser = new PredicateXmlParser();
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
                let ppoNode = new ProofObligation(currentSpo);
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



        return runParser(parser, filename, spos, tracker);

    }



    private parsePevXml(filename: string, tracker: tf.ProgressTracker): Promise<Array<PODischarge>> {

        let ppos = new Array<PODischarge>();

        let strict = true;
        let parser = sax.createStream(strict);
        let functionName;
        let sourceFilename;

        let currentPo: PODischarge;
        let header = {
            time: null
        }
        
        parser.onend = () => {
            for (let d of ppos){
                d.time=header.time;
            }
        };

        parser.onopentag = (tag) => {
            // <log-entry delta-checkvalid="26" delta-invariant="30" delta-lifted="2" time="01/09/2017 22:03:43"/>

            if (tag.name == 'function') {
                functionName = tag.attributes["name"];
            }
            
            // <header time="01/10/2017 06:52:38">...            
            else if (tag.name == 'header') {
                header.time = new Date(tag.attributes["time"]);
            }

            else if (tag.name == 'discharged') {
                currentPo = new PODischarge();
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



        return runParser(parser, filename, ppos, tracker);

    }

    // <rv-assumption communicated="yes" nr="4">
    //      <predicate op="pluspi" tag="ptr-upper-bound-deref">
    //       <typ ikind="iuchar" ttag="tint"/>
    //       <exp1 byte="72746" etag="fnapp" file="src/auth/password-scheme.c" line="592" xstr="fn(t_malloc)@ 592[_]">
    //        <arg/>
    //        <fn etag="lval" xstr="t_malloc">
    //         <lval>
    //          <lhost>
    //           <var vid="366" vname="t_malloc"/>
    //          </lhost>
    //         </lval>
    //        </fn>
    //       </exp1>
    //       <exp2 etag="const" xstr="18">
    //        <constant ctag="cint64" ikind="iint" intValue="18"/>
    //       </exp2>
    //      </predicate>
    //      <dependent-primary-proof-obligations>
    //       <po id="50"/>
    //      </dependent-primary-proof-obligations>
    //      <dependent-secondary-proof-obligations/>
    //     </rv-assumption>

    private parseApiXml(filename: string, tracker: tf.ProgressTracker): Promise<Array<ApiNode>> {

        let ppos = new Array<ApiNode>();

        let strict = true;
        let parser = sax.createStream(strict);

        let functionName;
        let sourceFilename;

        let currentAssumption: ApiNode;
        let dependentPos = [];

        let predicateXmlParser: PredicateXmlParser;


        parser.onopentag = (tag) => {
            if (tag.name == 'function') {
                functionName = tag.attributes["name"];
                sourceFilename = tag.attributes["cfilename"];
            }

            else if (tag.name == 'api-assumption' || tag.name == 'global-assumption' || tag.name == 'rv-assumption') {
                currentAssumption = new ApiNode();

                currentAssumption.file = sourceFilename;
                currentAssumption.functionName = functionName;

                currentAssumption.id = tag.attributes["nr"];

                if (tag.name == 'api-assumption') {
                    currentAssumption.type = "api";//XXX Use model.PoDischargeTypes enum
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
                predicateXmlParser = new PredicateXmlParser();
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
                currentAssumption.eLocation = predicateXmlParser.result.location;
                predicateXmlParser = null;
            }
            else if (predicateXmlParser) {
                predicateXmlParser.onclosetag(tagName);
            }
        }

        return runParser(parser, filename, ppos, tracker);

    }




    private readAndBindEvFiles(dirName: string, suffix: string, ppoMap: { [id: string]: ProofObligation }, tracker: tf.ProgressTracker): Promise<any> {
        const parser = this;
        let err: number = 0;

        return parser.readXmls(dirName, suffix, parser.parsePevXml, tracker).then(pevs => {
            let pevMap = _.indexBy(pevs, "key");
            console.info("total objects: " + pevs.length + " \t\ttotal unique keys: " + Object.keys(pevMap).length);

            let missing = [];
            for (let key in pevMap) {
                let ppo = ppoMap[key];
                if (ppo) {
                    ppo.discharge = pevMap[key];
                } else {
                    missing.push(key);
                    //console.warn((err++) + " no PO info for the key " + key);
                }

            }

            if (missing.length) {
                console.warn("readAndBindEvFiles: no PO info for some keys:");
                console.warn(missing);
            }

        });

    }

    public buildFunctionsByFileMap(funcs: CFunction[]): { [key: string]: Array<CFunction> } {
        let functionByFile: { [key: string]: Array<CFunction> } = {};
        for (let f of funcs) {
            if (!functionByFile[f.file]) {
                functionByFile[f.file] = [];
            }
            functionByFile[f.file].push(f);
        }

        return functionByFile;
    }


    public readFunctionsMap(dirName: string, tracker: tf.ProgressTracker): Promise<CFunction[]> {
        const parser = this;
        let err: number = 0;

        return parser.readXmls(dirName, "_cfile.xml", parser.parseCfileXml, tracker)
            .then((funcs: CFunction[]) => {
                return funcs;
            });

    }

    private bindCallsiteFunctions(spos: ProofObligation[], functionsMap: FunctionsMap) {
        var missing = [];
        var ambigous = {};

        for (let spo of spos) {
            let funcs: Array<CFunction> = functionsMap.findFuncs(spo.callsiteFname);
            if (funcs) {
                if (funcs.length > 1) {
                    ambigous[spo.callsiteFname] = funcs;
                }

                spo.callsiteFileName = funcs[0].fileInfo.relativePath;//XXX:

            } else {
                missing.push(spo.callsiteFname);
            }
        }

        if (missing.length) {
            console.warn("unknown source files for the folowing functions: ");
            console.warn(missing);
        }

        if (_.values(ambigous).length) {
            console.warn("cannot determine source file of the folowing functions: ");
            console.warn(ambigous);
        }

    }

    private listApiFiles(dirName: string, spoMap: { [key: string]: ProofObligation }): Array<string> {
        const suffixFilter = "_api.xml";
        let apiFiles = this.listFilesInDir(dirName, suffixFilter);

        let parentDir = getChDir(dirName);

        let linkedApiFilenames = _.uniq(_.map(_.values(spoMap), (v: ProofObligation) => v.apiFileName));
        linkedApiFilenames = _.filter(linkedApiFilenames, v => v != null);
        linkedApiFilenames = _.map(linkedApiFilenames, (v: string) => path.join(parentDir, v + suffixFilter));

        apiFiles = _.uniq(apiFiles.concat(linkedApiFilenames));

        return apiFiles;
    }

    private rebindCFunctions(apis: Array<ApiNode>, functionsMap: FunctionsMap) {
        for (let apiNode of apis) {
            apiNode.cfunction = functionsMap.findFunc(apiNode.file, apiNode.functionName);
        }
    }

    public readDir(dirName: string, functionsMap: FunctionsMap, tracker: tf.ProgressTracker): Promise<XmlAnalysis> {
        // this.readPPOs(dirName);
        const parser = this;
        let spoMap;
        let ppoMap;
        let apiMap;

        let ppoArr: Array<ProofObligation>;
        let spoArr: Array<ProofObligation>;

        const ppoTracker = util.getSubtaskTracker(tracker, 20, 'reading PPOs');
        const pevTracker = util.getSubtaskTracker(tracker, 20, 'reading PEVs');
        const spoTracker = util.getSubtaskTracker(tracker, 20, 'reading SPOs');
        const sevTracker = util.getSubtaskTracker(tracker, 20, 'reading SEVs');
        const apiTracker = util.getSubtaskTracker(tracker, 20, 'reading APIs');

        return Promise.all([
            /*[0]*/
            parser.readXmls(dirName, "_ppo.xml", parser.parsePpoXml, ppoTracker)
                .then(ppos => {
                    ppoArr = ppos;
                    ppoMap = _.indexBy(ppos, "key");
                    return parser.readAndBindEvFiles(dirName, "_pev.xml", ppoMap, pevTracker);
                }),

            /*[1]*/
            parser.readXmls(dirName, "_spo.xml", parser.parseSpoXml, spoTracker)
                .then(spos => {
                    spoArr = spos;
                    spoMap = _.indexBy(spos, "key");
                    parser.bindCallsiteFunctions(spos, functionsMap);
                    return parser.readAndBindEvFiles(dirName, "_sev.xml", spoMap, sevTracker);
                })

        ]).then(results => {


            /**
            executed after ppo,spo,sev,pev files are read.
            */
            let apiFiles = parser.listApiFiles(dirName, spoMap);

            let start = Date.now();
            return parser.parseFiles(apiFiles, parser.parseApiXml, apiTracker)
                .then(apis => {
                    parser.rebindCFunctions(apis, functionsMap);
                    apiMap = _.indexBy(apis, "key");

                    /**
                        link assumptions dependencies
                    */
                    util.time<void>('linkAssumptionsDeps', () => parser.linkAssumptionsDeps(ppoMap, spoMap, apis));

                    /**
                        link SPO apis
                    */
                    util.time<void>('linkSpoApis', () => parser.linkSpoApis(spoMap, apiMap));

                    let ret = new XmlAnalysis();
                    ret.apis = apiMap;
                    ret.spos = spoArr;
                    ret.ppos = ppoArr;

                    console.log("parsing *api files took ", ':', Date.now() - start, 'ms');

                    return ret;


                });

        }).then(results => {
            console.info("total SPO unique keys: " + spoArr.length);
            console.info("total PPO unique keys: " + ppoArr.length);
            console.info("total API unique keys: " + Object.keys(results.apis).length);
            console.info("reading " + dirName + " DONE");

            return results;
        });
    }

    private linkAssumptionsDeps(
        ppoMap: { [key: string]: ProofObligation },
        spoMap: { [key: string]: ProofObligation },
        apis: Array<ApiNode>): void {

        let missing = [];
        for (let api of apis) {
            for (let refId of api.dependentPos) {

                let refKey = makeKey(refId, api.functionName, api.file);
                let po = ppoMap[refKey];

                if (!po) {
                    //NO PPO: ok, let's try to find a SPO
                    po = spoMap[refKey];
                }
                if (!po) {
                    //WARN: collect warnings;
                    missing.push({ api: api, missing: refKey });
                } else {
                    po.addOutput(api);
                    api.addInput(po);
                }

            }
        }

        if (missing.length) {
            console.warn("some api-assumptions refer missing (or discharged) PO:");
            console.warn(missing);
        }

    }

    private linkSpoApis(
        spoMap: { [key: string]: ProofObligation },
        apiMap: { [key: string]: ApiNode }): void {

        let missing = [];
        for (let spoKey in spoMap) {
            let spo = spoMap[spoKey];
            let api = apiMap[spo.apiKey];
            if (api && api.type == "api") {
                spo.addInput(api);
                api.addOutput(spo);
            } else {
                //collect warnings
                missing.push({ spo: spo, "missing-api-assumption": spo.apiKey });
            }

        }

        if (missing.length) {
            console.warn("some SPOs refer missing api-assumptions");
            console.warn(missing);
        }
    }


    /**
    reads all files ending with the given suffix in the given direcory. Parses them with provided parsingFunc param.
    The results are joined in the resulting array;
    TODO: might be better to return a map filename->Array<X>
    **/
    public readXmls<X>(
        dirName: string,
        suffixFilter: string,
        parsingFunc: (filename: string, tracker: tf.ProgressTracker) => Promise<Array<X>>,
        tracker: tf.ProgressTracker): Promise<Array<X>> {

        tracker.setMessage("reading *" + suffixFilter + " files");
        const files = this.listFilesInDir(dirName, suffixFilter);
        if (files && files.length > 0) {
            return this.parseFiles(
                files,
                parsingFunc,
                tracker);
        } else {
            const errmsg = "no *" + suffixFilter + " files found in " + dirName;
            const err = new Error(errmsg);
            tracker.reportError(errmsg, err);
            throw err;
        }


    }

    private listFilesInDir(
        dirName: string,
        suffixFilter: string): Array<string> {

        let filesToParse = listFilesRecursively(dirName, suffixFilter);
        return filesToParse;
    }



    private parseFiles<X>(
        items: Array<string>,
        parsingFunc: (filename: string, tracker: tf.ProgressTracker) => Promise<Array<X>>,
        tracker: tf.ProgressTracker): Promise<X[]> {


        const pposPromisesArray = new Array<Promise<X[]>>();
        for (let item of items) {
            let subTracker = util.getSubtaskTracker(tracker, 100.0001 / items.length, item);
            let obj: Promise<X[]> = parsingFunc(item, subTracker);
            // obj.then((x)=>obj.);
            pposPromisesArray.push(obj);
        }

        const allDone: Promise<X[][]> = Promise.all(pposPromisesArray);

        const promiseToFlatten: Promise<X[]> = allDone.then(

            (arrayOfResults: X[][]) => {
                let flat: X[] = _.flatten(arrayOfResults);
                console.log("parsed " + arrayOfResults.length + "  files, total objects: " + flat.length);
                return flat;
            })


        return promiseToFlatten;




    }



}