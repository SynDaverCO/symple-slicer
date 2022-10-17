/**
 *
 * @licstart
 *
 * Web Cura
 * Copyright (C) 2020 SynDaver Labs, Inc.
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
 *
 * @licend
 *
 */

/************************ Routines for parsing stderr ************************/

var sliceInfo = {
    header: ""
};

/**
 * When slicing via the command line, Cura puts in a dummy header in the GCODE
 * and prints the real header via stderr. Capture this for later use.
 */
function captureGcodeHeader(str) {
    if(str.match(/Gcode header after slicing/)) {
        this.capturing = true;
        sliceInfo.header = "";
        return;
    }
    if(str.match(/End of gcode header/)) {
        this.capturing = false;
    }
    if(this.capturing) {
        sliceInfo.header += str + "\n";
    }
}

function captureProgress(str) {
    var m, stages = ["slice", "layerparts", "inset+skin", "support", "export"];
    if(m = str.match(/Progress:([\w+]+):(\d+):(\d+)/)) {
        const stageProgress = stages.indexOf(m[1]);
        const sliceProgress = parseInt(m[2])/parseInt(m[3]);
        return (sliceProgress + stageProgress)/stages.length;
    }
}

function capturePrintInfo(str) {
    if(m = str.match(/^Print time \(s\): (.*)$/)) {
        sliceInfo.time_seconds = m[1];
    }
    if(m = str.match(/^Print time \(hr\|min\|s\): (.*)$/)) {
        sliceInfo.time_hms = m[1];
    }
    if(m = str.match(/^Filament \(mm\^3\): (.*)$/)) {
        sliceInfo.filament = m[1];
    }
}

/******************* Routines for postprocessing the gcode *******************/

/**
 * Replace the fake header in the G-code with the real header
 */
function replaceGcodeHeader(gcode) {
    var start_offset = gcode.indexOf("M82 ;absolute extrusion mode");
    if(start_offset == -1) {
        console.warn("Warning: Unable to strip Cura header");
        start_offset = 0;
    }
    return sliceInfo.header + gcode.slice(start_offset);
}

/**
 * Add M73 (Set Print Progress) to GCODE file
 */
function addPrintProgress(gcode) {
    if(m = gcode.match(/^;TIME:(\d+)$/m)) {
        const total_time = m[1];
        gcode = gcode.replace(/^;TIME_ELAPSED:(\d+).*$/gm,
            (match, time_elapsed) => match + "\nM73 P" + Math.ceil((time_elapsed+1)/(total_time+1)*100));
    } else {
        console.warn("Warning: Unable to find time elapsed");
    }
    return gcode;
}

/**
 * Preform postprocessing on generated G-code
 */
function postProcessGcode(gcode, slicer_args) {
    gcode = replaceGcodeHeader(gcode);
    if(slicer_args.includes("machine_gcode_flavor=RepRap (Marlin/Sprinter)")) {
        gcode = addPrintProgress(gcode);
    }
    return gcode;
}