declare function require(name: string);

var d3 = require('d3');
var fs = require('fs');
var numeral = require('numeral');
var dagreD3 = require('dagre-d3')

function addFuncNode(key: string, g, po) {
    var html = "<div class='po level-" + po["level"] + " state-" + po["state"] + "'>"
    html += "<span class='func'>" + po["functionName"] + "</span><br>"
    html += "<span class='predicate'>" + po["predicateType"] + " : <span class='level'> </span> </span>"
    html += "<div class='message'>" + po["shortDescription"] + "</div>"
    html += "</div>"

    g.setNode(key, {
        labelType: "html",
        label: html,
        padding: 0,
        rx: 2,
        ry: 2
    });

}


function addRefNode(key: string, g, po) {
    //"<a>" + po["file"] + "</a><br>"
    var html = "<div class='po level-" + po["level"] + " state-" + po["state"] + "'>";
    html += "<span class='func'>" + po["targetFuncName"] + "</span><br>";
    html += "<span class='message'>" + po["message"] + "</span>";
    html += "</div>";

    g.setNode(key, {
        labelType: "html",
        label: html,
        padding: 0,
        rx: 2,
        ry: 2
    });

}

function addJsonNodes(groupkey: string, filename: string, g, addRoot: boolean) {

    if (addRoot) {
        g.setNode(groupkey, {
            style: "fill: #ffffff",
            label: groupkey,
            rx: 2,
            ry: 2
        });
    }

    var json = fs.readFileSync(filename, {
        encoding: 'utf-8'
    })
    var parsed = JSON.parse(json);
    var pos = parsed["posByKey"]["map"];

    var has_assumptions = [];
    var poByRef = {};
    Object.keys(pos).forEach(function(key) {
        var value = pos[key][0];
        if (value["references"].length > 0) {
            has_assumptions.push(value)
        }
        poByRef[value["referenceKey"]] = value;
    });

    // console.log(Object.keys(poByRef).length);

    var counter = {}
    for (let ppo of has_assumptions) {

        //var label1 = ppo["functionName"];
        var label1 = ppo["referenceKey"];

        if (addRoot) {
            g.setEdge(groupkey, label1, {
                style: "stroke: #f66; stroke-width: " + 1 + "px; stroke-dasharray: 5, 5;"
            });
        }

        // g.setNode(label1, {
        //     style: "fill: #afa"
        // });
        addFuncNode(label1, g, ppo);


        for (let ref of ppo["references"]) {

            //var label2 = ref["targetFuncName"];
            var label2 = ref["referenceKey"];

            var refPo = poByRef[ref["referenceKey"]];
            if (refPo) {
                addFuncNode(label2, g, refPo);
            } else {
                addRefNode(label2, g, ref);
                console.error("PO with referenceId = "+ref["referenceKey"]+" no found");
                console.error(ref);
            }

            var ekey = label2 + "---" + label1
            if (counter[ekey])
                counter[ekey] += 1;
            else {
                counter[ekey] = 1;
            }
            var w = counter[ekey];
            var lab = w == 1 ? "" : "" + w + " " + ref["predicate"]
            g.setEdge(label2, label1, {
                label: lab,
                lineInterpolate: 'basis',
                style: "stroke-width: " + Math.log(w + 1) + "px;"
            });
        }


    }
}

function treemapChart(svg) {

    // Create the graph
    var g = new dagreD3.graphlib.Graph().setGraph({});

    g.graph().rankdir = "LR";
    g.graph().ranker = "longest-path";
    // addJsonNodes(
    //     "wrong_arguments_func_pointer.c",
    //     "/Users/artem/work/KestrelTechnology/IN/itc-benchmarks/01.w_Defects/kt_analysis_export_5.6.1/wrong_arguments_func_pointer.c.json",
    //     g,
    //     true
    // );

    // addJsonNodes(
    //     "uninit_memory_access.c",
    //     "/Users/artem/work/KestrelTechnology/IN/itc-benchmarks/01.w_Defects/kt_analysis_export_5.6.1/uninit_memory_access.c.json",
    //     g,
    //     true
    // );

    addJsonNodes(
        "cache.c",
        "/Users/artem/work/KestrelTechnology/IN/dnsmasq/kt_analysis_export_5.6.1/src/cache.c.json",
        g,
        false
    );

    // addJsonNodes(
    //     "forward.c",
    //     "/Users/artem/work/KestrelTechnology/IN/dnsmasq/kt_analysis_export_5.6.1/src/forward.c.json",
    //     g,
    //     false
    // );



    // Create the renderer
    var zoom = d3.behavior.zoom().on("zoom", function() {
        inner.attr("transform", "translate(" + d3.event.translate + ")" +
            "scale(" + d3.event.scale + ")");
    });
    svg.call(zoom);


    var render = new dagreD3.render();
    var inner = svg.append("g");

    // Run the renderer. This is what draws the final graph.
    render(inner, g);

    // Center the graph
    var xCenterOffset = (svg.attr("width") - g.graph().width) / 2;
    inner.attr("transform", "translate(" + xCenterOffset + ", 20)");
    svg.attr("height", g.graph().height + 40);
}

// export {treemapChart}
declare var module: any;
(module).exports = treemapChart;
