var kt;
(function (kt) {
    var stats;
    (function (stats) {
        var Stats = (function () {
            function Stats() {
            }
            Stats.prototype.build = function (project) {
                console.info("building statistics");
                this.byPredicate = {};
                for (var _i = 0, _a = project.proofObligations; _i < _a.length; _i++) {
                    var po = _a[_i];
                    this.inc(this.byPredicate, po.state, po.predicate);
                }
            };
            Stats.prototype.inc = function (data, datasetKey, key) {
                if (!data[datasetKey]) {
                    data[datasetKey] = {};
                }
                var dataset = data[datasetKey];
                if (!dataset[key]) {
                    dataset[key] = 1;
                }
                else {
                    dataset[key]++;
                }
            };
            Object.defineProperty(Stats.prototype, "chartDataPredicatesByState", {
                get: function () {
                    var colors = ["--kt-yellow", "--kt-yellow", "--kt-yellow"];
                    var ret = [];
                    for (var stateKey in this.byPredicate) {
                        var state = this.byPredicate[stateKey];
                        var byStateData = {
                            key: state,
                            values: [],
                            color: "var(--kt-red)"
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
