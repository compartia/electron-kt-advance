var graph = require('./components/tf_graph_common/lib/graph');
var proto = require('./components/tf_graph_common/lib/proto');
var hierarchy = require('./components/tf_graph_common/lib/hierarchy');
var render = require('./components/tf_graph_common/lib/render');
var layout = require('./components/tf_graph_common/lib/layout');

const {ipcRenderer} = require('electron')


function initApp(): void {
    console.info("init app");

    ipcRenderer.on('project-open', (event, prj) => {
        let project = new kt.Globals.Project(prj.baseDir);
        (<any>document.getElementById("loader")).fire("project-selected", project);
    })

}


initApp();
