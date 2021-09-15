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

class FaceRotationHelper {
    constructor(obj) {
        this.obj = obj;

        // Scratch vector and quaternion
        this.v = new THREE.Vector3();
        this.q = new THREE.Quaternion();

        // Obtain the world quaternion of the object
        this.worldQuaternion = new THREE.Quaternion();
        obj.matrixWorld.decompose( this.v, this.worldQuaternion, this.v );
    }

    /* Rotates a direction vector on the object to world coordinates */
    localDirectionToWorld(vector) {
        return vector.applyQuaternion(this.worldQuaternion);
    }

    /* Rotates a direction vector in world coordinates to object coordinates */
    worldDirectionToLocal(vector) {
        const worldInverse = this.q.copy(this.worldQuaternion).invert();
        return vector.applyQuaternion(worldInverse);
    }

    /* Transforms world coordinates to object coordinates */
    worldPositionToLocal(vector) {
        const inv = new THREE.Matrix4();
        inv.copy(this.obj.matrixWorld).invert();
        return vector.applyMatrix4(inv);
    }

    /**
     * Returns the angle between a face's normal and
     * a vector in world coordinates.
     *
     *    face   - A face whose normal we care about
     *    vector - A vector in world coordinates
     */
    angleBetweenFaceNormalAndVector(face, vector) {
        // Rotate face normal into world coordinates and
        // find the angle between it and the world vector
        const worldNormal = this.v.copy(face.normal);
        this.localDirectionToWorld(worldNormal);
        return Math.acos(worldNormal.dot(vector));
    }

    /**
     * Finds a quaternion that rotates the object such
     * that the face's normal aligns with the world vector
     *
     *    face        - A face whose normal we care about
     *    worldVector - A vector in world coordinates
     *    quaternion  - On output, the desired rotation
     */
    rotationToAlignFaceNormalToVector(face, worldVector, quaternion) {
        // Transform the worldVector into object coordinates
        const localVector = this.v.copy(worldVector);
        this.worldDirectionToLocal(localVector);
        // Rotate object so that the face normal and down vector are aligned.
        return quaternion.setFromUnitVectors(face.normal, localVector);
    }

    /**
     * Finds a quaternion that rotates the object such
     * that the face's normal aligns with the world vector
     *
     *    face        - A face whose normal we care about
     *    worldVector - A vector in world coordinates
     *    quaternion  - On output, the desired rotation
     */
    alignFaceNormalToVector(face, worldVector) {
        this.rotationToAlignFaceNormalToVector(face, worldVector, this.q);
        this.obj.quaternion.multiply(this.q);
    }

    /**
     * Find the intersection between a ray and a face in the geometry
     */
    findIntersectingFace(geom, origin, direction) {
        const localOrigin    = this.worldPositionToLocal(origin.clone());
        const localDirection = this.worldDirectionToLocal(direction.clone());
        const raycaster = new THREE.Raycaster(localOrigin, localDirection);
        const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({side: THREE.DoubleSide}));
        const intersections = raycaster.intersectObject(mesh);
        if (intersections.length) {
            return intersections[0].face;
        }
    }
}