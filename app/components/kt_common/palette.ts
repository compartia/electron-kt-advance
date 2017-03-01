module kt.palette {



    export function buildPalette() {
        const htmlStyles = window.getComputedStyle(document.body);

        let list = ['red', 'green', 'yellow', 'grey', 'grey-lighter'];

        let STATES_EXT = ["api", "rv", "global", "ds", "discharged", "violation", "open", "invariants"];


        let ktColors = {};
        for (let c of list) {
            ktColors[c] = htmlStyles.getPropertyValue('--kt-' + c).trim();
        }

        for (let c of STATES_EXT) {
            ktColors["state-" + c + "-bg"] = htmlStyles.getPropertyValue('--kt-state-' + c + "-bg").trim();
        }

        for (var n in kt.graph.PoStatesExt) {
            let c = kt.graph.PoStatesExt[n];
            if (typeof c === 'string')
                ktColors["state-" + c + "-bg"] = htmlStyles.getPropertyValue('--kt-state-' + c + "-bg").trim();
        }

        return ktColors;
    }
}
