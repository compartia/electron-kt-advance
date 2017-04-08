var kt;
(function (kt) {
    var stats;
    (function (stats) {
        var states = [
            "VIOLATION",
            "OPEN",
            "DISCHARGED"
        ];
        var StatsTable = (function () {
            function StatsTable() {
                this.data = {};
                this.columnNames = new Array();
            }
            StatsTable.prototype.inc = function (row, column, increment) {
                var data = this.data;
                if (!data[row]) {
                    data[row] = {};
                }
                var dataset = data[row];
                if (!dataset[column]) {
                    dataset[column] = increment;
                }
                else {
                    dataset[column] += increment;
                }
                if (!_.contains(this.columnNames, column)) {
                    this.columnNames.push(column);
                }
            };
            StatsTable.prototype.asNamedRowsTable = function () {
                var rows = Object.keys(this.data);
                var columns = this.columnNames;
                var ret = new Array();
                for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                    var rowName = rows_1[_i];
                    var row = new Array();
                    row.push(rowName);
                    ret.push(row);
                    for (var _a = 0, columns_1 = columns; _a < columns_1.length; _a++) {
                        var col = columns_1[_a];
                        row.push(this.getAt(rowName, col));
                    }
                }
                return ret;
            };
            Object.defineProperty(StatsTable.prototype, "summs", {
                get: function () {
                    return _.map(this.asTable(), function (x) { return _.sum(x); });
                },
                enumerable: true,
                configurable: true
            });
            StatsTable.prototype.asTable = function () {
                var rows = Object.keys(this.data);
                var columns = this.columnNames;
                var ret = new Array();
                for (var _i = 0, rows_2 = rows; _i < rows_2.length; _i++) {
                    var rowName = rows_2[_i];
                    var row = new Array();
                    ret.push(row);
                    for (var _a = 0, columns_2 = columns; _a < columns_2.length; _a++) {
                        var col = columns_2[_a];
                        row.push(this.getAt(rowName, col));
                    }
                }
                return ret;
            };
            StatsTable.prototype.getAt = function (row, column) {
                return this.data[row][column];
            };
            return StatsTable;
        }());
        stats.StatsTable = StatsTable;
        var Stats = (function () {
            function Stats() {
            }
            Stats.prototype.build = function (project) {
                console.info("building statistics");
                this.byPredicate = new StatsTable();
                this._predicates = _.uniq(_.map(project.proofObligations, function (e) { return e.predicate; })).sort();
                for (var _i = 0, states_1 = states; _i < states_1.length; _i++) {
                    var state = states_1[_i];
                    for (var _a = 0, _b = this._predicates; _a < _b.length; _a++) {
                        var predicate = _b[_a];
                        this.byPredicate.inc(predicate, state, 0);
                    }
                }
                for (var _c = 0, _d = project.filteredProofObligations; _c < _d.length; _c++) {
                    var po = _d[_c];
                    this.byPredicate.inc(po.predicate, po.state, 1);
                }
            };
            Stats.prototype.updateChart = function (container) {
                var t = d3.transition()
                    .duration(750);
                var table = this.byPredicate.asNamedRowsTable();
                var data = _.map(table, function (x) {
                    return {
                        "values": x.splice(1),
                        "name": x[0]
                    };
                });
                var summs = this.byPredicate.summs;
                var max = _.max(summs);
                var widthFunc = function (val, col) {
                    var ret = Math.round(10000 * (val / max)) / 100.1;
                    console.info(ret);
                    return ret;
                };
                var bgFunc = function (val, index) {
                    return "var(--kt-state-" + states[index].toLowerCase() + "-default-bg)";
                };
                var ident = function (d) { return d; };
                var rowname = function (x) { return x["name"]; };
                var rowvalues = function (x) { return x["values"]; };
                var setupBar = function (element) {
                    element
                        .style("background-color", bgFunc)
                        .attr("class", "bar")
                        .style("width", function (val, index) { return widthFunc(val, index) + "%"; })
                        .style("display", function (val, index) { return widthFunc(val, index) > 0 ? "block" : "none"; })
                        .attr("title", ident);
                };
                var rows = container.selectAll(".row").data(data, function (d) { return d.name; });
                var newRows = rows.enter()
                    .append("div").attr("class", "row");
                newRows.append("label")
                    .text(rowname)
                    .attr("title", rowname);
                var cells_in_new_rows = newRows.append("div")
                    .attr("class", "bar-container");
                var cells = rows.select(".bar-container");
                var updateBars = function (bars) {
                    setupBar(bars);
                    setupBar(bars.enter()
                        .append("a")
                        .style('opacity', 0.0)
                        .transition()
                        .delay(10)
                        .duration(500)
                        .style('opacity', 1.0));
                    bars.exit().remove();
                };
                updateBars(cells_in_new_rows.selectAll("a").data(rowvalues));
                updateBars(cells.selectAll("a").data(rowvalues));
                rows.exit()
                    .transition()
                    .delay(10)
                    .duration(500)
                    .style('opacity', 0.0)
                    .remove();
            };
            Object.defineProperty(Stats.prototype, "chartDataPredicatesByState", {
                get: function () {
                    var ret = [];
                    for (var stateKey in this.byPredicate) {
                        var state = this.byPredicate[stateKey];
                        var byStateData = {
                            key: stateKey,
                            values: [],
                            color: "var(--kt-state-" + stateKey.toLowerCase() + "-default-bg)"
                        };
                        ret.push(byStateData);
                        for (var predicateKey in state) {
                            var predicateVal = state[predicateKey];
                            byStateData.values.push({
                                label: predicateKey,
                                value: predicateVal
                            });
                        }
                    }
                    return ret;
                },
                enumerable: true,
                configurable: true
            });
            return Stats;
        }());
        stats.Stats = Stats;
    })(stats = kt.stats || (kt.stats = {}));
})(kt || (kt = {}));
