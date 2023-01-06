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

export class GeometryLoader {
    constructor() {
        this.workerJs = "lib/util/io/GeometryLoaderWorker.js";
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
        const data = e.data;
        switch (data.cmd) {
            case 'progress':
                this.onProgress(data.value);
                break;
            case 'geometry':
                const geometries = data.jsonGeometry.map(json => jsonToGeometry(json,true));
                this.onModelLoaded(geometries, data.options);
                break;
            default:
                this.onStderrOutput('Unknown command: ' + cmd);
        }
    }

    _errorHandler(e) {
        this.onStderrOutput(['filename: ', e.filename, ' lineno: ', e.lineno, ' error: ', e.message].join(' '));
    }

    // Event handlers (may be overriden by users):

    onStdoutOutput(str)                 {console.log(str);};
    onStderrOutput(str)                 {console.log(str);};
    onProgress(progress)                {console.log("Loading progress:", progress);};
    onModelLoaded(geometries, options)  {};

    // Public methods:

    load(data, options) {
        let extension = 'stl';
        if(options.hasOwnProperty('filename')) {
            console.log("Loading: ", options.filename);
            extension = options.filename.split('.').pop().toLowerCase();
        }

        switch(extension) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'bmp':
            case 'gif':
                this.loadFromImage(data, options);
                break;
            case 'obj': this.loadFromObj(data, options); break;
            case '3mf': this.loadFrom3MF(data, options); break;
            default:    this.loadFromSTL(data, options); break;
        }
    }

    loadFromSTL(data, options) {
        this.worker.postMessage({cmd: 'loadSTL', data, options}, [data]);
    }

    loadFromObj(data, options) {
        this.worker.postMessage({cmd: 'loadOBJ', data, options}, [data]);
    }

    loadFrom3MF(data, options) {
        // The ThreeMFLoader requires the DOMParse and thus cannot run in the worker.
        const geometry = [];
        const ldr = new THREE.ThreeMFLoader();
        const obj = ldr.parse(data);
        obj.traverse( node => {
            if (node instanceof THREE.Mesh) {
                node.geometry.computeVertexNormals();
                geometry.push(node.geometry);
            }
        });
        this.onModelLoaded(geometry, options);
    }

    loadFromImage(data, options) {
        if(data instanceof File) {
            const img = new Image();
            img.src = (window.webkitURL ? webkitURL : URL).createObjectURL(data);
            img.onload = () => {
                const canvas = document.createElement('canvas');

                // Scale images larger than a certain threshold to
                // avoid creating excessively large geometry
                const pixelCount = img.width * img.height;
                const pixelLimit = 307200;
                const scale      = Math.min(1.0,Math.sqrt(pixelLimit/pixelCount));
                canvas.width     = Math.floor(img.width  * scale);
                canvas.height    = Math.floor(img.height * scale);

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                const geometry = GeometryAlgorithms.geometryFromImageData(imageData, 20, 1);
                this.onModelLoaded([geometry], options);
            }
        } else {
            alert("Failed to read file");
            this.onModelLoaded();
        }
    }
}
