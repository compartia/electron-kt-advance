import { AbstractNode, PoStates, makeAssumptionKey } from "./po_node"
import { ExpressionLocation } from "../xml/xml_types"


const path = require('path');
const SPL = "/";



export class ApiNode extends AbstractNode {
    message: string;
    isMissing: boolean;
    type: string;
    predicateType: string;
    expression: string;
    eLocation: ExpressionLocation;

    dependentPos: Array<string>;//used during parsing

    constructor() {
        super();
        this.inputs = [];
        this.outputs = [];
    }

    get line(): number {
        if (this.eLocation) {
            return this.eLocation.line;
        }
        return this.cfunction.line;
    }

    get dischargeType(): string {
        return this.type;
    }

    get level(): string {
        return null;
    }

    get file(): string {
        if (this.eLocation) {
            return this.eLocation.file;
        }
        return this.cfunction.file;
    }

    set file(f: string) {
        if (f)
            this.cfunction.file = path.normalize(f);
        else
            this.cfunction.file = f;
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

    get state(): PoStates {
        return PoStates.assumption;
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
        return PoStates[this.state] + "-" + this.type;
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



}
