module kt.stats {
    export class Stats {

        byPredicate: {};

        public build(project: kt.Globals.Project) {
            console.info("building statistics");
            this.byPredicate = {};

            for (let po of project.proofObligations) {
                // this.inc("by predicate", po.predicate);
                this.inc(this.byPredicate, po.state, po.predicate);
                // this.inc(po.predicate + "." + po.state + "." + po.level);
            }

            // console.info(this.data);
        }

        private inc(data: any, datasetKey: string, key: string) {
            if (!data[datasetKey]) {
                data[datasetKey] = {};
            }
            let dataset = data[datasetKey];
            if (!dataset[key]) {
                dataset[key] = 1;
            } else {
                dataset[key]++;
            }
        }

        get chartDataPredicatesByState() {
            const colors=["--kt-yellow", "--kt-yellow", "--kt-yellow"];

            let ret = [];

            for (let stateKey in this.byPredicate) {
                let state = this.byPredicate[stateKey];
                let byStateData = {
                    key: state,
                    values: [],
                    color: "var(--kt-red)"
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
