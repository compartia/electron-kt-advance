var kt;
(function (kt) {
    var stats;
    (function (stats) {
        var states = [
            "VIOLATION",
            "OPEN",
            "DISCHARGED"
        ];
        var Stats = (function () {
            function Stats() {
            }
            Stats.prototype.build = function (project) {
                console.info("building statistics");
                this.byPredicate = {};
                this._predicates = _.uniq(_.map(project.proofObligations, function (e) { return e.predicate; })).sort();
                for (var _i = 0, states_1 = states; _i < states_1.length; _i++) {
                    var state = states_1[_i];
                    for (var _a = 0, _b = this._predicates; _a < _b.length; _a++) {
                        var predicate = _b[_a];
                        this.inc(this.byPredicate, state, predicate, 0);
                    }
                }
                for (var _c = 0, _d = project.filteredProofObligations; _c < _d.length; _c++) {
                    var po = _d[_c];
                    this.inc(this.byPredicate, po.state, po.predicate, 1);
                }
            };
            Stats.prototype.inc = function (data, datasetKey, key, increment) {
                if (!data[datasetKey]) {
                    data[datasetKey] = {};
                }
                var dataset = data[datasetKey];
                if (!dataset[key]) {
                    dataset[key] = increment;
                }
                else {
                    dataset[key] += increment;
                }
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
