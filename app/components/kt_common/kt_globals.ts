
module kt.Globals {


    export class Project {
        functionByFile: { [key: string]: Array<kt.xml.CFunction> } = {};
    }

    export var TABS = [
        'summary', 'source', 'proof obligations', 'assumptions', 'graphs'
    ];


    export var CWD: string = null;
    export var project: Project = new Project();

}
