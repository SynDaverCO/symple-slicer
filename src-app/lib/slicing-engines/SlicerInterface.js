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
    constructor(configJs, configPath, callback) {
        // Load the configurator object for the slicer asynchronously.

        loadResource(configJs).onload = () => {
            this.config = new SlicerConfiguration(configPath);
            this.config.onSettingsChanged = (key, vals, attr)     => {this.onSettingsChanged(key, vals, attr);};
            this.config.onLoaded = callback;
        }
    }

    setOption(name, value, extruder = 0) {
        this.config.set(name, value, extruder);
    }

    getOption(name) {
        return this.config.get(name);
    }

    setMultiple(values, extruder = 0) {
        this.config.setMultiple(values, extruder);
    }

    getOptionDescriptor(name) {
        return this.config.getSettingDescriptor(name);
    }

    loadDefaults(force) {
        this.config.loadDefaults(force);
    }

    // Causes the change handlers to be called for all values
    forceRefresh() {
        this.config.forceRefresh();
    }

    saveSettings(writer, options) {
        return this.config.saveSettings(writer, options);
    }

    loadSettings(settings, options) {
        return this.config.loadSettings(settings, options);
    }
}

class SlicerWorkerInterface extends SlicerInterface {
    constructor(workerJs, configJs, configPath, callback) {
        super(configJs, configPath, callback);

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
            case 'abort':
                this.onAbort();
                break;
            case 'file':
                this.onFileReceived(data.file);
                /**
                 * Once the gcode file is received, restart
                 * the web worker to ensure a clean state
                 * for the next slice.
                 */
                this.reset();
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

    onStdoutOutput(str)                {console.log(str);};
    onStderrOutput(str)                {console.log(str);};
    onAbort()                          {console.log("Slicing aborted");};
    onProgress(progress)               {console.log("Slicing progress:", progress);};
    onPrintStats(stats)                {console.log("Print statistics:", stats);};
    onFileReceived(blob)               {};
    onSettingsChanged(key, vals, attr) {console.log("Option", key, "changed to", vals, "with attributes", attr);};

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

    slice(models) {
        this.worker.postMessage({
            'cmd':      'slice',
            'args':     this.config.getCommandLineArguments(models)
        });
    }

    stop() {
        this.worker.postMessage({
            'cmd':      'stop'
        });
    }

    reset() {
        this._stopWorker();
        this._startWorker();
    }
}

class SlicerNativeInterface extends SlicerInterface {
    constructor(configJs, configPath, callback) {
        super(configJs, configPath, callback);
    }

    // Event handlers (may be overriden by users):

    onStdoutOutput(str)                {console.log(str);};
    onStderrOutput(str)                {console.log(str);};
    onAbort()                          {console.log("Slicing aborted");};
    onProgress(progress)               {console.log("Slicing progress:", progress);};
    onPrintStats(stats)                {console.log("Print statistics:", stats);};
    onFileReceived(blob)               {};
    onSettingsChanged(key, vals, attr) {console.log("Option", key, "changed to", vals, "with attributes", attr);};

    // Public methods:

    help() {
    }

    loadFromUrl(url, filename) {
    }

    loadFromBlob(blob, filename) {
    }

    loadFromGeometry(geometry, filename) {
    }

    slice(models) {
        const args = this.config.getCommandLineArguments(models);
        LaunchExternalProcess("ping",["www.google.com"], this.onStdoutOutput, this.onStderrOutput);
    }

    stop() {
    }

    reset() {
    }
}