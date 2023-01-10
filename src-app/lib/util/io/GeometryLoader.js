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
        this.jobId = 0;
        this.callbacks = {};
    }

    // Web worker control functions:

    _startWorker() {
        if(typeof(Worker) !== "undefined" && typeof(this.worker) == "undefined") {
            this.worker = new Worker(this.workerJs);
            this.worker.addEventListener('message', this._messageHandler.bind(this));
            this.worker.addEventListener('error', this._errorHandler.bind(this), false);
        } else {
            console.warn("Sorry! No Web Worker support.");
        }
    }

    _stopWorker() {
        this.worker.terminate();
        this.worker = undefined;
    }

    _postMessage(message, transfer) {
        const jobId = this.jobId++;
        message.jobId = jobId;
        return new Promise((resolve, reject) => {
            console.log("GeometryLoader starting web worker job", jobId);
            this.callbacks[jobId] = {resolve, reject};
            this.worker.postMessage(message, transfer);
        });
    }

    _messageHandler(e) {
        switch (e.data.cmd) {
            case 'progress': {
                const {value} = e.data;
                this.onProgress(value);
                break;
            }
            case 'geometry': {
                const {jobId, jsonGeometry, err} = e.data;
                const callbacks = this.callbacks[jobId];
                if (jsonGeometry) {
                    console.log("GeometryLoader ended web worker job", jobId, "with success");
                    const geometries = jsonGeometry.map(json => jsonToGeometry(json,true));
                    if (callbacks.resolve) {
                        callbacks.resolve(geometries);
                    }
                } else {
                    console.warn("GeometryLoader ended web worker job", jobId, "with failure");
                    if (callbacks.reject) {
                        callbacks.reject(err ? err : 'loadGeometryFailed');
                    }
                }
                delete this.callbacks[jobId];
                break;
            }
            default:
                console.error('Unknown command: ' + cmd);
        }
    }

    _errorHandler(e) {
        console.log(['filename: ', e.filename, ' lineno: ', e.lineno, ' error: ', e.message].join(' '));
    }

    readFileAsPromise(file, mode) {
        return new Promise((resolve, reject) => {
            var fr = new FileReader();
            fr.onload = () => {
                resolve(fr.result )
            };
            fr.onerror = reject;
            fr.onprogress = e => {
                if (e.lengthComputable) {
                    this.onProgress(e.loaded/e.total);
                }
            }
            if(mode == 'binary') {
                fr.readAsArrayBuffer(file);
            } else {
                fr.readAsText(file);
            }
        });
    }

    // Event handlers (may be overriden by users):

    onProgress(progress)                {console.log("Loading progress:", progress);};

    // Public methods:

    async load(data, options) {
        const filename = data instanceof File
                            ? data.name
                            : options && options.hasOwnProperty('filename')
                                ? options.filename
                                : "untitled.stl";
        const extension = filename.split('.').pop().toLowerCase();
        const get = async data =>
            data instanceof File
                ? this.readFileAsPromise(data, 'binary')
                : data;
        switch(extension) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'bmp':
            case 'gif': return this.loadFromImg(data, options);
            case 'obj': return this.loadFromObj(await get(data), options);
            case '3mf': return this.loadFrom3MF(await get(data), options);
            default:    return this.loadFromSTL(await get(data), options);
        }
    }

    async loadFromSTL(data, options) {
        return this._postMessage({cmd: 'loadSTL', data, options}, [data]);
    }

    async loadFromObj(data, options) {
        return this._postMessage({cmd: 'loadOBJ', data, options}, [data]);
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
        return geometry;
    }

    loadFromImg(data, options) {
        return new Promise((resolve, reject) => {
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
                    resolve([geometry]);
                }
            } else {
                reject("GeometryLoader.loadFromImg expects a File object");
            }
        });
    }
}
