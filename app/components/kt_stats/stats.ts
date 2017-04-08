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
            return this.data[row][column];
        }
    }

    interface NamedArray {
        name: string;
        values: Array<number>;
    }

    export class Stats {

        byPredicate: StatsTable;


        public build(project: kt.Globals.Project) {
            this.byPredicate = new StatsTable();

            //XXX: do not do this everytime, just cache it per project
            let allPredicates = _.uniq(_.map(project.proofObligations, (e) => e.predicate)).sort();

            //popolate with zeros
            for (let state of states) {
                for (let predicate of allPredicates) {
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

            const data: Array<NamedArray> = this.byPredicate.asNamedRowsTable();

            const summs = this.byPredicate.summs;
            const max = _.max(summs);

            const widthFunc = (val, col) => {
                let ret = Math.round(10000 * (val / max)) / 100.1;
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
