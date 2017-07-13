const globals = require('./modules/common/globals');
const model = require('xml-kt-advance/lib/model/po_node');
const palette = require('./modules/common/palette');
const filter = require('./modules/common/filter');
const treeview = require('./modules/treeview/treeview');
const collections = require('./modules/common/collections');
const graph_builder = require('./modules/graph_builder');


const graph  = require('./modules/tf_graph_common/lib/graph');

const graphutil = require('./modules/tf_graph_common/lib/util');
const render = require('./modules/tf_graph_common/lib/render');
const layout = require('./modules/tf_graph_common/lib/layout');
const scene = require('./modules/tf_graph_common/lib/scene/scene');
const scenenode = require('./modules/tf_graph_common/lib/scene/node');
const sceneedge = require('./modules/tf_graph_common/lib/scene/edge');

const hierarchy  = require('./modules/tf_graph_common/lib/hierarchy');


const PO_FILTER = filter.PO_FILTER;


const {ipcRenderer} = require('electron')

function initApp(): void {
    console.info("init app");

    ipcRenderer.on('project-open', (event, prj) => {
        let project = new globals.Project(prj.baseDir);
        (<any>document.getElementById("loader")).fire("project-selected", project);
    })

}


initApp();
