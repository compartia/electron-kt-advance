module kt.stats {


    const states = [
        "VIOLATION",
        "OPEN",
        "DISCHARGED"
    ];


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

        /**
        example:
        [["row1name", 3,2,3,]
        ["row2name", 4,2,3,]
        ["row3name", 5,2,3,]
        ]
        */
        public asNamedRowsTable(): Array<Array<string | number>> {
            let rows = Object.keys(this.data);
            let columns = this.columnNames;

            let ret = new Array<Array<string | number>>();

            for (let rowName of rows) {
                let row = new Array<string | number>();
                row.push(rowName);
                ret.push(row);
                for (let col of columns) {
                    row.push(this.getAt(rowName, col));
                }
            }

            return ret;
        }

        /**
            returns a vector Vi, where each value is a summ of row values
        */
        get summs(): Array<number> {
            return _.map(this.asTable(), (x) => _.sum(x));
        }

        public asTable(): Array<Array<number>> {
            let rows = Object.keys(this.data);
            let columns = this.columnNames;

            let ret = new Array<Array<string | number>>();

            for (let rowName of rows) {
                let row = new Array<string | number>();
                ret.push(row);
                for (let col of columns) {
                    row.push(this.getAt(rowName, col));
                }
            }

            return ret;
        }

        public getAt(row: string, column: string): number {
            return this.data[row][column];
        }
    }

    export class Stats {

        byPredicate: StatsTable;
        _predicates: Array<any>;

        public build(project: kt.Globals.Project) {
            console.info("building statistics");
            this.byPredicate = new StatsTable();

            this._predicates = _.uniq(_.map(project.proofObligations, (e) => e.predicate)).sort();

            //popolate with zeros
            for (let state of states) {
                for (let predicate of this._predicates) {
                    this.byPredicate.inc(predicate, state, 0);
                }
            }

            for (let po of project.filteredProofObligations) {
                this.byPredicate.inc(po.predicate, po.state, 1);
            }

        }



        public updateChart(container: d3.Selection<any>) {
            const t = d3.transition()
                .duration(750);

            const table = this.byPredicate.asNamedRowsTable();
            const data = _.map(table, (x) => {
                return {
                    "values": x.splice(1),
                    "name": x[0]
                }
            });
            const summs = this.byPredicate.summs;
            const max = _.max(summs);

            const widthFunc = (val, col) => {
                let ret = Math.round(10000 * (val / max)) / 100.1;
                console.info(ret);
                return ret;
            }

            const bgFunc = (val, index) => {
                return "var(--kt-state-" + states[index].toLowerCase() + "-default-bg)"
            }

            const ident = (d) => d;

            const rowname = (x) => x["name"];
            const rowvalues = (x) => x["values"];


            const setupBar = (element) => {
                element
                    .style("background-color", bgFunc)
                    .attr("class", "bar")
                    .style("width", (val, index) => widthFunc(val, index) + "%")
                    .style("display", (val, index) => widthFunc(val, index) > 0 ? "block" : "none")
                    .attr("title", ident);
            }

            //=============

            let rows = container.selectAll(".row").data(data, (d) => d.name);


            let newRows = rows.enter()
                .append("div").attr("class", "row");

            newRows.append("label")
                .text(rowname)
                .attr("title", rowname);



            let cells_in_new_rows = newRows.append("div")
                .attr("class", "bar-container");


            let cells = rows.select(".bar-container");

            let updateBars = (bars) => {
                /** UPDATE*/
                setupBar(bars);

                /** ENTER*/
                setupBar(
                    bars.enter()
                        .append("a")
                        .style('opacity', 0.0)
                        .transition()
                        .delay(10)
                        .duration(500)
                        .style('opacity', 1.0));

                /** EXIT*/
                bars.exit().remove();
            }

            updateBars(cells_in_new_rows.selectAll("a").data(rowvalues));
            updateBars(cells.selectAll("a").data(rowvalues));


            //
            rows.exit()
                .transition()
                .delay(10)
                .duration(500)
                .style('opacity', 0.0)
                .remove();


        }



    }
}
