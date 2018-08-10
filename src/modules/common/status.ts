import { CProject } from "./globals";
import { JError } from "../../generated/kt-json";
import { pushUnique } from "./tools";


/**
 * https://github.com/kestreltechnology/electron-kt-advance/issues/50
 * 
 * 
 */
export interface ProjectStatus {
    contractFiles: number;
    assumptions: number;
    po: number;
    apps: number;
    errors: JError[];
    hasWarning: boolean;

    addError(file: string, message: string)
}



export class ProjectStatusImpl implements ProjectStatus {
    private _project: CProject;

    errors: JError[] = [];



    constructor(project: CProject) {
        this._project = project;
    }

    public addError(file: string, message: string) {
        let found: JError = null;
        for (let e of this.errors) {
            if (e.file == file) {
                found = e;
            }
        }
        if (found === null) {
            found = {
                file: file,
                messages: []
            };
            this.errors.push(found);
        }

        pushUnique(found.messages, message);

    }

    get contractFiles(): number {
        return this._project.contracts &&
            this._project.contracts.fileContracts &&
            this._project.contracts.fileContracts.length;
    }

    get apps(): number {
        return this._project.fs.apps.length;

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