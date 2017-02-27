var graphlib = require("graphlib");
var _ = require("lodash");

window["d3"] = require('d3');
var d3 = window["d3"];


var graph = require('./components/tf_graph_common/lib/graph');
var proto = require('./components/tf_graph_common/lib/proto');
var hierarchy = require('./components/tf_graph_common/lib/hierarchy');
var render = require('./components/tf_graph_common/lib/render');
var layout = require('./components/tf_graph_common/lib/layout');



function initApp() {
    initAppMenu();
}


function initAppMenu() {
}
