module kt.graph.po_node {

    export enum PoStatesExt { violation, open, discharged, global, invariants, ds, rv, api };
    export enum PoStates { violation, open, discharged, assumption };
    export enum PoDischargeTypes { global, invariants, ds, rv, api, default };

    const SPL = "/";

    export function compareStates(stateA: string, stateB: string): number {
        let stA: string[] = stateA.toLowerCase().split("-");
        let stB: string[] = stateB.toLowerCase().split("-");

        let delta1 = kt.graph.po_node.PoStatesExt[stA[0]] - kt.graph.po_node.PoStatesExt[stB[0]];
        if (delta1 == 0) {
            return kt.graph.po_node.PoStatesExt[stA[1]] - kt.graph.po_node.PoStatesExt[stB[1]];
        } else
            return delta1;
    }

    export function getLocationPath(node: tf.graph.proto.NodeDef): string {
        if (node) {
            let spl = node.name.split(SPL);
            let ret = spl[0];
            if (spl.length > 1)
                ret += SPL + spl[1];

            return ret;
        }

        return "";
    }

    export function makeKey(id: string, functionName: string, file: string): string {
        return id + "::" + functionName + "::" + file;
    }

    export function getPredicate(node: tf.graph.proto.NodeDef): string {
        if (node) {
            let spl = node.name.split(SPL);
            if (spl.length > 2)
                return spl[2];
        }
        return null;
    }

    class POId {
        id: string;
        functionName: string;
        file: string;

        get key(): string {
            return makeKey(this.id, this.functionName, this.file);
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


    }

    export class PONode extends POId {
        name: string;
        label: string;
        state: string;
        po: any;
        predicate: string;
        functionName: string;
        message: string;
        inputs: kt.graph.api_node.ApiNode[];
        outputs: kt.graph.api_node.ApiNode[];
        isMissing: boolean;

        _discharge: PODischarge;

        callsiteFname: string;
        callsiteFileName: string;
        private _apiId: string = null;


        constructor(po, isMissing: boolean = false) {
            super();
            this.po = po;
            this.isMissing = isMissing;
            this.state = po["state"];
            this.file = po["file"];
            this._apiId = po["apiId"];

            this.inputs = [];
            this.outputs = [];

            this.predicate = po["predicateType"];
            this.functionName = po["functionName"];
            this.callsiteFname = po["callsiteFname"];
            this.callsiteFileName = po["callsiteFileName"];

            this.id = po["id"] ? po["id"] : this.parseId(po["referenceKey"]);

            this.name = this.makeName();
            this.label = this.makeLabel();
        }

        get apiKey(): string {
            return kt.graph.api_node.makeKey("api", this._apiId, this.callsiteFname, this.callsiteFileName);
        }

        get dischargeApiKey(): string {
            if(this._discharge && this._discharge.assumptions){
                if(this._discharge.assumptions.length>0){
                    let usedAssumption = this._discharge.assumptions[0];
                    return kt.graph.api_node.makeKey(usedAssumption.type, usedAssumption.apiId, this.functionName, this.file);
                }
            }
            return null;

        }

        get discharge(): PODischarge {
            return this._discharge;
        }

        set discharge(discharge: PODischarge) {
            this._discharge = discharge;
            if (this._discharge.violation) {
                this.state = "VIOLATION";
            } else {
                this.state = "DISCHARED";
            }
        }

        private getDischargeType(): string {

            let dischargeType;

            let discharge = this.discharge ? this.discharge : this.po["discharge"];

            if (discharge) {
                if (discharge["assumptions"].length > 0) {
                    let type: string = discharge["assumptions"][0]["type"];
                    dischargeType = type.toUpperCase();
                } else if (discharge["method"] == "invariants") {
                    dischargeType = "invariants".toUpperCase();
                }
            }

            return dischargeType;
        }
        private getExtendedState(): string {
            let stateExt = this.getDischargeType();
            if (!stateExt) {
                stateExt = "default";
            }

            return this.po["state"] + "-" + stateExt;
        }

