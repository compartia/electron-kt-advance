module kt.graph.po_node {

    export enum PoStatesExt { violation, open, discharged, global, invariants, ds, rv, api  };
    const SPL = "/";



    export class PONode {
        id: string;
        name: string;
        state: string;
        po: any;
        predicate: string;
        functionName: string;
        message: string;
        inputs: ApiNode[];
        outputs: ApiNode[];
        isMissing: boolean;

        constructor(po, isMissing: boolean = false) {
            this.po = po;
            this.isMissing = isMissing;
            this.state = po["state"];

            this.inputs = [];
            this.outputs = [];

            this.predicate = po["predicateType"] ? po["predicateType"] : po["predicate"];
            this.functionName = po["targetFuncName"] ? po["targetFuncName"] : po["functionName"];
            this.message = po["message"] ? po["message"] : po["shortDescription"];
            this.id = this.parseId(po["referenceKey"]);

            this.name = this.makeName();
        }

        private getExtendedState(): string {
            let po = this.po;

            if (po["discharge"]) {
                if (po["discharge"]["assumptions"].length > 0) {
                    let type: string = po["discharge"]["assumptions"][0]["type"];
                    return type.toUpperCase();
                } else if (po["discharge"]["method"] == "invariants") {
                    return "invariants".toUpperCase();
                }
            }

            return this.po["state"];
        }



        private getDefaultDischargeAssumption(){
            let po = this.po;
            if (po["discharge"])
                if (po["discharge"]["assumptions"].length > 0)
                    return po["discharge"]["assumptions"][0];

            return undefined;
        }

        public addInput(node: ApiNode) {
            this.inputs.push(node);
        }
        public addOutput(node: ApiNode) {
            this.outputs.push(node);
        }

        get referenceKey(): string {
            return this.po["referenceKey"];
        }

        public hasAssumptions(): boolean {
            return this.po["references"].length > 0;
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

            /**
                TODO: spaces are not yet allowed in names because of d3 queries; FIXME.
            */
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




        public asNodeDef(): tf.graph.proto.NodeDef {
            const po = this.po;
            let discharge=po["discharge"];

            let nodeDef: tf.graph.proto.NodeDef = {
                name: this.name,
                input: [],
                device: this.getExtendedState(),
                op: this.functionName,
                attr: {
                    // "html": poRef2html(po),
                    "predicate": this.predicate,
                    "level": po["level"],
                    "state": this.state,
                    "stateExt": this.getExtendedState(),
                    "location": po["textRange"],
                    "symbol": po["symbol"],
                    "message": this.message,
                    "discharge": discharge //? po["discharge"]["comment"] : null
                }
            }

            for (let ref of this.inputs) {
                let _nm = ref.name;

                // if (lifting){
                //     _nm = "^" + _nm;
                // }

                nodeDef.input.push(_nm);
            }



            let defaultDischargeAssumption = this.getDefaultDischargeAssumption();
            if(defaultDischargeAssumption){
                if(defaultDischargeAssumption["type"]==="api"){
                    nodeDef.attr["dischargeApiId"]=defaultDischargeAssumption["apiId"];
                }
            }

            return nodeDef;
        }
        private level(): string {
            return this.po["level"] == "PRIMARY" ? "I" : "II";
        }
        public toHtml(): string {
            var html = "<div class='po level-" + this.po["level"] + " state-" + this.po["state"] + "'>"
            // html += "<span class='func'>" + po["functionName"] + "</span><br>"
            html += "<span class='predicate'>" + this.predicate + " : <span class='level'> </span> </span>"
            html += "<div class='message'>" + this.message + "</div>"
            html += "</div>"

            return html;
        }



    }
}
