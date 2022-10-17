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
    'onExit':  onExit,
    'noInitialRun': true,
};

self.importScripts('../../three/three.min.js');
self.importScripts('../../util/geometry/GeometrySerialize.js');
self.importScripts('../../util/geometry/GeometryAlgorithms.js');
self.importScripts('../../util/io/StlWriter.js');
self.importScripts('CuraPostprocessing.js');
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
 * This function writes out the geometry object as a binary STL file
 * to the Emscripten FS so that cura can read it in.
 */
function loadGeometry(geometry, filename) {
    try {
        geometry.computeBoundingBox();
        self.postMessage({'cmd': 'stdout', 'str': "Bounding box " + geometry.boundingBox.min.x + ", " + geometry.boundingBox.min.y + ", " + geometry.boundingBox.max.x + ", " + geometry.boundingBox.max.y});

        self.postMessage({'cmd': 'stdout', 'str': "Writing binary STL as " + filename});

        const f = FS.open(filename, "w");
        GEOMETRY_WRITERS.writeStl(geometry, (buffer, offset, length) => FS.write(f, buffer, offset, length));
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
    const progress = captureProgress(str);
    if(typeof progress !== "undefined") {
        self.postMessage({cmd: 'progress', value: progress});
        return;
    }
    captureGcodeHeader(str);
    capturePrintInfo(str);
    self.postMessage({'cmd': 'stderr', 'str' : str});
}

function onAbort() {
    self.postMessage({'cmd': 'abort', 'str' : str});
}

function onExit() {
    console.log("Exit handler called");
    //self.postMessage({'cmd': 'abort', 'str' : str});
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