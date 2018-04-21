import {
    FileInfo, ProofObligation, AbstractNode,
    Symbol, PoStates, PODischarge, POLocation, ApiNode, FunctionCalls, CFunction, sortPoNodes
} from '../common/xmltypes';

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

interface JFunc {
    name: string;
    ppos: JPPO[];
    callsites: JCallsite[];
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

    get inputs(): AbstractNode[] {
        let ret = [];
        if (this.links) {  
            for (let link of this.links) {
                let key = linkKey(link);
                let node: AbstractNode = this.indexer.getByIndex(key);
                if (node) {
                    ret.push(node);
                } else {
                    console.error("can not find " + key + " in index");
                }
            }            
        }
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
        return this.links && (this.links.length>0);
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

            console.log("source dir:"+app.sourceDir);

            app.files.forEach(file => {
                let absPath = path.normalize(path.join(app.sourceDir, file.name));
                let relative = path.relative(this.projectDir, absPath);
                // console.log(relative);
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
        if(links){
            for (let link of links) {
                link.file = this.normalizeSourcePath(base, link.file);
            }
        }
        return links;
    }

    private toCFuncArray(functions: JFunc[], file: JFile, sourceDir: string): CFunction[] {
        const ret: CFunction[] = [];
        // let abs = path.normalize(path.join(basedir, file.name));
        let relative = this.normalizeSourcePath(sourceDir, file.name);
        // path.relative(this.projectDir, abs);

        functions && functions.forEach(
            fun => {
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

                fun.ppos.forEach(
                    ppo => {
                        const mPPOImpl: PPOImpl = new PPOImpl(ppo, cfun, this.result);
                        mPPOImpl.links = this.normalizeLinks(ppo.links, this.projectDir);
                        this.result.pushPo(mPPOImpl);
                    }
                );


                if (fun.callsites) {
                    fun.callsites.forEach(
                        callsite => {

                            callsite.spos.forEach(
                                spo => {
                                    const mSPOImpl: SPOImpl = new SPOImpl(spo, cfun, this.result);
                                    mSPOImpl.links = this.normalizeLinks(spo.links, this.projectDir);
                                    this.result.pushPo(mSPOImpl);
                                }
                            );


                        }
                    );
                }

            }

        );
        return ret;
    }
}
