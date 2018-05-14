import * as _ from "lodash"

// import *  as xml from 'xml-kt-advance/lib/xml/xml_types';
import { FileInfo, CFunction, ProofObligation, PoLevels, PoStates, HasPath, HasLocation } from '../common/xmltypes'
// import { ApiNode } from 'xml-kt-advance/lib/model/api_node';
import { updateChart } from './chart';


// import { CProject } from '../common/globals';
import { StatsTable, NamedArray } from '../common/collections';



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
        let functionKey = func.file + "/" + func.name;
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
            let functionKey = po.file + "/" + po.functionName;
            let state: string = PoStates[po.state].toLowerCase();

            let fileLineKey = po.file + "//" + po.location.line;
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

            po.assumptionsIn && this.assumptionsByFunction.inc(functionKey, "api", po.assumptionsIn.length);
            po.assumptionsOut && this.assumptionsByFunction.inc(functionKey, "api", po.assumptionsOut.length);

            po.assumptionsIn && this.dependenciesByFile.inc(po.file, "api", po.assumptionsIn.length);
            po.assumptionsOut && this.dependenciesByFile.inc(po.file, "api", po.assumptionsOut.length);




            this.assumptionsByFunction.bind(functionKey, po.cfunction);
            this.dependenciesByFile.bind(po.file, po);

            // for (let cCode of CPG) {
            //     this.complexityByFunction.inc(functionKey, Complexitiy[Complexitiy[cCode]], po.complexity[Complexitiy[cCode]]);
            //     this.complexityByFile.inc(po.file, Complexitiy[Complexitiy[cCode]], po.complexity[Complexitiy[cCode]]);
            //     this.predicateByComplexity.inc(po.predicate, Complexitiy[Complexitiy[cCode]], po.complexity[Complexitiy[cCode]]);
            // }


            // this.complexityByFile.inc(po.cfunction.fileInfo.relativePath, po.level, 1);
            // this.complexityByFile.bind(po.cfunction.fileInfo.relativePath, po.cfunction.fileInfo);

            // this.complexityByFunction.inc(functionKey, po.level, 1);
            // this.complexityByFunction.bind(functionKey, po.cfunction);
            //------------
            this.byFile.inc(po.file , state, 1);
            this.byFile.bind(po.file, po);
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


        // this.complexityByFile.divideColumnsByColumn(CPG, this.complexityByFile, COL_PRIMARY);
        // this.predicateByComplexity.divideColumnsByColumn(CPG, this._primaryPredicatesCount, COL_PRIMARY);
        // this.complexityByFunction.divideColumnsByColumn(CPG, this.complexityByFunction, COL_PRIMARY);


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
                label: x => x.name,
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
                label: x => x.object.file + "/" + x.object.name,
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
                label: x => x.object.file + "/" + x.object.name,
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


    // public updatePredicateByComplexityChart(scene, container: d3.Selection<any>) {
    //     const table = this.predicateByComplexity;
    //     const columnNames = ["P"];
    //     const data: Array<NamedArray<string>> = table.getRowsSorted(columnNames);


    //     updateChart(scene, container,
    //         {
    //             data: data,
    //             colors: (x, i) => "var(--kt-complexity-" + columnNames[i].toLowerCase() + "-bg)",
    //             columnNames: columnNames,
    //             label: x => x.name,
    //             max: null
    //         },
    //         d3.format(".2f")
    //     );
    // }




    // public updatComplexityByFunctionChart(
    //     showColumns: string[],
    //     maxRows: number,
    //     scene,
    //     container: d3.Selection<any>) {


    //     const table = this.complexityByFunction;
    //     const columnNames: string[] = showColumns;
    //     const data: Array<NamedArray<xml.CFunction>>
    //         = table.getTopRows(maxRows, columnNames);


    //     updateChart(
    //         scene,
    //         container,
    //         {
    //             data: data,
    //             colors: (x, i) => "var(--kt-complexity-" + columnNames[i].toLowerCase() + "-bg)",
    //             columnNames: columnNames,
    //             label: (x: NamedArray<xml.CFunction>) => x.object.name,
    //             max: null
    //         },
    //         d3.format(".2f")
    //     );
    // }

    // public updatComplexityByFileChart(columnNames: string[], maxRows: number, scene, container: d3.Selection<any>) {
    //     const table = this.complexityByFile;
    //     const data: Array<NamedArray<xml.FileInfo>> = table.getTopRows(maxRows, columnNames);


    //     updateChart(scene, container,
    //         {
    //             data: data,
    //             colors: (x, i) => "var(--kt-complexity-" + columnNames[i].toLowerCase() + "-bg)",
    //             columnNames: columnNames,
    //             label: (x: NamedArray<xml.FileInfo>) => x.object.name,
    //             max: null
    //         },
    //         d3.format(".2f")
    //     );
    // }






}
