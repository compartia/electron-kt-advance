const path = require('path');

export enum SymbolType { CONST, ID };


export interface FileInfo {
    name: string;
    relativePath: string;
    icon: string;
    open: boolean;
    children: Array<FileInfo>;
    dir: boolean;
}

export class FileInfoImpl implements FileInfo {
    relativePath: string;
    icon: string;
    open: boolean;
    children: Array<FileInfo>;
    dir: boolean;

    get name(): string {
        return path.basename(this.relativePath);
    }
}


function formatOp(_op: string, a1: string, a2: string): string {
    if (!_op) {
        throw "operation unknown!";
    }
    let op = _op.trim();
    if ("div" == op)
        return a1 + " / " + a2;
    else if ("plusa" == op)
        return a1 + " + " + a2;
    else if ("pluspi" == op)
        return a1 + " + " + a2;
    else if ("mult" == op)
        return a1 + " * " + a2;
    else if ("minusa" == op)
        return a1 + " - " + a2;
    else if ("minuspi" == op)
        return a1 + " - " + a2;
    else if ("minuspp" == op)
        return a1 + " - " + a2;
    else if ("mod" == op)
        return a1 + " % " + a2;
    else if ("lt" == op)
        return a1 + " < " + a2;
    else if ("gt" == op)
        return a1 + " > " + a2;
    else if ("ge" == op)
        return a1 + " >= " + a2;
    else if ("le" == op)
        return a1 + " <= " + a2;
    else if ("indexpi" == op)
        return a1 + "[" + a2 + "]";

    return op + "(" + a1 + ", " + a2 + ")";
}

export class CFunction {
    private _file: FileInfo = new FileInfoImpl();
    line: number;
    name: string;

    get file() {
        return this._file.relativePath;
    }

    get fileInfo() {
        return this._file;
    }

    set file(file: string) {
        if (file) {
            this._file.relativePath = path.normalize(file);
        } else {
            this._file.relativePath = file;
        }

    }
}


export abstract class XmlTag {
    _tagname: string;
    parent: XmlTag;
}

export class Symbol {
    type: SymbolType
    value: string;

    public constructor(type: SymbolType, value: string) {
        this.type = type;
        this.value = value;
    }

    get pathLabel() {
        if (this.type == SymbolType.ID) {
            return this.value;
        } else {
            return "CONST";
        }
    }
}





export class UnsupportedTag extends XmlTag {
}

export class Constant extends XmlTag {
    ctag: string;
    strValue: string;

    constructor(tag) {
        super();
        this.ctag = tag.attributes["ctag"];
        this.strValue = tag.attributes["strValue"];
    }
}



//   <exp1 byte="72746" etag="fnapp" file="src/auth/password-scheme.c" line="592" xstr="fn(t_malloc)@ 592[_]">
//    <arg/>
//    <fn etag="lval" xstr="t_malloc">
//     <lval>
//      <lhost>
//       <var vid="366" vname="t_malloc"/>
//      </lhost>
//     </lval>
//    </fn>
//   </exp1>

export class ExpressionLocation {
    file: string;
    line: number;
}



export class Expression extends XmlTag {
    /**
     * could be div, add, etc..
     */
    xstr: string;

    lval: LValue;
    etag: string;


    exp: Expression;
    exp1: Expression;
    exp2: Expression;

    constant: Constant;

    file: string;
    byteNo: number;
    line: number;

    _location: ExpressionLocation;

    get location(): ExpressionLocation {
        if (this._location != null) {
            return this._location;
        } else {
            if (this.lval != null) {
                return this.lval.location;
            }
        }
        return null;
    }

    set location(_location: ExpressionLocation) {
        this._location = _location;
    }

    constructor(tag, parent: XmlTag) {
        super();
        this.xstr = tag.attributes["xstr"];
        this.etag = tag.attributes["etag"];

        if (tag.attributes["line"] && tag.attributes["file"]) {
            this.location = new ExpressionLocation();
            this.location.line = tag.attributes["line"];
            this.location.file = tag.attributes["file"];
        }


        this.parent = parent;
    }

    get expression(): string {
        return this.xstr;
    }

    get varName(): Symbol {

        let v: Symbol;

        if ("const" == this.etag) {
            if (this.constant && "cstr" == this.constant.ctag) {
                v = new Symbol(SymbolType.CONST, this.constant.strValue);
            } else {
                v = new Symbol(SymbolType.CONST, this.xstr);
            }

        } else if ("lval" == this.etag || "startof" == this.etag || "addrof" == this.etag) {
            if (this.lval) {
                v = this.lval.varName;
            }
        } else if (this.exp) {
            /**
             * unary
             */
            v = this.exp.varName;

        } else if (this.exp1) {
            /**
             * binary
             */
            v = this.exp1.varName;
            if (!v && this.exp2) {
                v = this.exp2.varName;
            }
        }

        if (!v) {
            v = new Symbol(SymbolType.CONST, this.xstr);
        }
        return v;
    }


}

