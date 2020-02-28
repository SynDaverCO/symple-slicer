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
    'noInitialRun': true
};
var gcode_header = "";

self.importScripts('../three/three.js');
self.importScripts('../geometry-lib/GeometrySerialize.js');
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
function slice(args) {
    self.postMessage({'cmd': 'stderr', 'str': "Slicing..."});
    callMain(args);
}

/**
 * When slicing via the command line, Cura puts in a dummy header in the GCODE
 * and prints the real header via stderr. Capture this for later use.
 */
function captureGcodeHeader(str) {
    if(str.match(/Gcode header after slicing/)) {
        this.capturing = true;
        gcode_header = "";
        return;
    }
    if(str.match(/End of gcode header/)) {
        this.capturing = false;
    }
    if(this.capturing) {
        gcode_header += str + "\n";
    }
}

/**
 * Replace the fake header in the GCODE with the real header
 */
function replaceGcodeHeader(gcode) {
    var lines_in_header = (gcode_header.match(/\n/g) || '').length + 1;
    
    // Convert the header into an array
    const enc = new TextEncoder(); // always utf-8
    const utf8_header = enc.encode(gcode_header);
    
    // Figure out how many bytes to skip in the gcode file
    var fake_header_length = 0;
    while(lines_in_header > 0 && fake_header_length < gcode.length ) {
        if(gcode[fake_header_length] == "\n".charCodeAt(0))
            lines_in_header--;
        fake_header_length++;
    }
    
    // Create a new gcode file
    const new_gcode = new Uint8Array(utf8_header.length + gcode.length - fake_header_length);
    new_gcode.set(utf8_header, 0);
    new_gcode.set(gcode.slice(fake_header_length), utf8_header.length);
    return new_gcode;
}

/**
 * This function writes out the geometry object as a binary STL file
 * to the Emscripten FS so that cura can read it in.
 */
function loadGeometry(geometry, filename) {
    try {
        geometry.computeBoundingBox();
        self.postMessage({'cmd': 'stderr', 'str': "Bounding box " + geometry.boundingBox.min.x + ", " + geometry.boundingBox.min.y + ", " + geometry.boundingBox.max.x + ", " + geometry.boundingBox.max.y});
        
        self.postMessage({'cmd': 'stderr', 'str': "Writing binary STL as " + filename});
        geometry.computeFaceNormals();
           
        var headerData = new Uint8Array(80);
        var uint16Data = new Uint16Array(1);
        var uint32Data = new Uint32Array(1);
        var vectorData = new Float32Array(3);
        
        var f = FS.open(filename, "w");
        
        // Write the 80 byte header
        FS.write(f, new Uint8Array(headerData.buffer), 0, headerData.length * headerData.BYTES_PER_ELEMENT);

        // Write the number of triangles
        uint32Data[0] = geometry.faces.length;
        FS.write(f, new Uint8Array(uint32Data.buffer), 0, uint32Data.length * uint32Data.BYTES_PER_ELEMENT);
        
        // Write the triangle information
        for(var i = 0; i < geometry.faces.length; i++) {
            // Write the face normal
            vectorData[0] = geometry.faces[i].normal.x;
            vectorData[1] = geometry.faces[i].normal.y;
            vectorData[2] = geometry.faces[i].normal.z;
            FS.write(f, new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
            // Write the vertex A information
            vectorData[0] = geometry.vertices[geometry.faces[i].a].x;
            vectorData[1] = geometry.vertices[geometry.faces[i].a].y;
            vectorData[2] = geometry.vertices[geometry.faces[i].a].z;
            FS.write(f, new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
            // Write the vertex B information
            vectorData[0] = geometry.vertices[geometry.faces[i].b].x;
            vectorData[1] = geometry.vertices[geometry.faces[i].b].y;
            vectorData[2] = geometry.vertices[geometry.faces[i].b].z;
            FS.write(f, new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
            // Write the vertex C information
            vectorData[0] = geometry.vertices[geometry.faces[i].c].x;
            vectorData[1] = geometry.vertices[geometry.faces[i].c].y;
            vectorData[2] = geometry.vertices[geometry.faces[i].c].z;
            FS.write(f,  new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
            // Write the attribute type count
            uint16Data[0] = 0;
            FS.write(f, new Uint8Array(uint16Data.buffer), 0, uint16Data.length * uint16Data.BYTES_PER_ELEMENT);
        }
        FS.close(f);
        self.postMessage({'cmd': 'stderr', 'str': "Done writing binary STL"});
    } catch {
        Module.printErr('Unable to write STL file');
    }
}

function loadFromBlob(stlData, filename) {
    FS.writeFile(filename, stlData);
}
    
function loadFromUrl(url, filename) {
    self.postMessage({'cmd': 'stdout', 'str': "Reading model"});
    fetchFile(url,
        function(response) {
            loadFromBlob(response, filename);
        },
        function(status) {
            if(status == 404) {
                self.postMessage({'cmd': 'stderr', 'str': "Failed, file not found"});
            } else {
                self.postMessage({'cmd': 'stderr', 'str': "Failed, status:" + status});
            }
        }
    );
}

/**
 * The following routine reads the file "output.gcode" from the Emscripten FS
 * and posts it via a message
 */
function get_file() {
    self.postMessage({'cmd': 'stderr', 'str': "Transfering GCODE"});
    var gcode = FS.readFile('output.gcode', {encoding: 'binary'});
    var payload = {
        'cmd': 'file',
        'file': replaceGcodeHeader(gcode)
    };
    self.postMessage(payload, [payload.file.buffer]);
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
    captureGcodeHeader(str);
    self.postMessage({'cmd': 'stderr', 'str' : str});
}

function receiveMessage(e) {
    var cmd  = e.data.cmd;
    var data = e.data;
    switch (cmd) {
        case 'help':         help();                                                 break;
        case 'loadFromUrl':  loadFromUrl(data.url, data.filename);                   break;
        case 'loadFromBlob': loadFromBlob(data.blob, data.filename);                 break;
        case 'loadGeometry': loadGeometry(jsonToGeometry(data.data), data.filename); break;
        case 'slice':        slice(data.args); get_file();                           break;
        case 'stop':         stop();                                                 break;
        default:             Module.printErr('Unknown command: ' + cmd);
    };
}

self.addEventListener('message', receiveMessage, false);