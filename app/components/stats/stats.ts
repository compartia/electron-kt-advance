module kt.stats {

    /**
        @deprecated;
    */
    const states = [
        "VIOLATION",
        "OPEN",
        "DISCHARGED"
    ];

    const DEF_COL_NAME = "count";

    export interface NamedArray<X> {
        name: string;
        object: X;
        values: Array<number>;
    }



    export class StatsTable<T> {
        data: { [key: string]: { [key: string]: number } } = {};
        bindings: { [key: string]: T } = {};
        columnNames: Array<string> = new Array();


        public foreach(func: (row: string, col: string, val: number) => void, columns?: string[]): void {

            for (let rowName in this.data) {
                let row = this.data[rowName];

                for (let colKey in row) {
                    if (_.contains(columns, colKey))
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

            if (!_.contains(this.columnNames, column)) {
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
            let arr = _.sortBy(allrows, (x) => -_.sum(x["values"]));
            return arr.splice(0, count);
        }

        public getRowsSorted(columns?: string[]): Array<NamedArray<T>> {
            let allrows = this.asNamedRowsTable(columns);
            let arr = _.sortBy(allrows, (x) => -_.sum(x["values"]));
            return arr;
        }



        public getRow(row: string): { [key: string]: number } {
            return this.data[row];
        }
    }



    export class Stats {

        byPredicate: StatsTable<string>;
        byDischargeType: StatsTable<string>;
        byState: StatsTable<string>;
        byFunction: StatsTable<kt.xml.CFunction>;

        complexityByFunction: StatsTable<kt.xml.CFunction>;
        byFile: StatsTable<kt.treeview.FileInfo>;
        byFileLine: StatsTable<string>;

        predicateByComplexity: StatsTable<string>;


        private _primaryPredicatesCount: StatsTable<string>;
        // private _predicatesByFunctionCount: StatsTable<string>;


        private filteredOutCount: number;

        public getStatsByFileLine(file: string, line: number): { [key: string]: number } {
            return this.byFileLine.getRow(file + "//" + (line + 1));
        }

        public build(project: kt.Globals.Project) {

            this._primaryPredicatesCount = new StatsTable<string>();
            // this._predicatesByFunctionCount = new StatsTable<string>();

            this.byPredicate = new StatsTable<string>();
            this.byDischargeType = new StatsTable<string>();
            this.byState = new StatsTable<string>();
            this.byFunction = new StatsTable<kt.xml.CFunction>();
            this.byFile = new StatsTable<kt.treeview.FileInfo>();

            this.byFileLine = new StatsTable<string>();
            this.predicateByComplexity = new StatsTable<string>();
            this.complexityByFunction = new StatsTable<kt.xml.CFunction>();
            //

            this.byFile.columns = states;
            this.byFunction.columns = states;
            this.byPredicate.columns = states;


            let filteredPredicates = _.uniq(_.map(project.filteredProofObligations, (e) => e.predicate)).sort();

            this.filteredOutCount = project.proofObligations.length - project.filteredProofObligations.length;

            //populate with zeros
            for (let state of states) {
                for (let predicate of filteredPredicates) {
                    this.byPredicate.inc(predicate, state, 0);
                }
            }

            for (let po of project.filteredProofObligations) {
                let functionKey = po.file + "/" + po.functionName;
                let state: string = kt.graph.PoStates[po.state];

                let fileLineKey = po.file + "//" + po.location.line;
                this.byFileLine.inc(fileLineKey, state, 1);
                this.byFileLine.inc(fileLineKey, "sum", 1);

                this.predicateByComplexity.inc(po.predicate, kt.graph.Complexitiy[kt.graph.Complexitiy.P], po.complexity[kt.graph.Complexitiy.P]);
                this.predicateByComplexity.inc(po.predicate, kt.graph.Complexitiy[kt.graph.Complexitiy.C], po.complexity[kt.graph.Complexitiy.C]);
                this.predicateByComplexity.inc(po.predicate, kt.graph.Complexitiy[kt.graph.Complexitiy.G], po.complexity[kt.graph.Complexitiy.G]);

                this._primaryPredicatesCount.inc(po.predicate, po.level, 1);


                this.byPredicate.inc(po.predicate, state, 1);
                this.byPredicate.bind(po.predicate, po.predicate);
                //------------

                this.byFunction.inc(functionKey, state, 1);
                this.byFunction.bind(functionKey, po.cfunction);

                this.complexityByFunction.inc(functionKey, kt.graph.Complexitiy[kt.graph.Complexitiy.P], po.complexity[kt.graph.Complexitiy.P]);
                this.complexityByFunction.inc(functionKey, kt.graph.Complexitiy[kt.graph.Complexitiy.C], po.complexity[kt.graph.Complexitiy.C]);
                this.complexityByFunction.inc(functionKey, kt.graph.Complexitiy[kt.graph.Complexitiy.G], po.complexity[kt.graph.Complexitiy.G]);

                this.complexityByFunction.inc(functionKey, po.level, 1);
                this.complexityByFunction.bind(functionKey, po.cfunction);
                //------------
                this.byFile.inc(po.file, state, 1);
                this.byFile.bind(po.file, po.cfunction.fileInfo);
                //------------
                this.byState.inc(state, DEF_COL_NAME, 1);
                this.byState.bind(state, state);
                //-----------
                if (po.isDischarged()) {
                    let dischargeType = po.dischargeType;
                    if (!dischargeType)
                        dischargeType = "default";

                    this.byDischargeType.inc(dischargeType, dischargeType, 1);
                    this.byDischargeType.bind(dischargeType, dischargeType);
                }
            }

            this.predicateByComplexity.foreach(this.divideByNumberOfPredicates.bind(this), ["C", "P", "G"]);
            this.complexityByFunction.foreach(this.divideFunctionCmplxByNumberOfPredicates.bind(this), ["C", "P", "G"]);


            console.info("stats build o:" + this.countOpen + " v:" + this.countViolations + " d:" + this.countDischarged);

        }

        private divideByNumberOfPredicates(row: string, col: string, val: number) {
            let divider: number = this._primaryPredicatesCount.getAt(row, "I");
            if (divider) {
                this.predicateByComplexity.data[row][col] = val / divider;
            } else {
                this.predicateByComplexity.data[row][col] = 0;
            }
        }

        private divideFunctionCmplxByNumberOfPredicates(row: string, col: string, val: number) {
            let divider: number = this.complexityByFunction.getAt(row, "I");
            if (divider) {
                this.complexityByFunction.data[row][col] = val / divider;
            } else {
                this.complexityByFunction.data[row][col] = 0;
            }
        }

        get countViolations(): number {
            return this.byState.getAt(kt.graph.PoStates[kt.graph.PoStates.violation], DEF_COL_NAME);
        }

        get countFilteredOut(): number {
            return this.filteredOutCount;
        }

        get countDischarged(): number {
            return this.byState.getAt(kt.graph.PoStates[kt.graph.PoStates.discharged], DEF_COL_NAME);
        }

        get countOpen(): number {
            return this.byState.getAt(kt.graph.PoStates[kt.graph.PoStates.open], DEF_COL_NAME);
        }



        public updateChart(scene, container: d3.Selection<any>) {
            const table = this.byPredicate;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<string>> = table.asNamedRowsTable();
            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-" + x.toLowerCase() + "-default-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames,
                    label: x => x.name
                }
            );
        }

        public updatePoByDischargeChart(scene, container: d3.Selection<any>) {
            const table = this.byDischargeType;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<string>> = table.asNamedRowsTable();

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-discharged-" + x.toLowerCase() + "-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames,
                    label: x => x.name
                }
            );
        }


        public updatePoByFunctionChart(maxRows: number, scene, container: d3.Selection<any>) {
            const table = this.byFunction;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<kt.xml.CFunction>> = table.getTopRows(maxRows);

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-" + x.toLowerCase() + "-default-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames,
                    label: x => x.object.name
                }
            );
        }

        public updatePoByFileChart(scene, container: d3.Selection<any>) {
            const table = this.byFile;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<kt.treeview.FileInfo>> = table.getTopRows(20);

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-" + x.toLowerCase() + "-default-bg)");

            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames,
                    label: (x: NamedArray<kt.treeview.FileInfo>) => x.object.name
                }
            );
        }


        public updatePredicateByComplexityChart(scene, container: d3.Selection<any>) {
            const table = this.predicateByComplexity;
            const columnNames = ["P"];
            const data: Array<NamedArray<string>> = table.getRowsSorted(columnNames);

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-complexity-" + x.toLowerCase() + "-bg)");

            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames,
                    label: x => x.name
                },
                d3.format(".2f")
            );
        }


        public updatComplexityByFunctionChart(showColumns: string[], maxRows: number, scene, container: d3.Selection<any>) {
            const table = this.complexityByFunction;
            const columnNames = showColumns;
            const data: Array<NamedArray<kt.xml.CFunction>> = table.getTopRows(maxRows, columnNames);

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-complexity-" + x.toLowerCase() + "-bg)");

            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames,
                    label: (x: NamedArray<kt.xml.CFunction>) => x.object.name
                },
                d3.format(".2f")
            );
        }

        // public updatComplexityByFileChart(columnNames: string[], maxRows: number, scene, container: d3.Selection<any>) {
        //     const table = this.complexityByFile;
        //     const data: Array<NamedArray> = table.getTopRows(maxRows, columnNames);
        //
        //     const colors: Array<string> = _.map(columnNames,
        //         (x) => "var(--kt-complexity-" + x.toLowerCase() + "-bg)");
        //
        //     kt.charts.updateChart(scene, container,
        //         {
        //             data: data,
        //             colors: colors,
        //             columnNames: columnNames
        //         },
        //         d3.format(".2f")
        //     );
        // }




    }
}
