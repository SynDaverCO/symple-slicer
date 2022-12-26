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
self.importScripts('../../util/io/FetchFile.js');
self.importScripts('CuraEngine.js');

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
async function slice(args) {
    // Load support files into Emscripten FS

    await loadFromUrl("fdmprinter.def.json", "fdmprinter.def.json");
    await loadFromUrl("fdmextruder.def.json", "fdmextruder.def.json");

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

async function loadFromUrl(url, filename) {
    self.postMessage({'cmd': 'stdout', 'str': "Reading " + url});
    try {
        const data = await fetchFile(url);
        loadFromBlob(new Uint8Array(data), filename);
    } catch(error) {
        console.error(error);
    }
}

/**
 * The following routine reads the file "output.gcode" from the Emscripten FS
 * and posts it via a message
 */
function get_file() {
    let gcode;
    try {
        gcode = FS.readFile('output.gcode', {encoding: 'binary'});
    } catch (err) {
        console.log("Error reading output gcode:", err.message);
        return;
    }
    const payload = {
            'cmd': 'file',
            'gcode': gcode
        };
    self.postMessage({'cmd': 'stdout', 'str': "Transfering G-code"});
    self.postMessage(payload, [payload.gcode.buffer]);
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
    self.postMessage({'cmd': 'stderr', 'str' : str});
}

function onAbort() {
    self.postMessage({'cmd': 'abort', 'str' : "Abort called"});
}

function onExit() {
    console.log("Exit handler called");
    //self.postMessage({'cmd': 'abort', 'str' : str});
}

async function receiveMessage(e) {
    var cmd  = e.data.cmd;
    var data = e.data;
    switch (cmd) {
        case 'help':         help();                                                 break;
        case 'loadFromUrl':  loadFromUrl(data.url, data.filename);                   break;
        case 'loadFromBlob': loadFromBlob(data.blob, data.filename);                 break;
        case 'loadGeometry': loadGeometry(jsonToGeometry(data.data,true), data.filename); break;
        case 'slice':        await slice(data.args); get_file();                     break;
        case 'stop':         stop();                                                 break;
        default:             Module.printErr('Unknown command: ' + cmd);
    };
}

self.addEventListener('message', receiveMessage, false);