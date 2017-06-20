import { Predicate, XmlTag, Expression, ExpressionHolder, Constant, LHost, LValue, Var, UnsupportedTag } from "./xml_types"


export class PredicateXmlParser {
    predicate: Predicate;

    currentTag: XmlTag | any;

    public onopentag(tag) {
        if (tag.name == 'predicate') {
            this.predicate = new Predicate(tag);
            this.predicate.tag = tag.attributes["tag"];

            this.currentTag = this.predicate;
        }
        else if (tag.name == 'len-exp') {
            let lenExp = new ExpressionHolder(tag, this.currentTag);
            lenExp.xstr = tag.attributes["xstr"];

            this.currentTag.lenExp = lenExp;
            this.process(lenExp, tag);
        }

        else if (tag.name == 'base-exp') {
            let baseExp = new ExpressionHolder(tag, this.currentTag);

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