export class ExpressionHolder extends XmlTag {
    xstr: string;
    exp: Expression;

    get varName(): Symbol {
        if (this.exp) {
            return this.exp.varName;
        } else {
            return null;
        }
    }

    get location(): ExpressionLocation {
        return this.exp.location;
    }

    get expression(): string {
        if (this.xstr)
            return this.xstr;
        if (this.exp) {
            return this.exp.expression;
        }
        return this._tagname;
    }

    public constructor(tag, parent) {
        super();
        this.xstr = tag.attributes["xstr"];
        this.exp = new Expression(tag, parent);
    }
}


export class Var extends XmlTag {
    vid: number;
    vname: string;

    constructor(tag) {
        super();
        this.vid = tag.attributes["vid"];
        this.vname = tag.attributes["vname"];
    }

    get expression(): string {
        return this.vname;
    }
}
export class LValue extends XmlTag {
    lhost: LHost;

    get varName(): Symbol {
        return this.lhost.varName;
    }

    get expression(): string {
        return this.lhost.expression;
    }

    get location(): ExpressionLocation {
        if (this.lhost != null) {
            return this.lhost.location;
        }
        return null;
    }

}

export class LHost extends XmlTag {
    mem: Expression;
    var: Var;
    get varName(): Symbol {
        if (this.mem != null) {
            return this.mem.varName;
        } else {
            return new Symbol(SymbolType.ID, this.var.vname);
        }
    }

    get expression(): string {
        if (this.mem) {
            return this.mem.expression;
        } else {
            return this.var.expression;
        }
    }

    get location(): ExpressionLocation {
        if (this.mem != null) {
            return this.mem.location;
        }
        return null;
    }
}

export class Predicate extends XmlTag {

    baseExp: ExpressionHolder;
    lenExp: ExpressionHolder;

    exp: Expression;
    exp1: Expression;
    exp2: Expression;

    lval: LValue;


    op: string;
    size: string;
    tag: string

    public constructor(_tag) {
        super();
        this.tag = _tag.attributes["tag"];
        this.op = _tag.attributes["op"];
    }

    get location(): ExpressionLocation {
        if (this.baseExp) {
            return this.baseExp.location;
        } else if (this.exp) {
            return this.exp.location;
        } else if (this.exp1) {
            return this.exp1.location;
        } else if (this.lval) {
            return this.lval.location;
        }

        return null;
    }

    get varName(): Symbol {

        if (this.baseExp) {
            return this.baseExp.varName;
        } else if (this.exp) {
            return this.exp.varName;
        } else if (this.exp1) {
            return this.exp1.varName;
        } else if (this.lval) {
            return this.lval.varName;
        }

        return null;

    }

    get expression(): string {
        let expStr = "";

        if (this.lenExp && this.baseExp) {
            expStr = this.baseExp.expression + "," + this.lenExp.expression;
        }

        if (this.exp1 && this.exp2) {
            /*
             * binary operation
             */
            let op = this.op ? this.op : this.tag;
            expStr = formatOp(op, this.exp1.expression, this.exp2.expression);

        } else if (this.exp) {
            expStr = this.exp.expression;
        } else if (this.lval) {
            expStr = this.lval.expression;
        }

        return expStr.trim();
    }

}



export class FunctionsMap {
    private functionsMap: { [key: string]: Array<CFunction> };

    constructor(functions: Array<CFunction>) {
        this.functionsMap = {};

        for (let f of functions) {
            this.addFunc(f);
        }
    }

    private addFunc(f: CFunction) {

        if (!this.functionsMap[f.name]) {
            this.functionsMap[f.name] = [];
        }
        this.functionsMap[f.name].push(f);
    }

    public findFuncs(functionName: string): CFunction[] {
        return this.functionsMap[functionName];
    }

    public findFunc(file: string, functionName: string): CFunction {
        let funcs = this.functionsMap[functionName];
        if (funcs) {
            for (let f of funcs) {
                if (f.file == file) {
                    return f;
                }
            }
        }

        console.error("function " + functionName + " of " + file + " not found");
        let dummy = new CFunction();
        dummy.file = file;
        dummy.name = functionName;
        this.addFunc(dummy);
        return dummy;

    }
}