        private getDischargeAssumption() {
            let po = this.po;
            if (po["discharge"]) {
                if (po["discharge"]["assumptions"].length > 0) {
                    return po["discharge"]["assumptions"][0];
                }
            }
            return { "type": undefined, "apiId": undefined };
        }



        private getDefaultDischargeAssumption() {
            let po = this.po;
            if (po["discharge"])
                if (po["discharge"]["assumptions"].length > 0)
                    return po["discharge"]["assumptions"][0];

            return undefined;
        }

        public addInput(node: kt.graph.api_node.ApiNode) {
            this.inputs.push(node);
        }

        public addOutput(node: kt.graph.api_node.ApiNode) {
            this.outputs.push(node);
        }

        get referenceKey(): string {
            return this.po["referenceKey"];
        }

        public hasAssumptions(): boolean {
            return this.po["references"].length > 0 || this.po["inReferencesCount"] > 0;
        }

        public isLinked(): boolean {
            return this.inputs.length > 0 || this.outputs.length > 0;
        }

        get references(): any[] {
            return this.po["references"];
        }

        private parseId(refId: string): string {
            return refId.substring(0, refId.indexOf("."));
        }

        private makeName(): string {

            let _nm =
                this.fixFileName(this.po["file"]) + SPL + this.functionName
                + SPL + this.predicate
                + SPL + this.level() + "(" + this.id + ")";

            if (this.po["symbol"] && this.po["symbol"].type == "ID") {
                _nm += this.po["symbol"].value;
            } else {
                _nm += "CONST";
            }
            return _nm;
        }


        private makeLabel(): string {
            let _nm = this.level() + " (" + this.id + ") ";

            if (this.po["symbol"] && this.po["symbol"].type == "ID") {
                _nm += this.po["symbol"].value;
            } else {
                _nm += "CONST";
            }
            return _nm;
        }


        public fixFileName(file: string): string {
            let last = file.lastIndexOf("/");
            return file.substr(last + 1);
        }

        public isDischarged(): boolean {
            return this.getExtendedState() == "DISCHARGED";
        }

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


        public asNodeDef(): tf.graph.proto.NodeDef {
            const po = this.po;


            let nodeDef: tf.graph.proto.NodeDef = {
                name: this.name,
                input: [],
                output: [],
                device: this.getExtendedState(),
                op: this.functionName,
                attr: {
                    // "html": poRef2html(po),
                    "label": this.label,
                    "apiId": this.apiId,
                    "predicate": this.predicate,
                    "level": po["level"],
                    "state": this.state,
                    "location": po["textRange"],
                    "symbol": po["symbol"],
                    "message": this.message,
                    "dischargeType": this.getDischargeType(),
                    "discharge": po["discharge"], //? po["discharge"]["comment"] : null
                    "dischargeAssumption": this.getDischargeAssumption()

                }
            }

            for (let ref of this.sortRefs(this.inputs)) {
                let _nm = ref.name;


                // let lifting = (this.getExtendedState()=="API");

                // if (lifting){
                //     _nm = "^" + _nm;
                // }

                nodeDef.input.push(_nm);
            }

            for (let ref of this.sortRefs(this.outputs)) {
                nodeDef.output.push(ref.name);
            }

            let defaultDischargeAssumption = this.getDefaultDischargeAssumption();
            if (defaultDischargeAssumption) {
                if (defaultDischargeAssumption["type"] === "api") {
                    nodeDef.attr["dischargeApiId"] = defaultDischargeAssumption["apiId"];
                }

            }

            return nodeDef;
        }


        private sortRefs(refs: kt.graph.api_node.ApiNode[]) {
            return refs.sort((x, y) => {
                return compareStates(x.state, y.state);
            });
        }

        private level(): string {
            return this.po["level"] == "PRIMARY" ? "I" : "II";
        }

    }
}
