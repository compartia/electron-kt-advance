module kt.graph.api_node {

    const SPL = "/";

    export function fixFileName(file: string): string {
        let last = file.lastIndexOf("/");
        return file.substr(last + 1);
    }


    export function makeName(ref): string {
        let _nm = fixFileName(ref["file"]) + SPL + ref["targetFuncName"] + SPL + ref["predicate"] + SPL + ref["type"] + "_" + ref["apiId"];
        return _nm;
    }

    export function makeKey(type: string, id: string, functionName: string, file: string): string {
        return type + "::" + id + "::" + functionName + "::" + file;
    }


    export class ApiNode {

        functionName: string;
        message: string;
        inputs: kt.graph.po_node.PONode[];
        outputs: kt.graph.po_node.PONode[];
        isMissing: boolean;
        file: string;
        type: string;
        id: string;
        predicateType: string;
        dependentPos: Array<string>;

        constructor(po) {
            // this.po = po;

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
            return makeKey(this.type , this.id , this.functionName , this.file);
        }

        get state(): string {
            return "assumption";
        }

        get name() {
            return this.makeName();
        }

        private getExtendedState(): string {
            return this.state + "-" + this.type;
        }

        public addInput(node: kt.graph.po_node.PONode) {
            this.inputs.push(node);
        }

        public addOutput(node: kt.graph.po_node.PONode) {
            this.outputs.push(node);
        }


        private makeName(): string {
            return fixFileName(this.file) + SPL + this.functionName + SPL + this.predicateType + SPL + this.type + "_" + this.id;
        }

        public isDischarged(): boolean {
            return false;
        }

        public asNodeDef(): tf.graph.proto.NodeDef {
            // const po = this.po;
            // let discharge = po["discharge"];

            let nodeDef: tf.graph.proto.NodeDef = {
                name: this.name,
                input: [],
                output: [],
                device: this.getExtendedState(),
                op: this.functionName,
                attr: {
                    "predicate": this.predicateType,
                    // "level": po["level"],
                    "state": this.state,
                    // "symbol": po["symbol"],
                    "message": this.message,
                    "apiId": this.id
                }
            }

            for (let ref of this.inputs) {
                let _nm = ref.name;
                nodeDef.input.push(_nm);
            }

            for (let ref of this.outputs) {
                nodeDef.output.push(ref.name);
            }


            return nodeDef;
        }
    }
}
