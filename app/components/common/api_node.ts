module kt.graph {

    const SPL = "/";


    export function makeAssumptionKey(type: string, id: string, functionName: string, file: string): string {
        return type + "::" + id + "::" + functionName + "::" + file;
    }


    export class ApiNode extends kt.graph.AbstractNode {
        message: string;
        isMissing: boolean;
        type: string;
        predicateType: string;
        symbol: kt.xml.Symbol;
        expression: string;

        constructor(po) {
            super();

            this.inputs = [];
            this.outputs = [];
            this.predicateType = po["predicate"];
            this.functionName = po["targetFuncName"];
            this.message = po["message"];
            this.file = po["file"];
            this.type = po["type"] ? po["type"] : "unknown";
            this.id = po["apiId"];

        }

        get apiId(): string {
            return this.id;
        }

        get key(): string {
            return makeAssumptionKey(this.type, this.id, this.functionName, this.file);
        }

        get state(): string {
            return "assumption";
        }

        get name() {
            return this.makeName();
        }

        private makeName(): string {
            return kt.util.stripSlash(this.file) + SPL + this.functionName + SPL + this.predicateType + SPL + this.type + "_" + this.id;
        }

        get label(): string {
            let _nm = this.type + " (" + this.id + ") ";

            if (this.symbol) {
                _nm += this.symbol.pathLabel;
            } else {
                _nm += "-expression-";
            }

            return _nm;
        }

        get extendedState(): string {
            return this.state + "-" + this.type;
        }

        public isDischarged(): boolean {

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



        public asNodeDef(nameFilter): tf.graph.proto.NodeDef {
            // const po = this.po;
            // let discharge = po["discharge"];

            let nodeDef: tf.graph.proto.NodeDef = {
                name: nameFilter(this.name),
                input: [],
                output: [],
                device: this.extendedState,
                op: this.functionName,
                attr: {
                    "label": this.label,
                    "predicate": this.predicateType,
                    "expression": this.expression,
                    "state": this.state,
                    "message": this.message,
                    "apiId": this.id,
                    "symbol": this.symbol,
                    "assumptionType": this.type
                }
            }

            for (let ref of this.inputs) {
                nodeDef.input.push(nameFilter(ref.name));
            }

            for (let ref of this.outputs) {
                nodeDef.output.push(nameFilter(ref.name));
            }


            return nodeDef;
        }
    }
}
