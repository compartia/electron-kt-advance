module kt.model {

    const SPL = "/";


    export function makeAssumptionKey(type: string, id: string, functionName: string, file: string): string {
        return type + "::" + id + "::" + functionName + "::" + file;
    }


    export class ApiNode extends model.AbstractNode {
        message: string;
        isMissing: boolean;
        type: string;
        predicateType: string;
        expression: string;

        dependentPos: Array<string>;//used during parsing

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

            this.location.textRange = po["textRange"];

        }

        get apiId(): string {
            return this.id;
        }

        get predicate(): string {
            return this.predicateType;
        }

        get key(): string {
            return makeAssumptionKey(this.type, this.id, this.functionName, this.file);
        }

        get state(): model.PoStates {
            return model.PoStates.assumption;
        }


        public makeName(filter: Globals.Filter, settings: Globals.GraphSettings): string {
            return makeGraphNodePath(filter, settings, this.cfunction, this.predicateType, this.type + "_" + this.id);
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
            return model.PoStates[this.state] + "-" + this.type;
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


        public asNodeDef(filter: Globals.Filter, settings: Globals.GraphSettings): tf.graph.proto.NodeDef {


            let nodeDef: tf.graph.proto.NodeDef = {
                name: this.makeName(filter, settings),
                input: [],
                output: [],
                device: this.extendedState,
                op: this.functionName,
                attr: {
                    "label": this.label,
                    "predicate": this.predicateType,
                    "expression": this.expression,
                    "state": model.PoStates[this.state],
                    "message": this.message,
                    "apiId": this.id,
                    "symbol": this.symbol,
                    "assumptionType": this.type,
                    "locationPath": this.file + SPL + this.functionName,
                    "location": this.location
                }
            }

            for (let ref of this.inputs) {
                nodeDef.input.push(ref.makeName(filter, settings));

            }

            for (let ref of this.outputs) {
                nodeDef.output.push(ref.makeName(filter, settings));
            }


            return nodeDef;
        }
    }
}
