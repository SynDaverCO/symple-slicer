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

    static enabled() {
        const method = window.settings.get('post_process_choice');
        switch(method) {
            case "none": return false;
            case "pause-at":
                const scripts = ProfileManager.getSection("scripts");
                if(scripts && scripts.pause_print_gcode) {
                    return true;
                } else {
                    alert("Unable to insert pauses into G-code because no pause script is defined in the printer profile");
                    console.warn("No pause_print_gcode in profile");
                    return false;
                }
            case "gcode-at":
            case "gcode-every":
                return true;
        }
    }

    static getOutputTransform() {
        const method = window.settings.get('post_process_choice');
        if(method == "gcode-every") {
            const every  = window.settings.get('layer-every');
            const isMatch = layer => layer > 0 && layer % every == 0;
            const customScript = window.settings.get('gcode-fragment');
            return new AddAtLayer(isMatch, customScript);
        } else {
            const scripts = ProfileManager.getSection("scripts");
            const customScript = method == "pause-at" ? scripts.pause_print_gcode : window.settings.get('gcode-fragment');
            const layers = window.settings.get('layer-list').split(/\s*,*\s*/).map(x => parseInt(x,10));
            const isMatch = layer => layers.includes(layer);
            return new AddAtLayer(isMatch, customScript);
        }
    }
}

/* Inserts a script after a layer transition if a test function returns true */

class AddAtLayer {
    constructor(layerTest, script) {
        const re = /^;LAYER:(\d+)\s*$/gm;

        let number = 0;
        function getScript() {
            return script.replace("${number}",++number).trim();
        }

        return new NativeTransformStream({
            transform(chunk, controller) {
                chunk = chunk.replace(re,
                    (match,layer) =>
                        layerTest(parseInt(layer,10)) ?
                        match + "\n" + getScript() :
                        match
                );
                controller.enqueue(chunk);
            },
            flush(controller) {
                if(!number) {
                    console.warn("Warning: No layers modified in G-code");
                }
            }
        });
    }
}

PauseAtLayer.gcode_default = `
; Save a photo on the Level Up
M118 P0 wifi_photo photos/\${number}.jpg
`;
