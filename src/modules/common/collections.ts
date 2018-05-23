import { contains, sortBy, sum, uniq } from "lodash";

export function isEmpty<T>(set_: AnySet<T>): boolean {
    return set_ === null || set_ === undefined || set_.isEmpty();
}


export interface NamedArray<X> {
    name: string;
    object: X;
    values: Array<number>;
}

export class StatsTable<T> {

    data: { [key: string]: { [key: string]: number } } = {};
    bindings: { [key: string]: T } = {};
    columnNames: Array<string> = new Array();


    public divideColumnsByColumn(columns: string[], dividerTable: StatsTable<any>, dividerColumn: string) {

        for (let rowName in this.data) {
            let row = this.data[rowName];
            let divider: number = dividerTable.getAt(rowName, dividerColumn);

            for (let colKey in row) {
                if (contains(columns, colKey))
                    var val = row[colKey];

                if (divider) {
                    row[colKey] = val / divider;
                } else {
                    row[colKey] = 0;
                }
            }
        }
    }



    public foreach(func: (row: string, col: string, val: number) => void, columns?: string[]): void {

        for (let rowName in this.data) {
            let row = this.data[rowName];

            for (let colKey in row) {
                if (contains(columns, colKey))
                    var val = row[colKey];
                func(rowName, colKey, val);
            }
        }
    }



    public getAt(row: string, column: string): number {
        if (this.data[row])
            return this.data[row][column];
        return 0;
    }

    set columns(columnNames) {
        this.columnNames = columnNames;
    }

    public bind(rowname: string, object: T) {
        this.bindings[rowname] = object;
    }

    public inc(row: string, column: string, increment: number) {

        let data = this.data;

        if (!data[row]) {
            data[row] = {};
        }
        let dataset = data[row];
        if (!dataset[column]) {
            dataset[column] = increment;
        } else {
            dataset[column] += increment;
        }

        if (!contains(this.columnNames, column)) {
            this.columnNames.push(column);
        }
    }

    get rowNames() {
        return Object.keys(this.data);
    }

    /**
    example:
    [[{name:"row1name", values:[3,2,3]]
    ]
    */
    public asNamedRowsTable(columns?: string[]): Array<NamedArray<T>> {
        let rows = Object.keys(this.data);
        if (!columns)
            columns = this.columnNames;

        let ret = new Array<NamedArray<T>>();

        for (let rowName of rows) {
            let row: NamedArray<T> = {
                name: rowName,
                values: new Array<number>(),
                object: this.bindings[rowName]
            };

            row.values = [];
            ret.push(row);
            for (let col of columns) {
                row.values.push(this.getAt(rowName, col));
            }
        }

        return ret;
    }




    public getTopRows(count: number, columns?: string[]): Array<NamedArray<T>> {
        let allrows = this.asNamedRowsTable(columns);
        let arr = sortBy(allrows, (x) => - sum(x["values"]));
        return arr.splice(0, count);
    }

    public getRowsSorted(columns?: string[]): Array<NamedArray<T>> {
        let allrows = this.asNamedRowsTable(columns);
        let arr = sortBy(allrows, (x) => -sum(x["values"]));
        return arr;
    }



    public getRow(row: string): { [key: string]: number } {
        return this.data[row];
    }
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