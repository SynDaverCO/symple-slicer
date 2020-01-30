/*
 * SlicerWorker.js
 *
 * (c) 2016 Marcio Teixeira. All rights reserved.
 *
 * Preview release. Not authorized for redistribution or third-party use.
 */
self.importScripts('/lib/three/three.js');
self.importScripts('/lib/clipper/clipper.js');

self.importScripts('/lib/geometry-lib/GeometrySerialize.js');
self.importScripts('/lib/geometry-lib/StlReader.js');

self.importScripts('/lib/jslicer-engine/core/ClipperPath.js');
self.importScripts('/lib/jslicer-engine/core/Infill.js');
self.importScripts('/lib/jslicer-engine/core/MeshSlicer.js');
self.importScripts('/lib/jslicer-engine/core/SlicerEngine.js');
	
self.console = {
	log: function(str) {
		self.postMessage({'cmd': 'console.log', 'str': str});
	}
}

/* Fetches a file from an URL, then calls the function callback
 * when the file download is complete
 */
function fetchFile(url, callback, onerror) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	xhr.onreadystatechange = function(e) {
		if (xhr.readyState == 4) {
			// continue only if HTTP status is "OK"
			if (xhr.status == 200) {
				callback(xhr.response);
			} else {
				onerror(xhr.status);
			}
		}
	};
	xhr.send();
}

function loadGeometry(geometry) {
	self.postMessage({'cmd': 'changeStatus',    'status': "Slicing model"});
	var engine = new SlicerEngine();
	engine.setGeometry(geometry);
	console.log("Sending geometry");
	var json = geometryToJSON(geometry);
	self.postMessage({'cmd': 'geometryLoaded',  'data': json.data}, json.tranferables);
	console.log("Slicing model");
	slices = engine.getSlices();
	self.postMessage({'cmd': 'changeStatus',    'status': "Slicing done"});
	console.log("Sending slices");
	self.postMessage({'cmd': 'slicingFinished', 'slices': slices});
}

function loadSTLFile(stlData) {
	self.postMessage({'cmd': 'changeStatus',   'status': "Reading data"});
	var geometry = GEOMETRY_READERS.readStl(
		stlData,
		GEOMETRY_READERS.THREEGeometryCreator
	);
	loadGeometry(geometry);
}
	
function loadFileFromUrl(url) {
	self.postMessage({'cmd': 'changeStatus',    'status': "Reading model"});
	fetchFile(url,
		function(response) {
			loadSTLFile(response);
		},
		function(status) {
			if(status == 404) {
				self.postMessage({'cmd': 'changeStatus', 'status': "Failed, file not found"});
			} else {
				self.postMessage({'cmd': 'changeStatus', 'status': "Failed, status:" + status});
			}
		}
	);
}

function receiveMessage(e) {
	var data = e.data;
	switch (data.cmd) {
	case 'loadFileFromUrl':
		loadFileFromUrl(data.url);
		break;
	case 'loadFileFromBlob':
		loadSTLFile(data.blob);
		break;
	case 'loadFileFromGeometry':
		loadGeometry(jsonToGeometry(data.data));
		break;
	case 'stop':
		self.close(); // Terminates the worker.
		break;
	default:
		console.log('Unknown command: ' + data.cmd);
	}
}

self.addEventListener('message', receiveMessage, false);