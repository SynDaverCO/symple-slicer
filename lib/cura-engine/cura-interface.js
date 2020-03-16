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

class SlicerInterface {
    constructor(workerJs, configJs, configPath, callback) {
        // Load the configurator object for the slicer asynchronously.

        loadResource(configJs).onload = () => {
            this.config = new CuraConfiguration(configPath);
            this.config.onValueChanged = (key, value) => {this.onOptionChanged(key, value);};
            this.config.onLoaded = callback;
        }

        this.workerJs = workerJs;
        this.worker   = undefined;

        this._startWorker();
    }

    // Web worker control functions:

    _startWorker() {
        if(typeof(Worker) !== "undefined" && typeof(this.worker) == "undefined") {
            this.worker = new Worker(this.workerJs);
            this.worker.addEventListener('message', this._messageHandler.bind(this));
            this.worker.addEventListener('error', this._errorHandler.bind(this), false);
        } else {
            this.onStderrOutput("Sorry! No Web Worker support.");
        }
    }

    _stopWorker() {
        this.worker.terminate();
        this.worker = undefined;
    }

    _messageHandler(e) {
        var data = e.data;
        switch (data.cmd) {
            case 'stdout': this.onStdoutOutput(data.str); break;
            case 'stderr': this.onStderrOutput(data.str); break;
            case 'file':
                this.onFileReceived(data.file);
                /**
                 * Once the gcode file is received, restart
                 * the web worker to ensure a clean state
                 * for the next slice.
                 */
                this._stopWorker();
                this._startWorker();
                break;
            case 'progress':
                this.onProgress(data.value);
                break;
            case 'stats':
                this.onPrintStats(data.stats);
                break;
            default:
                this.onStderrOutput('Unknown command: ' + cmd);
        }
    }

    _errorHandler(e) {
        this.onStderrOutput(['filename: ', e.filename, ' lineno: ', e.lineno, ' error: ', e.message].join(' '));
    }

    // Event handlers (may be overriden by users):

    onStdoutOutput(str)          {console.log(str);};
    onStderrOutput(str)          {console.log(str);};
    onProgress(progress)         {console.log("Slicing progress:", progress);};
    onPrintStats(stats)          {console.log("Print statistics:", stats);};
    onFileReceived(blob)         {};
    onOptionChanged(name, value) {console.log("Option", name, "changed to", value);};

    // Public methods:

    help() {
        this.worker.postMessage({'cmd': 'help'});
    }

    loadFromUrl(url, filename) {
        this.worker.postMessage({
            'cmd':      'loadFromUrl',
            'url':      url,
            'filename': filename
        });
    }

    loadFromBlob(blob, filename) {
        this.worker.postMessage({
            'cmd':      'loadFromBlob',
            'blob':     blob,
            'filename': filename
        });
    }

    loadFromGeometry(geometry, filename) {
        var json = geometryToJSON(geometry);
        this.worker.postMessage({
            'cmd':      'loadGeometry',
            'data':     json.data,
            'filename': filename
        }, json.tranferables);
    }

    slice(filenames) {
        this.worker.postMessage({
            'cmd':      'slice',
            'args':     this.config.getCommandLineArguments(filenames)
        });
    }

    get_file() {
        this.worker.postMessage({
            'cmd':      'get_file'
        });
    }

    stop() {
        this.worker.postMessage({
            'cmd':      'stop'
        });
    }

    setOption(name, value) {
        this.config.set(name, value);
    }

    getOptionDescriptor(name) {
        return this.config.getSettingDescriptor(name);
    }

    loadDefaults(force) {
        this.config.loadDefaults(force);
    }

    loadProfileStr(str) {
        this.config.loadProfileStr(str);
    }

    saveProfileStr(options) {
        return this.config.saveProfileStr(options);
    }

    /**
     * Loads a specific print profile. These profiles are stored as TOML files.
     */
    loadProfile(type, filename, callback) {
        var filename = "config/" + type + "_profiles/" + filename;
        fetchText(filename,
            data => {
                this.config.loadProfileStr(data);
                if(callback) callback();
            },
            () => console.log("Unable to load", filename)
        );
    }
}
