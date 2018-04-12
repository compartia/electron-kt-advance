import {
    FileInfo, ProofObligation, AbstractNode,
    Symbol, PoStates, PODischarge, POLocation, ApiNode, FunctionCalls, CFunction, sortPoNodes
} from '../common/xmltypes';

import { XmlReader } from './xmlreader';
import { ProgressTracker } from '../tf_graph_common/lib/common';
import { CAnalysis, CApplication } from '../common/xmltypes';

import * as kt_fs from '../common/fstools';

const path = require('path');
const fs = require('fs');

interface JPPO {
    dep: string;
    evl: string;
    exp: string;
    id: number;
    line: number;
    prd: string;
    sts: string;
}

interface JFunc {
    name: string;
    ppos: JPPO[];
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

class PPOImpl implements ProofObligation {

    public constructor(ppo: JPPO, cfun: CFunction) {
        const state = ppo.sts == "safe" ? "discharged" : ppo.sts;
        this.cfunction = cfun;
        this.predicate = ppo.prd;
        this.state = PoStates[state];
        this.extendedState=state+"-default";
        this.expression = ppo.exp;
        this.location = {
            line: ppo.line
        }
        this.discharge=<PODischarge>{
            message: ppo.evl
        };
        
        this.level = "primary";
        this.id = "" + ppo.id;
        //     dep: string;
        // evl: string;
        // exp: string;
        // id: number;



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
    level: "primary";
    label: "label";
    discharge: PODischarge;
    apiId: string;
    state: PoStates;//XXX
    inputs: AbstractNode[];
    outputs: AbstractNode[];
    location: POLocation;
    symbol: Symbol;
    isLinked(): boolean {
        return false;
    }
    id: string;
    cfunction: CFunction;
    get file() {
        return this.cfunction.file;
    }
    get line():number {
        return this.location.line;
    }
    get functionName() {
        return this.cfunction.name;
    }
    get levelLabel(): string {
        return "I";
    }
}


export class CAnalysisJsonReaderImpl implements XmlReader {

    projectDir: string;
    result: CAnalysis;
    public readDir(dir: string, tracker: ProgressTracker): CAnalysis {

        this.projectDir = dir;
        let files: string[] = kt_fs.listFilesRecursively(dir, ".kt.analysis.json");

        this.result = {
            apps: [],
            ppos: [],
            appByDirMap: {},
            functionByFile: {}
        };
        files.forEach(file => {
            const json = <KtJson>JSON.parse(fs.readFileSync(file));
            this.mergeJsonData(json);
            // tracker.updateProgress
        });
        return this.result;
    }

    private mergeJsonData(data: KtJson): void {
        data.apps.forEach(app => {

            console.log(app.sourceDir);

            app.files.forEach(file => {


                let abs = path.normalize(path.join(app.sourceDir, file.name));
                let relative = path.relative(this.projectDir, abs);
                console.log(relative);
                this.result.functionByFile[relative] = this.toCFuncArray(file.functions, file.name, app.sourceDir);
            });
        });
    }

    private toCFuncArray(functions: JFunc[], file: string, basedir: string): CFunction[] {
        const ret: CFunction[] = [];
        let abs = path.normalize(path.join(basedir, file));
        let relative = path.relative(this.projectDir, abs);

        functions.forEach(
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
                        const mPPOImpl: PPOImpl = new PPOImpl(ppo, cfun);
                        this.result.ppos.push(mPPOImpl);
                    }
                );
            }

        );
        return ret;
    }
}
