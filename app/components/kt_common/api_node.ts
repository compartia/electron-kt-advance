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


    export class ApiNode {
        name: string;
        po: any;
        predicate: string;
        functionName: string;
        message: string;
        inputs: kt.graph.po_node.PONode[];
        outputs: kt.graph.po_node.PONode[];
        isMissing: boolean;
        state: string;
        type: string;

        constructor(po) {
            this.po = po;

            this.inputs = [];
            this.outputs = [];

            this.predicate = po["predicate"];
            this.functionName = po["targetFuncName"];
            this.message = po["message"];
            this.state = "assumption";
            this.type = po["type"] ? po["type"]:"unknown";

            console.info(this.type);

            this.name = this.makeName();
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
            return makeName(this.po);
        }

        public isDischarged(): boolean {
            return false;
        }

        public asNodeDef(): tf.graph.proto.NodeDef {
            const po = this.po;
            let discharge = po["discharge"];

            let nodeDef: tf.graph.proto.NodeDef = {
                name: this.name,
                input: [],
                output: [],
                device: this.getExtendedState(),
                op: this.functionName,
                attr: {
                    "predicate": this.predicate,
                    "level": po["level"],
                    "state": this.state,
                    "stateExt": this.getExtendedState(),
                    "symbol": po["symbol"],
                    "message": this.message,
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
