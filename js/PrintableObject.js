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
        geometry.mergeVertices();
        geometry.computeBoundingSphere();
        geometry.computeFaceNormals();
        super(geometry, PrintableObject.material);
        this.hull = new THREE.ConvexGeometry(this.geometry.vertices);
        this.hull.computeFaceNormals();
        this.castShadow = true;
    }
}

PrintableObject.material = new THREE.MeshLambertMaterial( { color: 0xfafad2, side: THREE.DoubleSide } );