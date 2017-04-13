module kt.util {

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
    export class StringSet {
        private array: Array<string> = [];



        constructor(array: Array<string>) {
            this.array = _.uniq(array);
        }
        
        get length(): number {
            return this.array.length;
        }

        get first(): string {
            if (this.array.length) return this.array[0];
            return undefined;
        }


        public contains(val: string): boolean {
            return _.contains(this.array, val);
        }

        public add(value: any): void {
            if (this.array.indexOf(value) === -1) {
                this.array.push(value);
            }
        }

        public delete(value: any) {
            var index = this.array.indexOf(value);
            if (index !== -1) {
                this.array.splice(index, 1);
            }
        }

        set values(newArr: Array<any>) {
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

}
