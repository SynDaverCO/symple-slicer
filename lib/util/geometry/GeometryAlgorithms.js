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
     *  geometry    - Geometry over which to iterate
     *  lambda      - Function to call for each vertex
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
     * Iterates through the vertices in a geometry, allowing modification
     *
     *  geometry    - Geometry over which to iterate
     *  lambda      - Function to call for each vertex
     */
    static modifyEachVertex(geometry, lambda) {
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
                positions.array[i * 3 + 0] = vector.x;
                positions.array[i * 3 + 1] = vector.y;
                positions.array[i * 3 + 2] = vector.z;
            }
        } else {
            geometry.vertices.forEach((v, i) => lambda(vector, i));
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

    /**
     * Finds the true bounding box for geometry
     *
     *  geometry    - Geometry to work with.
     *  transform   - Matrix to apply to geometry
     *  boundingBox - (optional) Pass result from previous call to continue search
     */
    static findBoundingBox(geometry, transform, boundingBox) {
        if (!boundingBox) {
            boundingBox = new THREE.Box3();
        }
        GeometryAlgorithms.forEachVertex(geometry, v => {
            v.applyMatrix4(transform);
            boundingBox.expandByPoint(v);
        });
        return boundingBox;
    }


    /**
     * Creates geometry from ImageData as a lithophane.
     *
     *   imageData - Create a litho out of this imageData
     *   depth     - Height of modulated pixel values
     *   base      - Height of base
     */
    static geometryFromImageData(imageData, depth, base) {
        function getPixelValue(x,y) {
            const r = imageData.data[(y * imageData.width + x) * 4 + 0];
            const g = imageData.data[(y * imageData.width + x) * 4 + 1];
            const b = imageData.data[(y * imageData.width + x) * 4 + 2];
            return r * 0.2126 + g * 0.7152 + b * 0.0722;
        }

        const litho_depth = 10;
        const litho_base  = 1;
        const geometry = new THREE.BoxBufferGeometry(
            imageData.width - 1, imageData.height - 1, base, // Dimensions
            imageData.width - 1, imageData.height - 1, 1     // Subdivisions
        );
        GeometryAlgorithms.modifyEachVertex(geometry, v => {
            if(v.z > 0) {
                const x = Math.floor(v.x + imageData.width/2);
                const y = Math.floor(v.y + imageData.height/2);
                const z = (1.0 - getPixelValue(x, y) / 255) * depth;
                v.z += z;
            }
        });
        return geometry;
    }

    /**
     * Returns a list of geometry faces that contain a vertex
     *
     * This method only works on Geometry (not BufferedGeometry) for which
     * vertices have been merged.
     */
    static allFacesSharingVertex(geom, vertexIndex) {
        return geom.faces.filter(
            face =>
               vertexIndex == face.a ||
               vertexIndex == face.b ||
               vertexIndex == face.c);
    }
 }