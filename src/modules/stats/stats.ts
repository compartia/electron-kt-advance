import * as _ from "lodash";
import { NamedArray, StatsTable } from '../common/collections';
import { CFunction, DischargeDescriptions, FileInfo, HasLocation, HasPath, PoLevels, PoStates, ProofObligation } from '../common/xmltypes';
import { updateChart } from './chart';


/**
    @deprecated;
*/
const states = [
    "violation",
    "open",
    "discharged",
    "deadcode"
];


// const CPG = ["C", "P", "G"];


const COL_PRIMARY = "primary";

const DEF_COL_NAME = "count";


export class Stats {
    date: number;

    byPredicate: StatsTable<string>;
    byDischargeType: StatsTable<string>;
    byState: StatsTable<string>;
    byFunction: StatsTable<CFunction>;

    // complexityByFunction: StatsTable<CFunction>;
    byFile: StatsTable<HasLocation>;
    byFileLine: StatsTable<string>;

    // predicateByComplexity: StatsTable<string>;
    // complexityByFile: StatsTable<FileInfo>;

    assumptionsByFunction: StatsTable<CFunction>;
    inAssumptionsByFunction: StatsTable<CFunction>;

    dependenciesByFile: StatsTable<HasPath>;


    private _primaryPredicatesCount: StatsTable<string>;


    filteredOutCount: number;

    public getStatsByFileLine(file: string, line: number): { [key: string]: number } {
        return this.byFileLine.getRow(file + "//" + (line + 1));
    }

    public getStatsByFile(file: FileInfo): { [key: string]: number } {
        return this.byFile.getRow(file.relativePath);
    }

    public getStatsByFunction(func: CFunction): { [key: string]: number } {
        let functionKey = func.relativePath + "/" + func.name;
        return this.byFunction.getRow(functionKey);
    }

    public build(filteredProofObligations: ProofObligation[]) {
        this.date = Date.now();

        this.dependenciesByFile = new StatsTable<FileInfo>();

        this._primaryPredicatesCount = new StatsTable<string>();

        this.byPredicate = new StatsTable<string>();
        this.byDischargeType = new StatsTable<string>();
        this.byState = new StatsTable<string>();
        this.byFunction = new StatsTable<CFunction>();
        this.byFile = new StatsTable<HasLocation>();
        // this.complexityByFile = new StatsTable<FileInfo>();

        this.byFileLine = new StatsTable<string>();
        // this.predicateByComplexity = new StatsTable<string>();
        this.assumptionsByFunction = new StatsTable<CFunction>();
        this.inAssumptionsByFunction = new StatsTable<CFunction>();
        // this.complexityByFunction = new StatsTable<CFunction>();
        //

        this.byFile.columns = states;
        this.byFunction.columns = states;
        this.byPredicate.columns = states;


        let filteredPredicates: string[] = _.uniq(_.map(filteredProofObligations, (e: ProofObligation) => e.predicate)).sort();
        let filteredDiscahergeTypes: string[] = _.uniq(_.map(filteredProofObligations, (e: ProofObligation) => e.dischargeType)).sort();



        //populate with zeros
        for (let state of states) {
            for (let predicate of filteredPredicates) {
                this.byPredicate.inc(predicate, state, 0);
            }
        }

        //populate with zeros
        for (let dischargeType of filteredDiscahergeTypes) {
            if (!dischargeType) {
                dischargeType = "default";
            }
            dischargeType = dischargeType.toLowerCase();
            for (let state of states) {
                for (let level of PoLevels) {
                    this.byDischargeType.inc(dischargeType, state + "-" + dischargeType + "-" + level, 0);
                }
            }
        }



        for (let po of filteredProofObligations) {
            let functionKey = po.relativePath + "/" + po.functionName;
            let state: string = PoStates[po.state].toLowerCase();

            let fileLineKey = po.relativePath + "//" + po.location.line;
            this.byFileLine.inc(fileLineKey, state, 1);
            this.byFileLine.inc(fileLineKey, DEF_COL_NAME, 1);


            // this.predicateByComplexity.bind(po.predicate, po.predicate);

            this._primaryPredicatesCount.inc(po.predicate, po.level, 1);


            this.byPredicate.inc(po.predicate, state, 1);
            this.byPredicate.bind(po.predicate, po.predicate);
            //------------

            this.byFunction.inc(functionKey, state, 1);
            // this.byFunction.inc(functionKey, DEF_COL_NAME, 1);
            this.byFunction.bind(functionKey, po.cfunction);

            for (const type of ['aa', 'ga']) {
                if (po.assumptionsOut) {
                    let cntOut = po.assumptionsOut.filter(x => x.assumptionType === type).length;
                    this.assumptionsByFunction.inc(functionKey, type, cntOut);
                    this.dependenciesByFile.inc(po.relativePath, type, cntOut);
                }

                if (po.assumptionsIn) {
                    let cntIn = po.assumptionsIn.filter(x => x.assumptionType === type).length;
                    this.assumptionsByFunction.inc(functionKey, type, cntIn);
                    this.dependenciesByFile.inc(po.relativePath, type, cntIn);
                }
            }

            this.assumptionsByFunction.bind(functionKey, po.cfunction);
            this.dependenciesByFile.bind(po.relativePath, po);

            //------------
            this.byFile.inc(po.relativePath, state, 1);
            this.byFile.bind(po.relativePath, po);
            //------------
            this.byState.inc(state, DEF_COL_NAME, 1);
            this.byState.bind(state, state);
            //-----------
            if (po.isDischarged() || po.isViolation()) {
                let dischargeType: string = po.dischargeType;
                if (!dischargeType)
                    dischargeType = "default";

                dischargeType = dischargeType.toLowerCase();

                //example: -violation-ds-primary-
                this.byDischargeType.inc(dischargeType, state + "-" + dischargeType + "-" + po.level, 1);
                this.byDischargeType.bind(dischargeType, dischargeType);
            }
        }


        console.info("stats build o:" + this.countOpen + " v:" + this.countViolations + " d:" + this.countDischarged);

    }


