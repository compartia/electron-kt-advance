import { contains, uniq } from "lodash"

export function zeroIfNull(val: any): number {
    if (val == undefined)
        return 0;
    if (val == null)
        return 0;
    return parseInt(val);
}

export function isEmpty<T>(set_: AnySet<T>): boolean {
    return set_ === null || set_ === undefined || set_.isEmpty();
}


/**
    maintains uniq values;
*/
export class AnySet<T> {
    private array: Array<T> = [];

    constructor(array: Array<T>) {
        this.array = uniq(array);
    }

    get length(): number {
        return this.array.length;
    }

    public isEmpty(): boolean {
        return this.array.length === 0;
    }

    get values(): Array<T> {
        return this.array;
    }

    get first(): T {
        if (this.array.length) return this.array[0];
        return undefined;
    }


    public contains(val: T): boolean {
        return contains(this.array, val);
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
