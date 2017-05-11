module kt.stats {

    /**
        @deprecated;
    */
    const states = [
        "VIOLATION",
        "OPEN",
        "DISCHARGED"
    ];


    const CPG = ["C", "P", "G"];


    const COL_PRIMARY = "primary";

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


        public divideColumnsByColumn(columns: string[], dividerTable: StatsTable<any>, dividerColumn: string) {

            for (let rowName in this.data) {
                let row = this.data[rowName];
                let divider: number = dividerTable.getAt(rowName, dividerColumn);

                for (let colKey in row) {
                    if (_.contains(columns, colKey))
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
        byFunction: StatsTable<xml.CFunction>;

        complexityByFunction: StatsTable<kt.xml.CFunction>;
        byFile: StatsTable<treeview.FileInfo>;
        byFileLine: StatsTable<string>;

        predicateByComplexity: StatsTable<string>;
        complexityByFile: StatsTable<treeview.FileInfo>;

        assumptionsByFunction: StatsTable<xml.CFunction>;
        inAssumptionsByFunction: StatsTable<xml.CFunction>;


        private _primaryPredicatesCount: StatsTable<string>;


        private filteredOutCount: number;

        public getStatsByFileLine(file: string, line: number): { [key: string]: number } {
            return this.byFileLine.getRow(file + "//" + (line + 1));
        }

        public getStatsByFile(file: treeview.FileInfo): { [key: string]: number } {
            return this.byFile.getRow(file.relativePath);
        }

        public getStatsByFunction(func: xml.CFunction): { [key: string]: number } {
            let functionKey = func.file + "/" + func.name;
            return this.byFunction.getRow(functionKey);
        }

        public build(project: Globals.Project) {

            this._primaryPredicatesCount = new StatsTable<string>();

            this.byPredicate = new StatsTable<string>();
            this.byDischargeType = new StatsTable<string>();
            this.byState = new StatsTable<string>();
            this.byFunction = new StatsTable<kt.xml.CFunction>();
            this.byFile = new StatsTable<kt.treeview.FileInfo>();
            this.complexityByFile = new StatsTable<kt.treeview.FileInfo>();

            this.byFileLine = new StatsTable<string>();
            this.predicateByComplexity = new StatsTable<string>();
            this.assumptionsByFunction= new StatsTable<xml.CFunction>();
            this.inAssumptionsByFunction= new StatsTable<xml.CFunction>();
            this.complexityByFunction = new StatsTable<kt.xml.CFunction>();
            //

            this.byFile.columns = states;
            this.byFunction.columns = states;
            this.byPredicate.columns = states;


            let filteredPredicates: string[] = _.uniq(_.map(project.filteredProofObligations, (e) => e.predicate)).sort();
            let filteredDiscahergeTypes: string[] = _.uniq(_.map(project.filteredProofObligations, (e) => e.dischargeType)).sort();

            this.filteredOutCount = project.proofObligations.length - project.filteredProofObligations.length;

            //populate with zeros
            for (let state of states) {
                for (let predicate of filteredPredicates) {
                    this.byPredicate.inc(predicate, state, 0);
                }
            }

            //populate with zeros
            for (let dischargeType of filteredDiscahergeTypes) {
                if (!dischargeType) {
                    dischargeType = "default";
                }
                dischargeType = dischargeType.toLowerCase();
                for (let state of states) {
                    for (let level of model.PoLevels) {
                        this.byDischargeType.inc(dischargeType, state + "-" + dischargeType + "-" + level, 0);
                    }
                }
            }



            for (let po of project.filteredProofObligations) {
                let functionKey = po.file + "/" + po.functionName;
                let state: string = model.PoStates[po.state];

                let fileLineKey = po.file + "//" + po.location.line;
                this.byFileLine.inc(fileLineKey, state, 1);
                this.byFileLine.inc(fileLineKey, DEF_COL_NAME, 1);


                this.predicateByComplexity.bind(po.predicate, po.predicate);

                this._primaryPredicatesCount.inc(po.predicate, po.level, 1);


                this.byPredicate.inc(po.predicate, state, 1);
                this.byPredicate.bind(po.predicate, po.predicate);
                //------------

                this.byFunction.inc(functionKey, state, 1);
                // this.byFunction.inc(functionKey, DEF_COL_NAME, 1);
                this.byFunction.bind(functionKey, po.cfunction);
                for(let linked of po.outputs){
                    this.assumptionsByFunction.inc(functionKey, (<model.ApiNode>linked).type, 1);
                }
                for(let linked of po.inputs){
                    this.inAssumptionsByFunction.inc(functionKey, (<model.ApiNode>linked).type, 1);
                }

                this.assumptionsByFunction.bind(functionKey, po.cfunction);

                for (let cCode of CPG) {
                    this.complexityByFunction.inc(functionKey, model.Complexitiy[model.Complexitiy[cCode]], po.complexity[model.Complexitiy[cCode]]);
                    this.complexityByFile.inc(po.file, model.Complexitiy[model.Complexitiy[cCode]], po.complexity[model.Complexitiy[cCode]]);
                    this.predicateByComplexity.inc(po.predicate, model.Complexitiy[model.Complexitiy[cCode]], po.complexity[model.Complexitiy[cCode]]);
                }


                this.complexityByFile.inc(po.file, po.level, 1);
                this.complexityByFile.bind(po.file, po.cfunction.fileInfo);

                this.complexityByFunction.inc(functionKey, po.level, 1);
                this.complexityByFunction.bind(functionKey, po.cfunction);
                //------------
                this.byFile.inc(po.file, state, 1);
                this.byFile.bind(po.file, po.cfunction.fileInfo);
                //------------
                this.byState.inc(state, DEF_COL_NAME, 1);
                this.byState.bind(state, state);
                //-----------
                if (po.isDischarged() || po.isViolation()) {
                    let dischargeType: string = po.dischargeType;
                    if (!dischargeType)
                        dischargeType = "default";

                    dischargeType = dischargeType.toLowerCase();

                    //-violation-ds-primary-
                    this.byDischargeType.inc(dischargeType, state + "-" + dischargeType + "-" + po.level, 1);
                    this.byDischargeType.bind(dischargeType, dischargeType);
                }
            }


            this.complexityByFile.divideColumnsByColumn(CPG, this.complexityByFile, COL_PRIMARY);
            this.predicateByComplexity.divideColumnsByColumn(CPG, this._primaryPredicatesCount, COL_PRIMARY);
            this.complexityByFunction.divideColumnsByColumn(CPG, this.complexityByFunction, COL_PRIMARY);


            console.info("stats build o:" + this.countOpen + " v:" + this.countViolations + " d:" + this.countDischarged);

        }


        get countViolations(): number {
            return this.byState.getAt(model.PoStates[model.PoStates.violation], DEF_COL_NAME);
        }

        get countFilteredOut(): number {
            return this.filteredOutCount;
        }

        get countDischarged(): number {
            return this.byState.getAt(model.PoStates[model.PoStates.discharged], DEF_COL_NAME);
        }

        get countOpen(): number {
            return this.byState.getAt(model.PoStates[model.PoStates.open], DEF_COL_NAME);
        }



        public updateChart(scene, container: d3.Selection<any>) {
            const table = this.byPredicate;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<string>> = table.asNamedRowsTable();

            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-default-bg)",
                    columnNames: columnNames,
                    label: x => x.name,
                    max: null
                }
            );
        }

        public updatePoByDischargeChart(scene, container: d3.Selection<any>) {
            const table = this.byDischargeType;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<string>> = table.asNamedRowsTable();


            charts.updateChart(scene, container,
                {
                    data: data,
                    // colors: (x, index) => "var(--kt-state-discharged-" + x.name.toLowerCase()+"-"+columnNames[index] + "-bg)",
                    colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-bg)",
                    columnNames: columnNames,
                    label: x => x.name,
                    max: null
                }
            );
        }


        public updatePoByFunctionChart(maxRows: number, scene, container: d3.Selection<any>) {
            const table = this.byFunction;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<kt.xml.CFunction>> = table.getTopRows(maxRows);


            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-default-bg)",
                    columnNames: columnNames,
                    label: x => x.object.name,
                    max: null
                }
            );
        }

        public updateAssumptionsByFunctionChart(maxRows: number, scene, container: d3.Selection<any>) {
            const table = this.assumptionsByFunction;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<kt.xml.CFunction>> = table.getTopRows(maxRows);

            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, index) => "var(--kt-state-assumption-"+columnNames[index] +"-bg)",
                    columnNames: columnNames,
                    label: x => x.object.name,
                    max: null
                }
            );
        }

        public updateInAssumptionsByFunctionChart(maxRows: number, scene, container: d3.Selection<any>) {
            const table = this.inAssumptionsByFunction;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<kt.xml.CFunction>> = table.getTopRows(maxRows);

            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, index) => "var(--kt-state-assumption-"+columnNames[index] +"-bg)",
                    columnNames: columnNames,
                    label: x => x.object.name,
                    max: null
                }
            );
        }



        public updatePoByFileChart(scene, container: d3.Selection<any>) {
            const table = this.byFile;
            const columnNames = table.columnNames;
            const data: Array<NamedArray<kt.treeview.FileInfo>> = table.getTopRows(10);



            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-default-bg)",
                    columnNames: columnNames,
                    label: (x: NamedArray<kt.treeview.FileInfo>) => x.object.name,
                    max: null
                }
            );
        }


        public updatePredicateByComplexityChart(scene, container: d3.Selection<any>) {
            const table = this.predicateByComplexity;
            const columnNames = ["P"];
            const data: Array<NamedArray<string>> = table.getRowsSorted(columnNames);


            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, i) => "var(--kt-complexity-" + columnNames[i].toLowerCase() + "-bg)",
                    columnNames: columnNames,
                    label: x => x.name,
                    max: null
                },
                d3.format(".2f")
            );
        }


        public updatComplexityByFunctionChart(showColumns: string[], maxRows: number, scene, container: d3.Selection<any>) {
            const table = this.complexityByFunction;
            const columnNames = showColumns;
            const data: Array<NamedArray<kt.xml.CFunction>> = table.getTopRows(maxRows, columnNames);


            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, i) => "var(--kt-complexity-" + columnNames[i].toLowerCase() + "-bg)",
                    columnNames: columnNames,
                    label: (x: NamedArray<kt.xml.CFunction>) => x.object.name,
                    max: null
                },
                d3.format(".2f")
            );
        }

        public updatComplexityByFileChart(columnNames: string[], maxRows: number, scene, container: d3.Selection<any>) {
            const table = this.complexityByFile;
            const data: Array<NamedArray<kt.treeview.FileInfo>> = table.getTopRows(maxRows, columnNames);


            charts.updateChart(scene, container,
                {
                    data: data,
                    colors: (x, i) => "var(--kt-complexity-" + columnNames[i].toLowerCase() + "-bg)",
                    columnNames: columnNames,
                    label: (x: NamedArray<kt.treeview.FileInfo>) => x.object.name,
                    max: null
                },
                d3.format(".2f")
            );
        }




    }
}
