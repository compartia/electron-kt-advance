module kt.model {
    const path = require('path');

    export const PoLevels = ["primary", "secondary"];
    export enum Complexitiy { P, C, G };
    export enum PoStatesExt { violation, open, discharged, global, invariants, ds, rv, api };
    export enum PoStates { violation, open, discharged, assumption };

    export enum PoDischargeTypes { global, invariants, ds, rv, api, default };

    export const PoDischargeTypesArr: Array<string> = ["global", "invariants", "ds", "rv", "api", "default"];
    export const PoStatesArr: Array<PoStates> = [PoStates.violation, PoStates.open, PoStates.discharged];
    export const PoStatesNames: Array<string> = [PoStates[PoStates.violation], PoStates[PoStates.open], PoStates[PoStates.discharged], PoStates[PoStates.assumption]];


    const SPL = "/";

    export function sortNodes(nodes: AbstractNode[]) {
        return _.sortByOrder(nodes, ['file', 'functionName', 'state', 'dischargeTypeIndex', 'predicate'], ['asc', 'asc', 'asc', 'asc', 'asc']);
    }

    export function sortPoNodes(nodes: ProofObligation[]): Array<ProofObligation> {
        return _.sortByOrder(nodes, ['file', 'functionName', 'state', 'dischargeTypeIndex', 'predicate'], ['asc', 'asc', 'asc', 'asc', 'asc']);
    }


    export function makeGraphNodePath(filter: Globals.Filter, settings: Globals.GraphSettings, func: xml.CFunction, predicate: string, name: string): string {
        let pathParts: string[] = [];

        let fileBaseName: string = path.basename(func.fileInfo.relativePath);

        let addFile: boolean = !filter.file || (func.fileInfo.relativePath != filter.file.relativePath);
        let addFunction: boolean = !filter.cfunction || func.name != filter.cfunction.name;
        let addPredicate: boolean = predicate != filter.singlePredicate;

        if (settings.groupBy === Globals.GraphGrouppingOptions.file) {
            if (addFile) {
                pathParts.push(fileBaseName);
            }
            if (addFunction) {
                pathParts.push(func.name);
            }
            if (addPredicate) {
                pathParts.push(predicate);
            }
        } else {
            //same but different order
            if (addPredicate) {
                pathParts.push(predicate);
            }
            if (addFile) {
                pathParts.push(fileBaseName);
            }
            if (addFunction) {
                pathParts.push(func.name);
            }
        }

        pathParts.push(name);

        return pathParts.join(SPL);
    }


    export function compareStates(stateA: string, stateB: string): number {
        let stA: string[] = stateA.toLowerCase().split("-");
        let stB: string[] = stateB.toLowerCase().split("-");

        let delta1 = PoStatesExt[stA[0]] - PoStatesExt[stB[0]];
        if (delta1 == 0) {
            return PoStatesExt[stA[1]] - PoStatesExt[stB[1]];
        } else
            return delta1;
    }

    export function getLocationPath(node: tf.graph.proto.NodeDef): string {
        if (node) {
            if (node.attr) {
                //leaf node
                return node.attr["locationPath"];
            } else {
                let ret = node.name;
                if ((<any>node).parentNode) {
                    let parent = (<any>node).parentNode;
                    if (parent.parentNode != null) //do not addd _root_
                        ret = parent.name + "/" + ret;
                }
                return ret;
            }
        }
        return "";
    }

    export function makeKey(id: string, functionName: string, file: string): string {
        return id + "::" + functionName + "::" + file;
    }

    export function getPredicate(node: tf.graph.proto.NodeDef): string {

        if (node) {
            if (node.attr) {
                //leaf node
                return node.attr["predicate"];
            } else {
                //XXX:
                //group node
            }
        }
        return null;
    }

    class POId {
        id: string;
        private _сfunction: xml.CFunction = new xml.CFunction();

        get cfunction(): xml.CFunction {
            return this._сfunction;
        }

        set cfunction(func: xml.CFunction) {
            this._сfunction = func;
        }

        get file(): string {
            return this._сfunction.file;
        }

        get functionName(): string {
            return this._сfunction.name;
        }

        set functionName(functionName: string) {
            this._сfunction.name = functionName;
        }

        set file(f: string) {
            if (f)
                this._сfunction.file = path.normalize(f);
            else
                this._сfunction.file = f;
        }

        get key(): string {
            return makeKey(this.id, this.functionName, this.file);
        }
    }

    export class POLocation {
        textRange: number[][];

        get line():number {
            if (this.textRange) {
                return this.textRange[0][0];
            } else {
                return 0;
            }

        }
    }
    export abstract class AbstractNode extends POId {
        inputs: AbstractNode[];
        outputs: AbstractNode[];
        location: POLocation = new POLocation();
        symbol: xml.Symbol;

        constructor() {
            super();
            this.inputs = [];
            this.outputs = [];
        }

        get predicateArgument(): string {
            if (this.symbol) {
                if (this.symbol.type == xml.SymbolType.ID) {
                    return this.symbol.value;
                } else {
                    return '"' + this.symbol.value + '"';
                }
            } else {
                return null;
            }
        }

        public addInput(node: AbstractNode): boolean {
            if (_.includes(this.outputs, node)) {
                console.error(node.key + " is already among of ouputs of this " + this.key);
            }

            if (!_.includes(this.inputs, node)) {
                this.inputs.push(node);
                return true;
            } else {
                return false;
            }

        }

        public addOutput(node: AbstractNode): boolean {
            if (_.includes(this.inputs, node)) {
                console.error(node.key + " is already among of inputs of this " + this.key);
            }

            if (!_.includes(this.outputs, node)) {
                this.outputs.push(node);
                return true;
            } else {
                return false;
            }
        }

        public isLinked(): boolean {
            return this.inputs.length > 0 || this.outputs.length > 0;
        }

        public abstract isDischarged(): boolean;
        public abstract get state(): PoStates;

        get stateName() {
            return PoStates[this.state];
        }

        public abstract makeName(filter: Globals.Filter, settings: Globals.GraphSettings): string;


        public isTotallyDischarged(): boolean {
            if (!this.isDischarged()) {
                return false;
            }

            for (let ref of this.inputs) {
                if (!ref.isDischarged()) {
                    return false;
                }
            }

            for (let ref of this.outputs) {
                if (!ref.isDischarged()) {
                    return false;
                }
            }


            return true;
        }



    }

    export class PODischarge extends POId {

        evidence: {
            comment: string
        };
        method: string;
        type: string;
        assumptions: Array<any>;
        violation: boolean = false;

        constructor() {
            super();
        }

        get message() {
            if (this.evidence) return this.evidence.comment;
            return "";
        }

        get liftingType() {
            let dischargeType;

            if (this.assumptions && this.assumptions.length > 0) {
                let type: string = this.assumptions[0].type;
                dischargeType = type.toUpperCase();
            } else if (this.method == "invariants") {
                dischargeType = this.method.toUpperCase();
            }

            return dischargeType;
        }


    }

    export class ProofObligation extends AbstractNode {
        name: string;
        po: any;
        predicate: string;
        expression: string;
        _level: string;

        isMissing: boolean;

        _discharge: PODischarge;

        callsiteFname: string;
        private _callsiteFileName: string;

        private _apiId: string = null;

        complexity: number[] = [0, 0, 0];

        get line(): number {
            return this.location.line;
        }

        get callsiteFileName() {
            return this._callsiteFileName;
        }

        set callsiteFileName(f: string) {
            if (f)
                this._callsiteFileName = path.normalize(f);
            else
                this._callsiteFileName = f;
        }

        get apiFileName(): string {
            if (this.callsiteFileName && this.callsiteFname) {
                let dir = path.dirname(this.callsiteFileName);
                let basename = path.basename(this.callsiteFileName);
                let ext = path.extname(basename);
                let filenameTrunc = basename.substring(0, basename.length - ext.length);
                return path.join(dir, path.join(filenameTrunc, filenameTrunc + "_" + this.callsiteFname));
            } else {
                return null;
            }

        }


        constructor(po, isMissing: boolean = false) {
            super();
            this.po = po;
            this.isMissing = isMissing;

            this._apiId = po["apiId"];
            this.level = po["level"];
            this.symbol = po["symbol"];
            this.expression = po["expression"];

            // this.inputs = [];
            // this.outputs = [];

            this.predicate = po["predicateType"];
            this.file = po["file"];
            this.functionName = po["functionName"];
            this.callsiteFname = po["callsiteFname"];
            this.callsiteFileName = po["callsiteFileName"];

            this.location.textRange = po["textRange"];

            this.id = po["id"];


            this.complexity[Complexitiy.C] = util.zeroIfNull(po["complexityC"]);
            this.complexity[Complexitiy.P] = util.zeroIfNull(po["complexityP"]);
            this.complexity[Complexitiy.G] = util.zeroIfNull(po["complexityG"]);

        }

        set level(level: string) {
            this._level = level;
        }

        get level(): string {
            return this._level;
        }

        get levelLabel(): string {
            if ("secondary" == this._level) {
                return "II";
            } else {
                return "I";
            }
        }

        get apiKey(): string {
            return model.makeAssumptionKey("api", this._apiId, this.callsiteFname, this.callsiteFileName);
        }

        get dischargeApiKey(): string {
            if (this._discharge && this._discharge.assumptions) {
                if (this._discharge.assumptions.length > 0) {
                    let usedAssumption = this._discharge.assumptions[0];
                    return model.makeAssumptionKey(usedAssumption.type, usedAssumption.apiId, this.functionName, this.file);
                }
            }
            return null;

        }

        get discharge(): PODischarge {
            return this._discharge;
        }

        set discharge(discharge: PODischarge) {
            this._discharge = discharge;
        }

        get state(): PoStates {
            if (this._discharge) {
                if (this._discharge.violation) {
                    return PoStates.violation;
                } else {
                    return PoStates.discharged;
                }
            } else {
                return PoStates.open;
            }
        }

        public isDischarged(): boolean {
            return this.discharge && !this.discharge.violation;
        }

        public isViolation(): boolean {
            return this.state === PoStates.violation;
        }


        get dischargeType(): string {
            if (this.discharge) {
                return this.discharge.liftingType;
            }
            else
                return null;
        }

        get dischargeTypeIndex(): number {
            let dt: string = this.dischargeType;
            if (dt)
                return PoDischargeTypes[dt.toLowerCase()];
            else
                return -1;
        }


        get extendedState(): string {
            let stateExt = this.dischargeType;
            if (!stateExt) {
                stateExt = "default";
            }

            return PoStates[this.state] + "-" + stateExt;
        }

        get dischargeAssumption() {
            let po = this.po;
            let discharge = this._discharge ? this._discharge : po["discharge"];

            if (discharge) {
                if (discharge.assumptions && discharge.assumptions.length > 0) {
                    return discharge.assumptions[0];
                }
            }
            return { "type": undefined, "apiId": undefined };
        }


        public isLinked(): boolean {
            return this.inputs.length > 0 || this.outputs.length > 0;
        }


        public makeName(filter: Globals.Filter, settings: Globals.GraphSettings): string {
            let nm = this.levelLabel + "(" + this.id + ")";

            if (this.symbol) {
                nm += this.symbol.pathLabel;
            } else {
                nm += "-expression-";
            }


            return makeGraphNodePath(filter, settings, this.cfunction, this.predicate, nm);
        }


        get label(): string {
            let _nm = this.levelLabel + " (" + this.id + ") ";

            if (this.symbol) {
                _nm += this.symbol.pathLabel;
            } else {
                _nm += "-expression-";
            }

            return _nm;
        }



        set apiId(theApiId: string) {
            if (this._apiId) {
                if (this._apiId != theApiId) {
                    console.error("had apiId = " + this._apiId + " got new one:" + theApiId);
                }
            }
            this._apiId = theApiId;
        }

        get apiId(): string {
            return this._apiId;
        }

        public asNodeDef(filter: Globals.Filter, settings: Globals.GraphSettings): tf.graph.proto.NodeDef {
            const po = this.po;


            let nodeDef: tf.graph.proto.NodeDef = {
                name: this.makeName(filter, settings),
                input: [],
                output: [],
                device: this.extendedState,
                op: this.functionName,
                attr: {
                    // "html": poRef2html(po),
                    "label": this.label,
                    "apiId": this.apiId,
                    "predicate": this.predicate,
                    "level": this.level,
                    "state": PoStates[this.state],
                    "location": this.location,
                    "symbol": this.symbol,
                    "expression": this.expression,
                    "dischargeType": this.dischargeType,
                    "discharge": this.discharge, //? po["discharge"]["comment"] : null
                    "dischargeAssumption": this.dischargeAssumption,
                    "locationPath": this.file + SPL + this.functionName
                }
            }

            for (let ref of sortNodes(this.inputs)) {
                nodeDef.input.push(ref.makeName(filter, settings));

            }

            for (let ref of sortNodes(this.outputs)) {
                nodeDef.output.push(ref.makeName(filter, settings));
            }

            return nodeDef;
        }



    }
}