    get countViolations(): number {
        return this.byState.getAt(PoStates[PoStates.violation], DEF_COL_NAME);
    }

    get countFilteredOut(): number {
        return this.filteredOutCount;
    }

    get countDischarged(): number {
        return this.byState.getAt(PoStates[PoStates.discharged], DEF_COL_NAME);
    }

    get countOpen(): number {
        return this.byState.getAt(PoStates[PoStates.open], DEF_COL_NAME);
    }



    public updateChart(scene, container: d3.Selection<any>) {
        const table = this.byPredicate;
        const columnNames = table.columnNames;
        const data: NamedArray<string>[] = table.asNamedRowsTable();

        updateChart(scene, container,
            {
                data: data,
                colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-default-bg)",
                columnNames: columnNames,
                label: x => x.name,
                max: null
            }
        );
    }

    public updatePoByDischargeChart(scene, container: d3.Selection<any>) {
        const table = this.byDischargeType;
        const columnNames = table.columnNames;
        const data: Array<NamedArray<string>> = table.asNamedRowsTable();

        updateChart(scene, container,
            {
                data: data,
                colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-bg)",
                columnNames: columnNames,
                label: x => DischargeDescriptions[x.name],
                max: null
            }
        );
    }


    public updatePoByFunctionChart(maxRows: number, scene, container: d3.Selection<any>) {
        const table = this.byFunction;
        const columnNames = table.columnNames;
        const data: Array<NamedArray<CFunction>> = table.getTopRows(maxRows);


        updateChart(scene, container,
            {
                data: data,
                colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-default-bg)",
                columnNames: columnNames,
                label: x => x.object.relativePath + "/" + x.object.name,
                max: null
            }
        );
    }

    public updateAssumptionsByFunctionChart(maxRows: number, scene, container: d3.Selection<any>) {
        const table = this.assumptionsByFunction;
        const columnNames = table.columnNames;
        const data: Array<NamedArray<CFunction>> = table.getTopRows(maxRows);

        updateChart(scene, container,
            {
                data: data,
                colors: (x, index) => "var(--kt-state-assumption-" + columnNames[index] + "-bg)",
                columnNames: columnNames,
                label: x => x.object.relativePath + "/" + x.object.name,
                max: null
            }
        );
    }


    public updateDependenciesByFileChart(maxRows: number, scene, container: d3.Selection<any>) {
        const table = this.dependenciesByFile;
        const columnNames = table.columnNames;
        const data: Array<NamedArray<HasPath>> = table.getTopRows(maxRows);

        updateChart(scene, container,
            {
                data: data,
                colors: (x, index) => "var(--kt-state-assumption-" + columnNames[index] + "-bg)",
                columnNames: columnNames,
                label: (x: NamedArray<HasPath>) => {
                    return x.object.relativePath;
                },
                max: null
            }
        );
    }


    public updateInAssumptionsByFunctionChart(maxRows: number, scene, container: d3.Selection<any>) {
        const table = this.inAssumptionsByFunction;
        const columnNames = table.columnNames;
        const data: Array<NamedArray<CFunction>> = table.getTopRows(maxRows);

        updateChart(scene, container,
            {
                data: data,
                colors: (x, index) => "var(--kt-state-assumption-" + columnNames[index] + "-bg)",
                columnNames: columnNames,
                label: (x: NamedArray<CFunction>) => {
                    return x.object.relativePath;
                },

                max: null
            }
        );
    }


    public updatePoByFileChart(scene, container: d3.Selection<any>) {
        const table = this.byFile;
        const columnNames = table.columnNames;
        const data: Array<NamedArray<HasPath>> = table.getTopRows(10);

        updateChart(scene, container,
            {
                data: data,
                colors: (x, index) => "var(--kt-state-" + columnNames[index] + "-default-bg)",
                columnNames: columnNames,
                label: (x: NamedArray<HasPath>) => {
                    return x.object.relativePath;
                },
                max: null
            }
        );
    }



}
