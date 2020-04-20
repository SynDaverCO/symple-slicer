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

/* There might be ways to optimize this using ideas from:
 *   http://stackoverflow.com/questions/17442946/how-to-efficiently-convert-three-geometry-to-arraybuffer-file-or-blob
 *   http://www.html5rocks.com/en/tutorials/workers/basics/#toc-transferrables
 */
function geometryToJSON(geometry) {
    var vertices, faces;
    if(geometry instanceof THREE.BufferGeometry) {
        vertices = geometry.getAttribute('position').array;
        faces    = geometry.getIndex().array;
    } else {
        vertices = new Float32Array(geometry.vertices.length * 3);
        faces    = new Uint16Array (geometry.faces.length    * 3);

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
    }
    return {data: {vertices: vertices.buffer, faces: faces.buffer}, tranferables: [vertices.buffer, faces.buffer]};
}

function jsonToGeometry(json, bufferedGeometry = false) {
    var vertices = new Float32Array(json.vertices);
    var faces    = new Uint16Array (json.faces);
    var geometry;

    if(bufferedGeometry) {
        geometry = new THREE.BufferedGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        geometry.setIndex( faces );
    } else {
        geometry = new THREE.Geometry();
        for(var i = 0; i < vertices.length; i += 3) {
            geometry.vertices.push(new THREE.Vector3(
                vertices[i],
                vertices[i+1],
                vertices[i+2]
            ));
        }
        for(var i = 0; i < faces.length; i += 3) {
            geometry.faces.push(new THREE.Face3(
                faces[i],
                faces[i+1],
                faces[i+2],
                new THREE.Vector3( 0, 1, 0 )
            ));
        }
        geometry.verticesNeedUpdate = true;
        geometry.elementsNeedUpdate = true;
    }
    return geometry;
}