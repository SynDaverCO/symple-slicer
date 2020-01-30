/*
 * GeometrySerialize.js
 *
 * (c) 2016 Marcio Teixeira. All rights reserved.
 *
 * Preview release. Not authorized for redistribution or third-party use.
 */

/* There might be ways to optimize this using ideas from:
 *   http://stackoverflow.com/questions/17442946/how-to-efficiently-convert-three-geometry-to-arraybuffer-file-or-blob
 *   http://www.html5rocks.com/en/tutorials/workers/basics/#toc-transferrables
 */
function geometryToJSON(geometry) {
	console.log("geometryToJSON");
	var vertices = new Float32Array(geometry.vertices.length * 3);
	var faces    = new Float32Array(geometry.faces.length    * 3);
	
	for(var i = 0; i < geometry.vertices.length; i++) {
		vertices[i*3 + 0] = geometry.vertices[i].x;
		vertices[i*3 + 1] = geometry.vertices[i].y;
		vertices[i*3 + 2] = geometry.vertices[i].z;
	}
	for(var i = 0; i < geometry.faces.length; i++) {
		faces[i*3 + 0] = geometry.faces[i].a;
		faces[i*3 + 1] = geometry.faces[i].b;
		faces[i*3 + 2] = geometry.faces[i].c;
	}
	return {data: {vertices: vertices.buffer, faces: faces.buffer}, tranferables: [vertices.buffer, faces.buffer]};
}

function jsonToGeometry(json) {
	console.log("jsonToGeometry");
	var vertices = new Float32Array(json.vertices);
	var faces    = new Float32Array(json.faces);
	
	var geometry = new THREE.Geometry();
	for(var i = 0; i < vertices.length; i += 3) {
		geometry.vertices.push(new THREE.Vector3(
			vertices[i],
			vertices[i+1],
			vertices[i+2]
		));
	}
	for(var i = 0; i < faces.length; i++) {
		geometry.faces.push(new THREE.Face3(
			faces[i],
			faces[i+1],
			faces[i+2]
		));
	}
	return geometry;
}