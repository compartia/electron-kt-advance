import {
    FileInfo, ProofObligation, AbstractNode,
    Symbol, PoStates, PODischarge, POLocation, ApiNode, FunctionCalls, CFunction, sortPoNodes, Graphable
} from '../common/xmltypes';


import { NodeDef } from '../tf_graph_common/lib/proto'
import { Filter } from '../common/filter'
import { GraphSettings } from '../common/globals'

import { XmlReader } from './xmlreader';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { CAnalysis, CApplication } from '../common/xmltypes';

import * as kt_fs from '../common/fstools';
import { normalize } from 'path';

const path = require('path');
const fs = require('fs');


interface JPoLink {
    file: string;
    functionName: string;
    id: number;
}

function linkKey(link: JPoLink | ProofObligation): string {
    return link.file + "/" + link.functionName + "/" + link.id;
}

interface JPPO {
    dep: string;
    evl: string;
    exp: string;
    id: number;
    line: number;
    prd: string;
    sts: string;
    links: JPoLink[];
}

interface JCallsite {
    spos: JSPO[];
}

interface JSPO extends JPPO {

}

interface JAssumption {

}

interface JApi {
    aa: JAssumption[]
}

interface JFunc {
    name: string;
    ppos: JPPO[];
    callsites: JCallsite[];
    api: JApi;
}
interface JFile {
    name: string;
    functions: JFunc[];
}

interface JApp {
    sourceDir: string;
    files: JFile[];
}

interface KtJson {
    basedir: string;
    apps: JApp[];
}

abstract class AbstractPO implements ProofObligation {
    links: JPoLink[];

    indexer: CAnalysisImpl;

    public constructor(ppo: JPPO, cfun: CFunction, indexer: CAnalysisImpl) {
        this.indexer = indexer;

        const state = ppo.sts == "safe" ? "discharged" : ppo.sts;
        this.cfunction = cfun;
        this.predicate = ppo.prd;
        this.state = PoStates[state];
        this.extendedState = state + "-default";
        this.expression = ppo.exp;
        this.location = {
            line: ppo.line
        }
        this.discharge = <PODischarge>{
            message: ppo.evl
        };

        this.id = "" + ppo.id;
        //
        this.links = ppo.links;


    }

    get inputs() {
        return null;
        //  throw "unimplemented";
    }

    get linkedNodes(): Graphable[] {
        let ret = [];

        this.links && this.links.forEach(link => {
            let key = linkKey(link);
            let node: ProofObligation = this.indexer.getByIndex(key);
            if (node) {
                ret.push(node);
            } else {
                console.error("can not find " + key + " in index");
            }
        });

        return ret;

    }

    isViolation(): boolean {
        return true;
    }

    isDischarged(): boolean {
        return false;
    }

    name: string;
    predicate: string;
    expression: string;
    callsiteFname: string;

    extendedState: string;
    dischargeType: string;

    label: "label";
    discharge: PODischarge;
    apiId: string;
    state: PoStates;//XXX
    outputs: AbstractNode[];

    location: POLocation;
    symbol: Symbol;

    isLinked(): boolean {
        return this.links && (this.links.length > 0);
    }

    id: string;
    cfunction: CFunction;

    get file() {
        return this.cfunction.file;
    }

    get line(): number {
        return this.location.line;
    }
    get functionName() {
        return this.cfunction.name;
    }

    get level() {
        return "unknown";
    }

    get levelLabel(): string {
        throw "not implemented";
    }


    public getGraphKey(filter: Filter, settings: GraphSettings): string {
        let nm = this.levelLabel + "(" + this.id + ")";

        if (this.symbol) {
            nm += this.symbol.pathLabel;
        } else {
            nm += "-expression-";
        }

        let pathParts: string[] = [];

        let fileBaseName: string = path.basename(this.cfunction.fileInfo.relativePath);
        pathParts.push(fileBaseName);
        pathParts.push(this.cfunction.name);
        pathParts.push(this.predicate);

        pathParts.push(nm);

        //return makeGraphNodePath(filter, settings, this.cfunction, this.predicate, nm);
        return pathParts.join('/');

    }

