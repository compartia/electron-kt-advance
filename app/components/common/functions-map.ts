module kt.model {


    export class FunctionsMap {
        private functionsMap: { [key: string]: Array<xml.CFunction> };

        constructor(functions: Array<xml.CFunction>) {
            this.functionsMap = {};

            for (let f of functions) {
                this.addFunc(f);
            }
        }

        private addFunc(f: xml.CFunction) {

            if (!this.functionsMap[f.name]) {
                this.functionsMap[f.name] = [];
            }
            this.functionsMap[f.name].push(f);
        }

        public findFuncs(functionName: string): xml.CFunction[] {
            return this.functionsMap[functionName];
        }

        public findFunc(file: string, functionName: string): xml.CFunction {
            let funcs = this.functionsMap[functionName];
            if (funcs) {
                for (let f of funcs) {
                    if (f.file == file) {
                        return f;
                    }
                }
            }

            console.error("function " + functionName + " of " + file + " not found");
            let dummy = new xml.CFunction();
            dummy.file = file;
            dummy.name = functionName;
            this.addFunc(dummy);
            return dummy;

        }
    }
}
