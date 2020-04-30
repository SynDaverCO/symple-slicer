/**
 * WebSlicer
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
 
 class GeometryAlgorithms {
    /**
     * Iterates through the vertices in a geometry
     *
     *  geometry    - Geometry for which we want to iterate
     *  lambda      - Function which will be called for each vertex
     */
    static forEachVertex(geometry, lambda) {
        const vector = new THREE.Vector3();
        if(geometry instanceof THREE.BufferGeometry) {
            const positions = geometry.getAttribute('position');
            for(var i = 0; i < positions.count; i++) {
                vector.set(
                    positions.array[i * 3 + 0],
                    positions.array[i * 3 + 1],
                    positions.array[i * 3 + 2]
                );
                lambda(vector, i);
            }
        } else {
            geometry.vertices.forEach((v, i) => lambda(vector.copy(v), i));
        }
    }

    /**
     * Finds the lowest point in the object.
     *
     *  geometry    - Geometry to work with.
     *  transform   - Matrix to apply to geometry
     *  lowestPoint - (optional) Pass result from previous call to continue search
     *  object      - (optional) Will be used to label the point if it is found
     */
    static findLowestPoint(geometry, transform, lowestPoint, object) {
        GeometryAlgorithms.forEachVertex(geometry, (v, i) => {
            v.applyMatrix4(transform);
            if (!lowestPoint) {
                lowestPoint = {object: object, index: i, z: v.z};
            } else {
                if(v.z < lowestPoint.z) {
                    lowestPoint.object = object;
                    lowestPoint.index  = i;
                    lowestPoint.z      = v.z;
                }
            }
        });
        return lowestPoint;
    }
 }