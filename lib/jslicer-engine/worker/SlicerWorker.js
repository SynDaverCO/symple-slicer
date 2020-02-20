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
self.importScripts('../../three/three.js');
self.importScripts('../../clipper/clipper.js');

self.importScripts('../../geometry-lib/GeometrySerialize.js');
self.importScripts('../../geometry-lib/StlReader.js');
self.importScripts('../../geometry-lib/FetchFile.js');

self.importScripts('../../jslicer-engine/core/ClipperPath.js');
self.importScripts('../../jslicer-engine/core/Infill.js');
self.importScripts('../../jslicer-engine/core/MeshSlicer.js');
self.importScripts('../../jslicer-engine/core/SlicerEngine.js');

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
	
function loadFileFromUrl(url) {
	self.postMessage({'cmd': 'stdout', 'str': "Reading model"});
	fetchFile(url,
		function(response) {
			loadSTLFile(response);
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