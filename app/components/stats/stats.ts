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

    export interface NamedArray {
        name: string;
        object: any;
        values: Array<number>;
    }



    export class StatsTable {
        data: { [key: string]: { [key: string]: number } } = {};
        bindings: { [key: string]: any } = {};
        columnNames: Array<string> = new Array();

        set columns(columnNames) {
            this.columnNames = columnNames;
        }

        public bind(rowname: string, object: any) {
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
        public asNamedRowsTable(): Array<NamedArray> {
            let rows = Object.keys(this.data);
            let columns = this.columnNames;

            let ret = new Array<NamedArray>();

            for (let rowName of rows) {
                let row: NamedArray = {
                    name: rowName,
                    values: new Array<number>(),
                    object: this.bindings[rowName]
                };

                row.values = [];
                ret.push(row);
                for (let col of columns) {
                    row["values"].push(this.getAt(rowName, col));
                }
            }

            return ret;
        }

        public getTopRows(count: number): Array<NamedArray> {
            let allrows = this.asNamedRowsTable();
            let arr = _.sortBy(allrows, (x) => -_.sum(x["values"]));
            return arr.splice(0, count);
        }

        /**
            returns a vector Vi, where each value is a summ of row values
        */
        get summs(): Array<number> {
            return _.map(this.asNamedRowsTable(), (x) => _.sum(x.values));
        }


        public getAt(row: string, column: string): number {
            if (this.data[row])
                return this.data[row][column];
            return 0;
        }

        public getRow(row: string): { [key: string]: number } {
            return this.data[row];
        }
    }



    export class Stats {

        byPredicate: StatsTable;
        byDischargeType: StatsTable;
        byState: StatsTable;
        byFunction: StatsTable;
        byFile: StatsTable;
        byFileLine: StatsTable;

        private filteredOutCount: number;

        public getStatsByFileLine(file: string, line: number): { [key: string]: number } {
            return this.byFileLine.getRow(file + "//" + (line + 1));
        }

        public build(project: kt.Globals.Project) {
            this.byPredicate = new StatsTable();
            this.byDischargeType = new StatsTable();
            this.byState = new StatsTable();
            this.byFunction = new StatsTable();
            this.byFile = new StatsTable();

            this.byFileLine = new StatsTable();

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
                let state: string = kt.graph.PoStates[po.state];

                let fileLineKey = po.file + "//" + po.location.line;
                this.byFileLine.inc(fileLineKey, state, 1);
                this.byFileLine.inc(fileLineKey, "sum", 1);


                this.byPredicate.inc(po.predicate, state, 1);
                this.byPredicate.bind(po.predicate, po.predicate);
                //------------
                let functionKey = po.file + "/" + po.functionName;
                this.byFunction.inc(functionKey, state, 1);
                this.byFunction.bind(functionKey, po.cfunction);
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
            const data: Array<NamedArray> = table.asNamedRowsTable();
            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-" + x.toLowerCase() + "-default-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames
                }
            );
        }

        public updatePoByDischargeChart(scene, container: d3.Selection<any>) {
            const table = this.byDischargeType;
            const columnNames = table.columnNames;
            const data: Array<NamedArray> = table.asNamedRowsTable();

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-discharged-" + x.toLowerCase() + "-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames
                }
            );
        }


        public updatePoByFunctionChart(scene, container: d3.Selection<any>) {
            const table = this.byFunction;
            const columnNames = table.columnNames;
            const data: Array<NamedArray> = table.getTopRows(20);

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-" + x.toLowerCase() + "-default-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames
                }
            );
        }

        public updatePoByFileChart(scene, container: d3.Selection<any>) {
            const table = this.byFile;
            const columnNames = table.columnNames;
            const data: Array<NamedArray> = table.getTopRows(20);

            const colors: Array<string> = _.map(columnNames,
                (x) => "var(--kt-state-" + x.toLowerCase() + "-default-bg)");

            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors,
                    columnNames: columnNames
                }
            );
        }




    }
}
