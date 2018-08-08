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
}



export class ProjectStatusImpl implements ProjectStatus {
    private _project: CProject;

    constructor(project: CProject) {
        this._project = project;
    }

    get contractFiles(): number {
        return this._project.contracts.fileContracts.length;
    }

    get assumptions(): number {
        return this._project.assumptions.length;
    }

    get po(): number {
        this._project.functionByFile
        return this._project.proofObligations.length;
    }
}