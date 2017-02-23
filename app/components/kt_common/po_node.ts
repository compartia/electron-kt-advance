module kt.graph.po_node {
    const SPL = "/";


    export class PONode {
        id: string;
        name: string;
        po: any;
        predicate: string;
        functionName: string;
        message: string;
        inputs: PONode[];
        outputs: PONode[];
        isMissing:boolean;

        constructor(po, isMissing:boolean=false) {
            this.po = po;
            this.isMissing=isMissing;

            this.inputs = [];
            this.outputs = [];

            this.predicate = po["predicateType"] ? po["predicateType"] : po["predicate"];
            this.functionName = po["targetFuncName"] ? po["targetFuncName"] : po["functionName"];
            this.message = po["message"] ? po["message"] : po["shortDescription"];
            this.id = this.parseId(po["referenceKey"]);

            this.name = this.makeName();
        }

        public addInput(node: PONode) {
            this.inputs.push(node);
        }
        public addOutput(node: PONode) {
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
            let s = refId.indexOf(".");
            let ret = refId.substring(s + 1);
            s = ret.indexOf(".");
            ret = ret.substring(0, s);
            return ret;
        }

        private makeName(): string {
            let state_parent:string="";
            if (this.isDischarged()){
                state_parent=""+SPL + this.po["state"];
            }
            let _nm= /*this.fixFileName(this.po["file"])+ SPL + */this.functionName + state_parent
                + SPL + this.predicate
                + SPL + "("+this.id +")"
                 ;

            if(this.po["symbol"] && this.po["symbol"].type=="ID"){
                _nm+=this.po["symbol"].value;
            }else{
                _nm+="CONST";
            }
            return _nm;
        }


        public fixFileName(file: string): string {
            let last = file.lastIndexOf("/");
            return file.substr(last + 1);
        }

        public isDischarged(): boolean {
            return this.po["state"] == "DISCHARGED";
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

            let ret: tf.graph.proto.NodeDef = {
                name: this.name,
                input: [],
                device: po["state"],
                op: this.functionName,
                attr: {
                    // "html": poRef2html(po),
                    "predicate": this.predicate,
                    "level": po["level"],
                    "state": po["state"],
                    "message": this.message
                }
            }

            for (let ref of this.inputs) {
                let _nm=ref.name;
                if(ref.isMissing)
                    _nm="^"+_nm;
                ret.input.push(_nm);
            }

            return ret;
        }

        public toHtml(): string {
            var html = "<div class='po level-" + this.po["level"] + " state-" + this.po["state"] + "'>"
            // html += "<span class='func'>" + po["functionName"] + "</span><br>"
            html += "<span class='predicate'>" + this.predicate  + " : <span class='level'> </span> </span>"
            html += "<div class='message'>" + this.message + "</div>"
            html += "</div>"

            return html;
        }



    }
}
