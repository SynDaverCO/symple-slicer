/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
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
 
function getScriptPath() {
    let id = +new Date + Math.random();
    document.write('<script id="dummy' + id + '"><\/script>');
    return document.getElementById('dummy' + id).previousSibling.src;
}

let baseJsPath = getScriptPath();

function SlicerInterface() {
    var js = new URL("./SlicerWorker.js", baseJsPath).href;
    var worker;
    var slicingFinishedFunc;
    var onGeometryLoadedFunc;
    var me = this;

    // Event handlers:

    this.onStdoutOutput    = function(str) {console.log(str);};
    this.onStderrOutput    = function(str) {console.log(str);};
    this.onGeometryLoaded  = function(json) {};
    this.onSlicingFinished = function(slices) {};

    function messageHandler(e) {
        var data = e.data;
        switch (data.cmd) {
            case 'stdout':          me.onStdoutOutput(data.str); break;
            case 'stderr':          me.onStderrOutput(data.str); break;
            case 'file':            me.onFileReceived(data.file); break;
            case 'slicingFinished': me.onSlicingFinished(data.slices); break;
            case 'geometryLoaded':  me.onGeometryLoaded(data.data); break;
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

    this.loadFileFromUrl = function(url) {
        worker.postMessage({'cmd': 'loadFileFromUrl', 'url': url});
    }

    this.loadFileFromBlob = function(blob) {
        worker.postMessage({'cmd': 'loadFileFromBlob', 'blob': blob});
    }

    this.loadFileFromGeometry = function(geometry) {
        var json = geometryToJSON(geometry);
        worker.postMessage({'cmd': 'loadFileFromGeometry', 'data': json.data}, json.tranferables);
    }

    // Kick off the worker thread
    this.startWorker();
}