/**
 * WebSlicer
 * Copyright (C) 2016  Marcio Teixeira
 * Copyright (C) 2020  SynDaver Labs, Inc.
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

class PrintableObject extends THREE.Mesh {
    constructor(geometry) {
        if(!geometry instanceof THREE.BufferGeometry) {
            geometry.mergeVertices();
        } else {
            console.log("Is buffer geometry");
        }
        geometry.computeBoundingSphere();
        super(geometry, PrintableObject.material);
        this.generateConvexHull();
        this.castShadow = true;
    }

    generateConvexHull() {
        var vertices;
        if(!this.geometry instanceof THREE.BufferGeometry) {
            vertices = this.geometry.vertices;
        } else {
            const positions = this.geometry.getAttribute('position');
            vertices = [];
            for(var i = 0; i < positions.count; i++) {
                vertices.push(new THREE.Vector3(
                    positions.array[i * 3 + 0],
                    positions.array[i * 3 + 1],
                    positions.array[i * 3 + 2]
                ));
            }
        }
        this.hull = new THREE.ConvexGeometry(vertices);
        this.hull.computeFaceNormals();
    }
}

PrintableObject.material = new THREE.MeshPhongMaterial( { color: 0xfafad2, side: THREE.DoubleSide, flatShading: true } );