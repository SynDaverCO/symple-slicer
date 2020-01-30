/*
 * SlicerInterface.js
 *
 * (c) 2016 Marcio Teixeira. All rights reserved.
 *
 * Preview release. Not authorized for redistribution or third-party use.
 */
var jslicer_worker = "/lib/jslicer-engine/worker/SlicerWorker.js";

function SlicerInterface() {
	var worker;
	var statusFunc = function(str) {console.log(str);};
	var slicingFinishedFunc;
	var onGeometryLoadedFunc;

	// Event handlers:
	
	function messageHandler(e) {
		var data = e.data;
		switch (data.cmd) {
			case 'console.log':
				console.log(data.str);
				break;
			case 'changeStatus':
				statusFunc(data.status);
				break;
			case 'slicingFinished':
				slicingFinishedFunc(data.slices);
				break;
			case 'geometryLoaded':
				onGeometryLoadedFunc(data.data);
				break;
		}
	}
	
	function errorHandler(e) {
		console.log(['filename: ', e.filename, ' lineno: ', e.lineno, ' error: ', e.message].join(' '));
	}
	
	// Web worker control functions:
	
	this.startWorker = function() {
		if(typeof(Worker) !== "undefined" && typeof(worker) == "undefined") {
			worker = new Worker(jslicer_worker);
			worker.addEventListener('message', messageHandler);
			worker.addEventListener('error', errorHandler, false);
    	} else {
        	statusFunc("Sorry! No Web Worker support.");
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
		
	this.statusCallback = function(func) {
		statusFunc = func;
	}
	
	this.slicingFinishedCallback = function(func) {
		slicingFinishedFunc = func;
	}
	
	this.geometryLoadedCallback = function(func) {
		onGeometryLoadedFunc = func;
	}
	
	// Kick off the worker thread
	this.startWorker();
}