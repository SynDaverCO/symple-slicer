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

self.importScripts('../../three/three.js');
self.importScripts('../../three/OBJLoader.js');
self.importScripts('../../three/BufferGeometryUtils.js');
self.importScripts('../../util/geometry/GeometrySerialize.js');
self.importScripts('../../util/io/StlReader.js');

if(typeof TextEncoder === "undefined") {
    self.importScripts('../../FastestSmallestTextEncoderDecoder/EncoderDecoderTogether.min.js');
}

function loadFromOBJ(data) {
  var geometry = [];
  const ldr = new THREE.OBJLoader();
  const dec = new TextDecoder();
  const str = dec.decode(data);
  const obj = ldr.parse(str);
  obj.traverse( node => {
    if (node instanceof THREE.Mesh) {
      geometry.push(node.geometry);
    }
  });
  return geometry;
}

function loadFromSTL(data) {
    self.postMessage({cmd: 'progress', value: 0/4});
    var geometry = GEOMETRY_READERS.readStl(data, GEOMETRY_READERS.THREEGeometryCreator);
    self.postMessage({cmd: 'progress', value: 1/4});
    geometry.mergeVertices();
    self.postMessage({cmd: 'progress', value: 2/4});
    var bufferGeometry = geometryToIndexedBufferGeometry(geometry);
    geometry.dispose();
    self.postMessage({cmd: 'progress', value: 3/4});
    bufferGeometry.computeVertexNormals();
    return [bufferGeometry];
}

// It seems like the default routine for converting indexed Geometry to BufferGeometry removes
// the indexing information. So, roll our own conversion.

function geometryToIndexedBufferGeometry(geometry) {
    var vertices = new Float32Array(geometry.vertices.length * 3);
    var faces    = geometry.vertices.length > 65536 ?
        new Uint32Array(geometry.faces.length    * 3) :
        new Uint16Array(geometry.faces.length    * 3);
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

    var bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setIndex(new THREE.BufferAttribute(faces, 1));
    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3 ));
    return bufferGeometry;
}

function send(geometry) {
    geometry.forEach(
        geometry => {
            var payload = geometryToJSON(geometry);
            self.postMessage({
                cmd: 'geometry',
                geometry: payload.data,
            }, payload.tranferables);
        }
    );
}

/**
 * Event Listeners
 */

function receiveMessage(e) {
    var cmd  = e.data.cmd;
    var data = e.data;
    switch (cmd) {
        case 'loadSTL': send(loadFromSTL(data.data)); break;
        case 'loadOBJ': send(loadFromOBJ(data.data)); break;
        case 'stop': stop(); break;
        default: console.log('Unknown command: ' + cmd);
    };
}

self.addEventListener('message', receiveMessage, false);