module kt.palette {

    export function buildPalette() {
        const htmlStyles = window.getComputedStyle(document.body);

        let list = ['red', 'green', 'yellow', 'grey', 'grey-lighter', 'discharged-bg', 'open-bg', 'violation-bg'];
        let ktColors = {};
        for (let c of list) {
            ktColors[c] = htmlStyles.getPropertyValue('--kt-' + c).trim();
        }

        return ktColors;
    }
}
