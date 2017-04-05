module kt.stats {



    const states = [
        "VIOLATION",
        "OPEN",
        "DISCHARGED"
    ];
    
    export class Stats {

        byPredicate: {};
        _predicates: Array<any>;

        public build(project: kt.Globals.Project) {
            console.info("building statistics");
            this.byPredicate = {};

            this._predicates = _.uniq(_.map(project.proofObligations, (e) => e.predicate)).sort();

            for (let state of states) {
                for (let predicate of this._predicates) {
                    this.inc(this.byPredicate, state, predicate, 0);
                }
            }

            for (let po of project.filteredProofObligations) {
                this.inc(this.byPredicate, po.state, po.predicate, 1);
            }

        }

        private inc(data: any, datasetKey: string, key: string, increment: number) {
            if (!data[datasetKey]) {
                data[datasetKey] = {};
            }
            let dataset = data[datasetKey];
            if (!dataset[key]) {
                dataset[key] = increment;
            } else {
                dataset[key] += increment;
            }
        }

        get chartDataPredicatesByState() {
            let ret = [];

            for (let stateKey in this.byPredicate) {

                let state = this.byPredicate[stateKey];

                let byStateData = {
                    key: stateKey,
                    values: [],
                    color: "var(--kt-state-" + stateKey.toLowerCase() + "-default-bg)"
                };

                ret.push(byStateData);
                for (let predicateKey in state) {
                    let predicateVal = state[predicateKey];
                    byStateData.values.push(
                        {
                            label: predicateKey,
                            value: predicateVal
                        }
                    );
                }

            }

            return ret;
        }


    }
}
