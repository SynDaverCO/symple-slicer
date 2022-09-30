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

var Module = {
    'print':    onStdout,
    'printErr': onStderr,
    'onAbort':  onAbort,
    'noInitialRun': true,
};

var sliceInfo = {
    header: ""
};

self.importScripts('../../three/three.min.js');
self.importScripts('../../util/geometry/GeometrySerialize.js');
self.importScripts('../../util/geometry/GeometryAlgorithms.js');
self.importScripts('CuraEngine.js');

if(typeof TextEncoder === "undefined") {
    self.importScripts('../../FastestSmallestTextEncoderDecoder/EncoderDecoderTogether.min.js');
}

/**
 * The following routine causes Cura to show a help screen.
 */
function help() {
    callMain([]);
}

/**
 * The following routine runs the Cura slicer. It then transfers the
 * file over using a message.
 */
function slice(args) {
    self.postMessage({'cmd': 'stdout', 'str': "Slicing..."});
    callMain(args);
}

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

function captureProgress(str) {
    var m, stages = ["slice", "layerparts", "inset+skin", "support", "export"];
    if(m = str.match(/Progress:([\w+]+):(\d+):(\d+)/)) {
        const stageProgress = stages.indexOf(m[1]);
        const sliceProgress = parseInt(m[2])/parseInt(m[3]);
        const progress = (sliceProgress + stageProgress)/stages.length;
        self.postMessage({cmd: 'progress', value: progress});
        return true;
    }
    return false;
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

/**
 * This function writes out the geometry object as a binary STL file
 * to the Emscripten FS so that cura can read it in.
 */
function loadGeometry(geometry, filename) {
    try {
        geometry.computeBoundingBox();
        self.postMessage({'cmd': 'stdout', 'str': "Bounding box " + geometry.boundingBox.min.x + ", " + geometry.boundingBox.min.y + ", " + geometry.boundingBox.max.x + ", " + geometry.boundingBox.max.y});

        self.postMessage({'cmd': 'stdout', 'str': "Writing binary STL as " + filename});

        var headerData = new Uint8Array(80);
        var uint16Data = new Uint16Array(1);
        var uint32Data = new Uint32Array(1);
        var vectorData = new Float32Array(3);

        var f = FS.open(filename, "w");

        // Unpack the buffered geometry
        
        const position = geometry.getAttribute('position');
        const index = geometry.getIndex();

        // Write the 80 byte header
        FS.write(f, new Uint8Array(headerData.buffer), 0, headerData.length * headerData.BYTES_PER_ELEMENT);

        // Write the number of triangles
        uint32Data[0] = GeometryAlgorithms.countFaces(geometry);
        FS.write(f, new Uint8Array(uint32Data.buffer), 0, uint32Data.length * uint32Data.BYTES_PER_ELEMENT);

        // Write the triangle information
        GeometryAlgorithms.forEachFace(geometry,
            (face, i) => {
                // Write the face normal
                vectorData[0] = face.normal.x;
                vectorData[1] = face.normal.y;
                vectorData[2] = face.normal.z;
                FS.write(f, new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex A information
                vectorData[0] = face.a.x;
                vectorData[1] = face.a.y;
                vectorData[2] = face.a.z;
                FS.write(f, new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex B information
                vectorData[0] = face.b.x;
                vectorData[1] = face.b.y;
                vectorData[2] = face.b.z;
                FS.write(f, new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex C information
                vectorData[0] = face.c.x;
                vectorData[1] = face.c.y;
                vectorData[2] = face.c.z;
                FS.write(f,  new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the attribute type count
                uint16Data[0] = 0;
                FS.write(f, new Uint8Array(uint16Data.buffer), 0, uint16Data.length * uint16Data.BYTES_PER_ELEMENT);
            });
        FS.close(f);
        self.postMessage({'cmd': 'stdout', 'str': "Done writing binary STL"});
    } catch (err) {
        console.error(err);
        Module.printErr('Unable to write STL file: ', err.message);
    }
}

function loadFromBlob(stlData, filename) {
    FS.writeFile(filename, stlData);
}

function loadFromUrl(url, filename) {
    self.postMessage({'cmd': 'stdout', 'str': "Reading model"});
    fetchFile(url)
    .then(response => loadFromBlob(response, filename))
    .catch(error => self.postMessage({'cmd': 'stdout', 'str': error}));
}

/**
 * The following routine reads the file "output.gcode" from the Emscripten FS
 * and posts it via a message
 */
function get_file(slicer_args) {
    var gcode;
    try {
        gcode = FS.readFile('output.gcode', {encoding: 'utf8'});
    } catch (err) {
        console.log("Error reading output gcode:", err.message);
        return;
    }

    // Apply post-processing to file
    gcode = postProcessGcode(gcode, slicer_args);

    const enc = new TextEncoder();
    var payload = {
            'cmd': 'file',
            'file': enc.encode(gcode)
        };
    self.postMessage({'cmd': 'stdout', 'str': "Transfering G-code"});
    self.postMessage(payload, [payload.file.buffer]);
}

function get_stats() {
    self.postMessage({
        'cmd': 'stats',
        'stats': sliceInfo
    });
}

function stop() {
    Module.printErr('WORKER STOPPED!');
    self.close(); // Terminates the worker.
}

/**
 * Event Listeners
 */

function onStdout(str) {
    self.postMessage({'cmd': 'stdout', 'str' : str});
}

function onStderr(str) {
    if(captureProgress(str)) return;
    captureGcodeHeader(str);
    capturePrintInfo(str);
    self.postMessage({'cmd': 'stderr', 'str' : str});
}

function onAbort(str) {
    self.postMessage({'cmd': 'abort', 'str' : str});
}

function receiveMessage(e) {
    var cmd  = e.data.cmd;
    var data = e.data;
    switch (cmd) {
        case 'help':         help();                                                 break;
        case 'loadFromUrl':  loadFromUrl(data.url, data.filename);                   break;
        case 'loadFromBlob': loadFromBlob(data.blob, data.filename);                 break;
        case 'loadGeometry': loadGeometry(jsonToGeometry(data.data,true), data.filename); break;
        case 'slice':        slice(data.args); get_stats(); get_file(data.args);     break;
        case 'stop':         stop();                                                 break;
        default:             Module.printErr('Unknown command: ' + cmd);
    };
}

self.addEventListener('message', receiveMessage, false);