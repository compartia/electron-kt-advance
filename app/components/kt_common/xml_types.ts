module kt.xml {

    export enum SymbolType { CONST, ID };

    abstract class XmlTag {
        _tagname: string;
        parent: XmlTag;
    }

    export class Symbol {
        type: SymbolType
        value: String;

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

        public constructor(tag) {
            super();
            this.xstr = tag.attributes["xstr"];
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

        constructor(tag, parent: XmlTag) {
            super();
            this.xstr = tag.attributes["xstr"];
            this.etag = tag.attributes["etag"];
            this.parent = parent;
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


    export class Var extends XmlTag {
        vid: number;
        vname: string;

        constructor(tag) {
            super();
            this.vid = tag.attributes["vid"];
            this.vname = tag.attributes["vname"];
        }
    }
    export class LValue extends XmlTag {
        lhost: LHost;
        get varName(): Symbol {
            return this.lhost.varName;
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

        get varName(): Symbol {

            if (this.baseExp) {
                return this.baseExp.varName;
            } else if (this.exp != null) {
                return this.exp.varName;
            } else if (this.exp1) {
                return this.exp1.varName;
            } else if (this.lval) {
                return this.lval.varName;
            }

            return null;

        }
    }


    export class PredicateXmlParser {
        predicate: Predicate;

        currentTag: XmlTag | any;

        public onopentag(tag) {
            if (tag.name == 'predicate') {
                this.predicate = new Predicate();
                this.predicate.tag = tag.attributes["tag"];

                this.currentTag = this.predicate;
            }
            else if (tag.name == 'len-exp') {
                let lenExp = new ExpressionHolder(tag);
                lenExp.xstr = tag.attributes["xstr"];


                this.currentTag.lenExp = lenExp;
                this.process(lenExp, tag);
            }

            else if (tag.name == 'base-exp') {
                let baseExp = new ExpressionHolder(tag);



                this.currentTag.baseExp = baseExp;
                this.process(baseExp, tag);
            }

            else if (tag.name == 'exp') {
                let exp = new Expression(tag, this.currentTag);
                this.currentTag.exp = exp;
                this.process(exp, tag);
            }

            else if (tag.name == 'exp1') {
                let exp1 = new Expression(tag, this.currentTag);

                this.currentTag.exp1 = exp1;
                this.process(exp1, tag);
            }

            else if (tag.name == 'exp2') {
                let exp2 = new Expression(tag, this.currentTag);

                this.currentTag.exp2 = exp2;
                this.process(exp2, tag);
            }

            else if (tag.name == 'constant') {
                let constant = new Constant(tag);

                this.currentTag.constant = constant;
                this.process(constant, tag);
            }


            else if (tag.name == 'mem') {
                let mem = new Expression(tag, this.currentTag);

                this.currentTag.mem = mem;
                this.process(mem, tag);
            }

            else if (tag.name == 'lhost') {
                let lhost = new LHost();

                this.currentTag.lhost = lhost;
                this.process(lhost, tag);
            }

            else if (tag.name == 'var') {
                let varr = new Var(tag);

                this.currentTag.var = varr;
                this.process(varr, tag);
            }

            else if (tag.name == 'lval') {
                let lval = new LValue();

                this.currentTag.lval = lval;
                this.process(lval, tag);
            }

            else {
                this.process(new UnsupportedTag(), tag);
            }

        }

        private process(obj: XmlTag, tag) {
            obj._tagname = tag.name;
            obj.parent = this.currentTag;
            this.currentTag = obj;
        }



        public onclosetag(tag: string) {
            if (this.currentTag) {
                this.currentTag = this.currentTag.parent;
            }
        }

        get result(): Predicate {
            return this.predicate;
        }
    }
}
