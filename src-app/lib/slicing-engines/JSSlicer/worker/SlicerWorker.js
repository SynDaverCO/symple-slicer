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
self.importScripts('../../../three/three.js');
self.importScripts('../../../clipper/clipper.js');

self.importScripts('../../../util/geometry/GeometrySerialize.js');
self.importScripts('../../../util/io/StlReader.js');
self.importScripts('../../../util/io/FetchFile.js');

self.importScripts('../core/ClipperPath.js');
self.importScripts('../core/Infill.js');
self.importScripts('../core/MeshSlicer.js');
self.importScripts('../core/SlicerEngine.js');

function loadGeometry(geometry) {
    self.postMessage({'cmd': 'stdout', 'str': "Slicing model"});
    var engine = new SlicerEngine();
    engine.setGeometry(geometry);
    console.log("Sending geometry");
    var json = geometryToJSON(geometry);
    self.postMessage({'cmd': 'geometryLoaded',  'data': json.data}, json.tranferables);
    console.log("Slicing model");
    slices = engine.getSlices();
    self.postMessage({'cmd': 'stdout', 'str': "Slicing done"});
    console.log("Sending slices");
    self.postMessage({'cmd': 'slicingFinished', 'slices': slices});
}

function loadSTLFile(stlData) {
    self.postMessage({'cmd': 'stdout',   'str': "Reading data"});
    var geometry = GEOMETRY_READERS.readStl(
        stlData,
        GEOMETRY_READERS.THREEGeometryCreator
    );
    loadGeometry(geometry);
}
    
async function loadFileFromUrl(url) {
    self.postMessage({'cmd': 'stdout', 'str': "Reading model"});
    try {
        console.log(url);
        let data = await fetchFile(url);
        return loadSTLFile(data);
    } catch(e) {
        self.postMessage({'cmd': 'stderr', 'str': e.toString()});
        console.error(e);
    }
}

function stop() {
    self.close(); // Terminates the worker.
}

function receiveMessage(e) {
    var data = e.data;
    switch (data.cmd) {
        case 'loadFileFromUrl':      loadFileFromUrl(data.url); break;
        case 'loadFileFromBlob':     loadSTLFile(data.blob); break;
        case 'loadFileFromGeometry': loadGeometry(jsonToGeometry(data.data)); break;
        case 'stop':                 stop(); break;
        default:
            self.postMessage({'cmd': 'stderr', 'str': 'Unknown command: ' + data.cmd});
    }
}

self.addEventListener('message', receiveMessage, false);