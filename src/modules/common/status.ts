import { CProject } from "./globals";


/**
 * https://github.com/kestreltechnology/electron-kt-advance/issues/50
 * 
 * 
 */
export interface ProjectStatus {
    contractFiles: number;
    assumptions: number;
    po: number;
    errors: string[];
    hasWarning: boolean;
}



export class ProjectStatusImpl implements ProjectStatus {
    private _project: CProject;

    errors: string[];


    constructor(project: CProject) {
        this._project = project;
    }

    get contractFiles(): number {
        return this._project.contracts &&
            this._project.contracts.fileContracts &&
            this._project.contracts.fileContracts.length;
    }

    get assumptions(): number {
        return this._project.assumptions &&
            this._project.assumptions.length;
    }

    get po(): number {
        return this._project.proofObligations &&
            this._project.proofObligations.length;
    }

    get hasWarning(): boolean {
        return !(this.contractFiles > 0 && this.assumptions > 0 && this.po > 0 && this.errors.length == 0);
    }
}