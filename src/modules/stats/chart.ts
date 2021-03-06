import { NamedArray } from "../common/collections";

export interface ChartData<X> {
    data: Array<NamedArray<X>>;
    colors: (x: NamedArray<X>, index: number) => string;
    columnNames: Array<string>;
    label: (x: NamedArray<X>) => string;
    max: number;
}


export function updateChart<X>(
    scene,
    container: d3.Selection<any>,
    chartData: ChartData<X>,
    format = d3.format(",.0f")) {

    const data = chartData.data;


    let max: number = chartData.max;
    if (!max) {
        let summs = _.map(data, (x) => _.sum(x.values));
        max = _.max(summs);
    }


    const widthFunc = (val, col) => {
        let ret = Math.round(10000 * (val / max)) / 100.1;
        return ret;
    }

    const bgFunc = (val, index) => {
        return chartData.colors(val, index);
    }

    const colName = (index) => {
        return chartData.columnNames[index];
    }

    const ident = (d) => d;

    const rowname = (x) => {
        // x["name"]
        if (chartData.label) {
            return chartData.label(x);
        } else {
            return x["name"];
        }
    };

    const rowtitle = (x) => {
        return x["name"];
    };

    const rowSum = (x) => {
        return format(_.sum(x["values"]));
    }

    const rowvalues = (x) => {
        let _values = x["values"];
        let _name = x["name"];
        let _obj = x["object"];
        return _.map(
            _values,
            (k) => {
                return {
                    val: k,
                    name: _name,
                    object: _obj

                };
            });
    };


    const setupBar = (element, clazz) => {
        return element
            .style("background-color", bgFunc)
            .style("width", (val, index) => widthFunc(val.val, index) + "%")
            .style("display", (val, index) => widthFunc(val.val, index) > 0 ? "inline-block" : "none")
            .attr("title", (val, index) => colName(index) + ":" + format(val.val));
    }

    //=============

    container.selectAll(".row").remove();//to keep sorting


    let rows = container.selectAll(".row").data(data, (d) => d.name);


    let newRows = rows.enter()
        .append("div").attr("class", "row highlightable")
        .style('opacity', 1.0)
        .on('click', (d, i, a) => {
            (<Event>d3.event).stopPropagation();
            scene.fire('chart-row-selected', {
                src: container.node(),
                data: d,
                row: d.object,
                index: i,
                a: a
            });
        });

    newRows.append("label")
        .text(rowname)
        .attr("title", rowtitle);

    newRows.append("div")
        .text(rowSum)
        .attr("class", "value");



    let cells_in_new_rows = newRows.append("div")
        .attr("class", "bar-container");


    let cells = rows.select(".bar-container");


    let updateBars = (bars, clazz) => {
        /** UPDATE*/
        setupBar(bars, clazz);

        /** ENTER*/
        setupBar(
            bars.enter()
                .append("a")
                .attr("class", "bar " + clazz), clazz)

            .on('click', (d, i, a) => {
                (<Event>d3.event).stopPropagation();
                scene.fire('chart-bar-selected', {
                    src: container.node(),
                    row: d.object,
                    value: d.val,
                    index: i,
                    a: a
                });
            });



        /** EXIT*/
        bars.exit().remove();
    }


    updateBars(cells_in_new_rows.selectAll("a").data(rowvalues), "enter");
    updateBars(cells.selectAll("a").data(rowvalues), "update");


    //
    rows.exit()
        .remove();


}

