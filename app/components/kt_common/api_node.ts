module kt.graph.api_node {

    const SPL = "/";

    export function  fixFileName(file: string): string {
        let last = file.lastIndexOf("/");
        return file.substr(last + 1);
    }


    export function makeName(ref): string {

        let _nm =
            fixFileName(ref["file"]) + SPL + ref["targetFuncName"]
            + SPL + ref["predicate"]
            + SPL + ref["apiId"];

        return _nm;
    }


    export class ApiNode {
        name: string;
        state: string;
        po: any;
        predicate: string;
        functionName: string;
        message: string;
        inputs: kt.graph.po_node.PONode[];
        outputs: kt.graph.po_node.PONode[];
        isMissing: boolean;

        constructor(po, isMissing: boolean = false) {
            this.po = po;
            this.isMissing = isMissing;
            this.state = po["state"];

            this.inputs = [];
            this.outputs = [];

            this.predicate = po["predicateType"] ? po["predicateType"] : po["predicate"];
            this.functionName = po["targetFuncName"];
            this.message = po["message"] ;

            this.name = this.makeName();
        }

        private getExtendedState(): string {
            return this.state;
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
            return this.getExtendedState() == "DISCHARGED";
        }


        public asNodeDef(): tf.graph.proto.NodeDef {
            const po = this.po;
            let discharge=po["discharge"];

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

            for (let ref of this.inputs) {
                nodeDef.output.push(ref.name);
            }


            return nodeDef;
        }
        private level(): string {
            return this.po["level"] == "PRIMARY" ? "I" : "II";
        }



    }
}
