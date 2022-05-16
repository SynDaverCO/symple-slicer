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
        const positions = geometry.getAttribute('position');
        for(var i = 0; i < positions.count; i++) {
            vector.set(
                positions.array[i * 3 + 0],
                positions.array[i * 3 + 1],
                positions.array[i * 3 + 2]
            );
            lambda(vector, i);
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
    }

    static countFaces(geometry) {
        const position = geometry.getAttribute('position');
        const indices = geometry.getIndex();
        return indices ? indices.count / 3 : position.count / 3;
    }

    /**
     * Iterates through the faces in a geometry
     *
     *  geometry    - Geometry over which to iterate
     *  lambda      - Function to call for each face
     */
    static forEachFace(geometry, lambda) {
        const position = geometry.getAttribute('position').array;
        var indices = geometry.getIndex();
        const face = {
            a: new THREE.Vector3(),
            b: new THREE.Vector3(),
            c: new THREE.Vector3(),
            normal: new THREE.Vector3()
        };
        if (indices) indices = indices.array;
        const nFaces = GeometryAlgorithms.countFaces(geometry);
        for(var i = 0; i < nFaces; i++) {
            var faceA, faceB, faceC;
            if (indices) {
                faceA = indices.array[i * 3 + 0] * 3;
                faceB = indices.array[i * 3 + 1] * 3;
                faceC = indices.array[i * 3 + 2] * 3;
            } else {
                faceA = i * 9 + 0;
                faceB = i * 9 + 3;
                faceC = i * 9 + 6;
            }
            face.a.set(position[faceA + 0], position[faceA + 1], position[faceA + 2]);
            face.b.set(position[faceB + 0], position[faceB + 1], position[faceB + 2]);
            face.c.set(position[faceC + 0], position[faceC + 1], position[faceC + 2]);
            THREE.Triangle.getNormal(face.a,face.b,face.c,face.normal);
            lambda(face, i);
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

    /**
     * Call a function for each vertice in the geometry
     *
     *  geometry    - Geometry to work with.
     *  transform   - Matrix to apply to geometry
     *  callback    - Callback
     */
    static iterateVertices(geometry, transform, callback) {
        GeometryAlgorithms.forEachVertex(geometry, v => {
            v.applyMatrix4(transform);
            callback(v);
        });
        return callback;
    }

    /**
     * Generates the convex hull for a geometry
     */
    static makeConvexHull(geometry) {
        const vertices = [];
        GeometryAlgorithms.forEachVertex(geometry, (v, i) => {vertices.push(v.clone())});
        return new THREE.ConvexGeometry(vertices);
    }
}

class ObjectAlgorithms {
    /**
     * Generic method that calls a geometry algorithm on each of this object's
     * subobjects with an appropriate transform matrix
     */
    static _applyAlgorithm(obj, relativeTo, result, func) {
        relativeTo.updateMatrixWorld();
        var inverse   = new THREE.Matrix4().copy(relativeTo.matrixWorld).invert();
        var transform = new THREE.Matrix4();
        obj.traverse(child => {
            if (child.hasOwnProperty("geometry")) {
                child.updateMatrixWorld();
                transform.copy(inverse).multiply(child.matrixWorld);
                result = func(child.geometry, transform, result, child);
            }
        });
        return result;
    }

    /**
     * Finds the lowest point on an object
     *
     * obj        - The object for which we wish to find the lowest point.
     * relativeTo - Define "lowest" relative to this object's coordinate system.
     */
    static findLowestPoint(obj, relativeTo) {
        return ObjectAlgorithms._applyAlgorithm(obj, relativeTo, null,
            (geo, xform, data, child) => GeometryAlgorithms.findLowestPoint(geo, xform, data, child));
    }

    /**
     * Finds the true bounding box of an object
     *
     * obj        - The object for which we wish to compute the bounding box.
     * relativeTo - Relative to this object's coordinate system.
     */
    static findBoundingBox(obj, relativeTo, initialBox) {
        return ObjectAlgorithms._applyAlgorithm(obj, relativeTo, initialBox,
            (geo, xform, data, child) => GeometryAlgorithms.findBoundingBox(geo, xform, data));
    }

    /**
     * Finds all vertices in an object
     *
     * obj        - The object for which we wish to compute the vertices.
     * relativeTo - Relative to this object's coordinate system.
     */
    static findVertices(obj, relativeTo) {
        const vertices = [];
        ObjectAlgorithms._applyAlgorithm(obj, relativeTo, null,
            (geo, xform, data, child) =>
                GeometryAlgorithms.iterateVertices(geo, xform, v => vertices.push(v.clone())));
        return vertices;
    }

    /**
     * Finds the hull convex of an object
     *
     * obj        - The object for which we wish to compute the hull.
     * relativeTo - Relative to this object's coordinate system.
     */
    static findConvexHull(obj, relativeTo) {
        return new THREE.ConvexGeometry(ObjectAlgorithms.findVertices(obj, relativeTo));
    }

    /**
     * Finds the bounding box of an object
     *
     * obj        - The object for which we wish to compute bounding box.
     * relativeTo - Relative to this object's coordinate system.
     */
     static findBoundingBox(obj, relativeTo) {
        const box = new THREE.Box3();
        box.setFromPoints(ObjectAlgorithms.findVertices(obj, relativeTo));
        return box;
    }

    /**
     * Finds the bounding sphere of an object
     *
     * obj        - The object for which we wish to compute the hull.
     * relativeTo - Relative to this object's coordinate system.
     */
     static findBoundingSphere(obj, relativeTo) {
        const sphere = new THREE.Sphere();
        sphere.setFromPoints(ObjectAlgorithms.findVertices(obj, relativeTo));
        return sphere;
    }
}