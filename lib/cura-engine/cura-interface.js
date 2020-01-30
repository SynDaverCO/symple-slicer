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
 
// Spawn web worker and setup event listener

var worker = new Worker('lib/cura-engine/cura-worker.js');

worker.addEventListener('message', function(e) {
    var cmd  = e.data.cmd;
    var data = e.data.data;
    switch (cmd) {
        case 'stdout': onConsoleMessage(data); break;
        case 'stderr': onConsoleMessage(data); break;
        case 'file':   onFileReceived(data); break;
        default:       log('Unknown command: ' + cmd);
    }
}, false);

// Interface commands

function get_file() {
    worker.postMessage({'cmd': 'get_file'});
}

function help() {
    worker.postMessage({'cmd': 'help'});
}

function slice() {
    worker.postMessage({'cmd': 'slice', 'msg': 'Hi'});
}

function stop() {
    // worker.terminate() from this script would also stop the worker.
    worker.postMessage({'cmd': 'stop', 'msg': 'Bye'});
}

function unknownCmd() {
    worker.postMessage({'cmd': 'foobard', 'msg': '???'});
}

