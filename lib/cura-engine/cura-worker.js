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
    'print':    function(text) { self.postMessage({'cmd': 'stdout', 'data' : text}); },
    'printErr': function(text) { self.postMessage({'cmd': 'stderr', 'data' : text}); },
    'noInitialRun': true
};

importScripts('CuraEngine.js');
importScripts('cura-args.js');

function help() {
    callMain([]);
}

function slice() {
    arg_list = arg_str.match(/(?:[^\s"]+|"[^"]*")+/g);
    arg_list = arg_list.map(function(s) {return s.replace(/"/g, '');});
    console.log(arg_list);
    callMain(arg_list);
    // After slicing, attempt to transfer the file.
    get_file();
}

function get_file() {
    try {
        var gcode = FS.readFile('output.gcode', {encoding: 'binary'});
        var payload = {
            'cmd': 'file',
            'data' : gcode
        };
        self.postMessage(payload, [payload.data.buffer]);
    } catch {
        Module.printErr('No file');
    }
}

function stop() {
    Module.printErr('WORKER STOPPED: ' + data.msg +
                   '. (buttons will no longer work)');
    self.close(); // Terminates the worker.
}

/**
 * Event Listeners
 */
self.addEventListener('message', function(e) {
    var cmd  = e.data.cmd;
    var data = e.data.data;
    switch (cmd) {
        case 'help':     help();     break;
        case 'slice':    slice();    break;
        case 'get_file': get_file(); break;
        case 'stop':     stop();     break;
        default:
            Module.printErr('Unknown command: ' + data.msg);
    };
}, false);