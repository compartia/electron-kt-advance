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
        values: Array<number>;
    }

    export class StatsTable {
        data: { [key: string]: { [key: string]: number } } = {};

        columnNames: Array<string> = new Array();

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
                    values: new Array<number>()
                };

                row.values = [];
                ret.push(row);
                for (let col of columns) {
                    row["values"].push(this.getAt(rowName, col));
                }
            }

            return ret;
        }

        /**
            returns a vector Vi, where each value is a summ of row values
        */
        get summs(): Array<number> {
            return _.map(this.asNamedRowsTable(), (x) => _.sum(x.values));
        }


        public getAt(row: string, column: string): number {
            if(this.data[row])
                return this.data[row][column];
            return 0;
        }
    }



    export class Stats {

        byPredicate: StatsTable;
        byDischargeType: StatsTable;
        byState: StatsTable;

        allPredicates: Array<string>=[];


        public build(project: kt.Globals.Project) {
            this.byPredicate = new StatsTable();
            this.byDischargeType = new StatsTable();
            this.byState = new StatsTable();

            //XXX: do not do this everytime, just cache it per project
            this.allPredicates = _.uniq(_.map(project.filteredProofObligations, (e) => e.predicate)).sort();

            //popolate with zeros
            for (let state of states) {
                for (let predicate of this.allPredicates) {
                    this.byPredicate.inc(predicate, state, 0);
                }
            }

            for (let po of project.filteredProofObligations) {
                this.byPredicate.inc(po.predicate, po.state, 1);
                this.byState.inc(po.state, DEF_COL_NAME, 1);
                if (po.isDischarged()) {
                    let dischargeType = po.dischargeType;
                    if (!dischargeType)
                        dischargeType = "default";

                    this.byDischargeType.inc(dischargeType, dischargeType, 1);
                }
            }

        }

        get countViolations():number{
            return this.byState.getAt("VIOLATION", DEF_COL_NAME);
        }

        get countDischarged():number{
            return this.byState.getAt("DISCHARGED", DEF_COL_NAME);
        }

        get countOpen():number{
            return this.byState.getAt("OPEN", DEF_COL_NAME);
        }



        public updateChart(scene, container: d3.Selection<any>) {
            const data: Array<NamedArray> = this.byPredicate.asNamedRowsTable();
            const colors: Array<string> = _.map(this.byPredicate.columnNames,
                (x) => "var(--kt-state-" + x.toLowerCase() + "-default-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors
                }
            );
        }

        public updatePoByDischargeChart(scene, container: d3.Selection<any>) {
            const data: Array<NamedArray> = this.byDischargeType.asNamedRowsTable();

            const colors: Array<string> = _.map(this.byDischargeType.columnNames,
                (x) => "var(--kt-state-discharged-" + x.toLowerCase() + "-bg)");
            kt.charts.updateChart(scene, container,
                {
                    data: data,
                    colors: colors
                }
            );
        }



    }
}
