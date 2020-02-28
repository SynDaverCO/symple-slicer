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

function SlicerInterface(path) {
    var js = "lib/cura-engine/cura-worker.js";
    var worker;
    var slicingFinishedFunc;
    var onGeometryLoadedFunc;
    var me = this;

    this.config = new CuraConfiguration(path);

    // Event handlers:

    this.onStdoutOutput = function(str) {console.log(str);};
    this.onStderrOutput = function(str) {console.log(str);};
    this.onFileReceived = function(blob) {};

    function messageHandler(e) {
        var data = e.data;
        switch (data.cmd) {
            case 'stdout': me.onStdoutOutput(data.str); break;
            case 'stderr': me.onStderrOutput(data.str); break;
            case 'file':   me.onFileReceived(data.file); break;
            case 'slicingFinished':
                slicingFinishedFunc(data.slices);
                break;
            case 'geometryLoaded':
                onGeometryLoadedFunc(data.data);
                break;
            default:
                me.onStderrOutput('Unknown command: ' + cmd);
        }
    }

    function errorHandler(e) {
        me.onStderrOutput(['filename: ', e.filename, ' lineno: ', e.lineno, ' error: ', e.message].join(' '));
    }

    // Web worker control functions:

    this.startWorker = function() {
        if(typeof(Worker) !== "undefined" && typeof(worker) == "undefined") {
            worker = new Worker(js);
            worker.addEventListener('message', messageHandler);
            worker.addEventListener('error', errorHandler, false);
        } else {
            me.onStderrOutput("Sorry! No Web Worker support.");
        }
    }

    this.stopWorker = function() {
        worker.terminate();
        worker = undefined;
    }

    // Public methods:

    this.help = function() {
        worker.postMessage({'cmd': 'help'});
    }

    this.loadFromUrl = function(url, filename) {
        worker.postMessage({
            'cmd':      'loadFromUrl',
            'url':      url,
            'filename': filename
        });
    }

    this.loadFromBlob = function(blob, filename) {
        worker.postMessage({
            'cmd':      'loadFromBlob',
            'blob':     blob,
            'filename': filename
        });
    }

    this.loadFromGeometry = function(geometry, filename) {
        var json = geometryToJSON(geometry);
        worker.postMessage({
            'cmd':      'loadGeometry',
            'data':     json.data,
            'filename': filename
        }, json.tranferables);
    }

    this.slice = function(filenames) {
        worker.postMessage({
            'cmd':      'slice',
            'args':     this.config.getCommandLineArguments(filenames)
        });
    }

    this.get_file = function() {
        worker.postMessage({
            'cmd':      'get_file'
        });
    }

    this.stop = function() {
        worker.postMessage({
            'cmd':      'stop'
        });
    }

    // Kick off the worker thread
    this.startWorker();
}