    public toNodeDef(filter: Filter, settings: GraphSettings): NodeDef {

        let nodeDef: NodeDef = {
            name: this.getGraphKey(filter, settings),
            input: [],
            output: [],
            device: this.extendedState,
            op: this.functionName,
            attr: {
                "label": this.label,
                "apiId": this.apiId,
                "predicate": this.predicate,
                "level": this.level,
                "state": PoStates[this.state],
                "location": this.location,
                "symbol": this.symbol,
                "expression": this.expression,
                "dischargeType": this.dischargeType,
                "discharge": this.discharge,
                //"dischargeAssumption": po.dischargeAssumption,
                "locationPath": this.file + "/" + this.functionName,
                "data": this
            }
        }

        this.linkedNodes.forEach(node=>{
            nodeDef.input.push(node.getGraphKey(filter, settings));
        })

        // this.links && this.links.forEach(link => {
        //     const key = linkKey(link);
        //     let node: ProofObligation = this.indexer.getByIndex(key);
        //     if (node) {
        //         nodeDef.input.push(node.getGraphKey(filter, settings));
        //     } else {
        //         console.error("can not find " + key + " in index");
        //     }
        // });

        return nodeDef;
    }
}
class SPOImpl extends AbstractPO {
    get level(): string {
        return "secondary";
    }
    get levelLabel(): string {
        return "II";
    }
}

class PPOImpl extends AbstractPO {
    get level(): string {
        return "primary";
    }
    get levelLabel(): string {
        return "I";
    }
}

export class CAnalysisImpl implements CAnalysis {
    apps = [];
    _proofObligations = [];
    appByDirMap = {};
    functionByFile = {};

    poIndex: { [key: string]: ProofObligation } = {};


    public pushPo(po: ProofObligation): string {
        this.proofObligations.push(po);

        let index = linkKey(po);//this.indexOf(po, po.file, po.functionName);
        this.poIndex[index] = po;
        return index;
    }

    public getByIndex(index: string): ProofObligation {
        return this.poIndex[index];
    }


    public get proofObligations() {
        return this._proofObligations;
    }
}

export class CAnalysisJsonReaderImpl implements XmlReader {

    projectDir: string;
    result: CAnalysisImpl;

    public readDir(dir: string, tracker: ProgressTracker): CAnalysis {

        this.projectDir = dir;
        let files: string[] = kt_fs.listFilesRecursively(dir, ".kt.analysis.json");

        this.result = new CAnalysisImpl();


        files.forEach(file => {
            console.log(file);
            try {
                const json = <KtJson>JSON.parse(fs.readFileSync(file));
                this.mergeJsonData(json);
            }
            catch (e) {
                console.error("cannot parse " + file);
                console.error(e);
            }
            tracker.updateProgress(100);

        });
        return this.result;
    }

    private mergeJsonData(data: KtJson): void {
        data.apps.forEach(app => {
            console.log("source dir:" + app.sourceDir);

            app.files.forEach(file => {

                let absPath = path.normalize(path.join(app.sourceDir, file.name));
                let relative = path.relative(this.projectDir, absPath);
                this.result.functionByFile[relative] = this.toCFuncArray(file.functions, file, app.sourceDir);

            });
        });
    }

    private normalizeSourcePath(base: string, file: string): string {
        let abs = path.normalize(path.join(base, file));
        let relative = path.relative(this.projectDir, abs);
        return relative;
    }

    normalizeLinks(links: JPoLink[], base: string): JPoLink[] {
        if (links) {
            for (let link of links) {
                link.file = this.normalizeSourcePath(base, link.file);
            }
        }
        return links;
    }

    private toCFuncArray(functions: JFunc[], file: JFile, sourceDir: string): CFunction[] {
        const ret: CFunction[] = [];
        let relative = this.normalizeSourcePath(sourceDir, file.name);

        functions && functions.forEach(fun => {
            const cfun: CFunction = {
                name: fun.name,
                file: relative,
                fileInfo: <FileInfo>{
                    relativePath: relative
                },
                funcLocation: {
                    line: 0
                },
                line: 0
            }

            ret.push(cfun);

            fun.ppos && fun.ppos.forEach(ppo => {
                const mPPOImpl: PPOImpl = new PPOImpl(ppo, cfun, this.result);
                mPPOImpl.links = this.normalizeLinks(ppo.links, sourceDir);
                this.result.pushPo(mPPOImpl);
            });


            fun.callsites && fun.callsites.forEach(callsite => {

                callsite.spos && callsite.spos.forEach(spo => {
                    const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, this.result);
                    mSPOImpl.links = this.normalizeLinks(spo.links, sourceDir);
                    this.result.pushPo(mSPOImpl);
                });

            });

        });

        return ret;
    }
}
