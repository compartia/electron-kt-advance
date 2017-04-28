module kt.util {

    export function stripSlash(file: string): string {
        let last = file.lastIndexOf("/");
        return file.substr(last + 1);
    }


    export function addToSet(array: Array<any>, value: any) {
        if (array.indexOf(value) === -1) {
            array.push(value);
        }
    }

    export function deleteFromSet(array: Array<any>, value: any) {
        var index = array.indexOf(value);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }

    export function zeroIfNull(val: any):number{
        if (val == undefined)
            return  0;
        if (val == null)
            return  0;
        return parseInt(val);
    }


    export function replaceArrayObservably(oldArr: Array<any>, newArr: Array<any>) {
        oldArr.splice(0);
        if (newArr) {
            for (let p of newArr) {
                oldArr.push(p);
            }
        }
    }


    /**
        maintains uniq values;
    */
    export class AnySet<T> {
        private array: Array<T> = [];



        constructor(array: Array<T>) {
            this.array = _.uniq(array);
        }

        get length(): number {
            return this.array.length;
        }

        get first(): T {
            if (this.array.length) return this.array[0];
            return undefined;
        }


        public contains(val: T): boolean {
            return _.contains(this.array, val);
        }

        public add(value: T): void {
            if (this.array.indexOf(value) === -1) {
                this.array.push(value);
            }
        }

        public delete(value: T) {
            var index = this.array.indexOf(value);
            if (index !== -1) {
                this.array.splice(index, 1);
            }
        }

        set values(newArr: Array<T>) {
            this.array.splice(0);
            if (newArr) {
                for (let p of newArr) {
                    this.add(p);
                }
            } else {
                this.array.splice(0);
            }
        }

    }

    export class StringSet extends AnySet<string>{

    }

}
