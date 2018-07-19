/*
 * KT Advance GUI
 * Copyright (c) 2017 Kestrel Technology LLC
 * http://www.kestreltechnology.com
 *

 Licensed under the Apache License, Version 2.0 (the 'License');
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an 'AS IS' BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
================================================================================
 */
import { PoDischargeTypes, PoStates } from './xmltypes';


export function buildPalette() {

    const htmlStyles = window.getComputedStyle(document.body);

    let list = ['red', 'green', 'yellow', 'grey', 'grey-lighter'];

    let ktColors = {};
    for (let c of list) {
        ktColors[c] = htmlStyles.getPropertyValue('--kt-' + c).trim();
    }


    for (let n in PoStates) {
        let c = PoStates[n];

        if (typeof c === 'string') {

            for (let m in PoDischargeTypes) {
                let d = PoDischargeTypes[m];
                if (typeof d === 'string')
                    ktColors["state-" + c + "-" + d + "-bg"] = htmlStyles.getPropertyValue('--kt-state-' + c + "-" + d + "-bg").trim();
            }
        }
    }

    ktColors["state-callsite-bg"] = htmlStyles.getPropertyValue('--kt-state-callsite-bg').trim();
    ktColors["state-callsite-ic-bg"] = htmlStyles.getPropertyValue('--kt-state-callsite-ic-bg').trim();
    ktColors["state-callsite-dc-bg"] = htmlStyles.getPropertyValue('--kt-state-callsite-dc-bg').trim();
    ktColors["state-callsite-rs-bg"] = htmlStyles.getPropertyValue('--kt-state-callsite-rs-bg').trim();


    ktColors["state-callee-bg"] = htmlStyles.getPropertyValue('--kt-state-callee-bg').trim();
    ktColors["state-callee-ic-bg"] = htmlStyles.getPropertyValue('--kt-state-callee-ic-bg').trim();
    ktColors["state-callee-dc-bg"] = htmlStyles.getPropertyValue('--kt-state-callee-dc-bg').trim();
    ktColors["state-callee-rs-bg"] = htmlStyles.getPropertyValue('--kt-state-callee-rs-bg').trim();


    ktColors["state-missing-bg"] = htmlStyles.getPropertyValue('--kt-state-missing-bg').trim();


  
        // /** ATApiAssumptionType */
        // aa,

        // /** ATPostconditionType */
        // pc,

        // /** ATUserAssumptionType */
        // ua,

        // /** Global Assumption */
        // ga
  
    ktColors["state-assumption-aa-bg"] = htmlStyles.getPropertyValue('--kt-state-assumption-aa-bg').trim();
    ktColors["state-assumption-ga-bg"] = htmlStyles.getPropertyValue('--kt-state-assumption-ga-bg').trim();
    ktColors["state-assumption-ua-bg"] = htmlStyles.getPropertyValue('--kt-state-assumption-ua-bg').trim();
    ktColors["state-assumption-pc-bg"] = htmlStyles.getPropertyValue('--kt-state-assumption-pc-bg').trim();
    
    return ktColors;
}
