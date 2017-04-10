module kt.charts {
    export interface ChartData {
        data: Array<kt.stats.NamedArray>;
        colors: Array<string>;
    }


    export function updateChart(container: d3.Selection<any>, chartData: ChartData) {
        const data = chartData.data;

        const summs = _.map(data, (x) => _.sum(x.values));
        const max: number = _.max(summs);

        const widthFunc = (val, col) => {
            let ret = Math.round(10000 * (val / max)) / 100.1;
            return ret;
        }

        const bgFunc = (val, index) => {
            return chartData.colors[index];//"var(--kt-state-" + states[index].toLowerCase() + "-default-bg)"
        }

        const ident = (d) => d;

        const rowname = (x) => x["name"];
        const rowvalues = (x) => x["values"];


        const setupBar = (element, clazz) => {
            return element
                .style("background-color", bgFunc)
                .style("width", (val, index) => widthFunc(val, index) + "%")
                .style("display", (val, index) => widthFunc(val, index) > 0 ? "block" : "none")
                .attr("title", ident);
        }

        //=============

        let rows = container.selectAll(".row").data(data, (d) => d.name);


        let newRows = rows.enter()
            .append("div").attr("class", "row")
            .style('opacity', 1.0);

        newRows.append("label")
            .text(rowname)
            .attr("title", rowname);



        let cells_in_new_rows = newRows.append("div")
            .attr("class", "bar-container");


        let cells = rows.select(".bar-container");

        let styleTween = function(transition, name, value) {
            transition.styleTween(name, function() {
                return d3.interpolate(this.style[name], value);
            });
        };

        let updateBars = (bars, clazz) => {
            /** UPDATE*/
            setupBar(bars, clazz);

            /** ENTER*/
            setupBar(
                bars.enter()
                    .append("a")
                    .attr("class", "bar " + clazz), clazz)


            /** EXIT*/
            bars.exit().remove();
        }

        updateBars(cells_in_new_rows.selectAll("a").data(rowvalues), "enter");
        updateBars(cells.selectAll("a").data(rowvalues), "update");


        //
        rows.exit()
            // .style('opacity', 1.0)
            // .transition()
            // .delay(10)
            // .duration(500)
            // .style('opacity', 0.0)
            .remove();


    }




}
