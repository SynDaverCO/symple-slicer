/**
 * WebSlicer
 * Copyright (C) 2021  SynDaver 3D
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ProfileManager } from './ProfileManager.js';

export class PauseAtLayer {
    static init(s) {
        const attr = {name: "post_process_choice", onchange: PauseAtLayer.onChange};
        s.radio( "No post processing",                 {...attr, value: "none", checked: "checked"});
        s.radio( "Pause print at layer(s):",           {...attr, value: "pause-at"});
        s.radio( "Add G-code at layer(s):",            {...attr, value: "gcode-at"});
        s.radio( "Add G-code every &#x1D465; layers:", {...attr, value: "gcode-every"});

        s.textarea("\tInsert this G-code:",   {id: "gcode-fragment", dataRadio: "post_process_choice", dataValue: "gcode-every gcode-at", value: PauseAtLayer.gcode_default.trim(), className: "stretch"});
        s.number("\tEvery &#x1D465; layers:", {id: "layer-every",    dataRadio: "post_process_choice", dataValue: "gcode-every", value:"10"});
        s.text("\tAt these layer(s):",        {id: "layer-list",     dataRadio: "post_process_choice", dataValue: "gcode-at pause-at"});

        s.linkRadioToDivs('post_process_choice');
    }

    static patchGcode(gcode, isMatch, script) {
        const re = /^;LAYER:(\d+)\s*$/gm;
        let number = 1;
        return gcode.replace(re,
            (match,layer) => isMatch(parseInt(layer,10)) ? match + "\n" + script.replace("${number}",number++).trim() : match
        );
    }

    static postProcessAt(gcode, script) {
        const layers = window.settings.get('layer-list').split(/\s*,*\s*/).map(x => parseInt(x,10));
        const isMatch = layer => layers.includes(layer);
        return PauseAtLayer.patchGcode(gcode, isMatch, script);
    }
    
    static postProcessEvery(gcode, script) {
        const every  = window.settings.get('layer-every');
        const isMatch = layer => layer > 0 && layer % every == 0;
        return PauseAtLayer.patchGcode(gcode, isMatch, script);
    }
    
    static postProcess(gcode) {
        const method = window.settings.get('post_process_choice');
        const customScript = window.settings.get('gcode-fragment');
        const scripts = ProfileManager.getSection("scripts");
        switch (method) {
            case "gcode-every": return PauseAtLayer.postProcessEvery(gcode,customScript);
            case "gcode-at":    return PauseAtLayer.postProcessAt(gcode,customScript);
            case "pause-at":
                if (scripts && scripts.pause_print_gcode)
                    return PauseAtLayer.postProcessAt(gcode,scripts.pause_print_gcode);
                else {
                    alert("Unable to insert pauses into G-code because no pause script is defined in the printer profile");
                    console.warn("No pause_print_gcode in profile");
                    return gcode;
                }
            default: return gcode;
        }
    }
}

PauseAtLayer.gcode_default = `
; Save a photo on the Level Up
M118 P0 wifi_photo photos/\${number}.jpg
`;
