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
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
        super(geometry, PrintableObject.normalMaterial);
        this.generateConvexHull();
        this.castShadow = true;
    }

    static applyStyleSheetColors() {
        const normalColor = getColorValueFromElement("#stl_normal", 'color');
        const errorColor = getColorValueFromElement("#stl_error", 'color');
        PrintableObject.normalMaterial.color = new THREE.Color(normalColor);
        PrintableObject.errorMaterial.color = new THREE.Color(errorColor);
    }

    set error(error) {
        this.material = error ? PrintableObject.errorMaterial : PrintableObject.normalMaterial;
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

    /**
     * Generic method that calls a geometry algorithm on each of this object's
     * subobjects with an appropriate transform matrix
     */
    static _applyAlgorithm(obj, relativeTo, result, func) {
        relativeTo.updateMatrixWorld();
        var inverse   = new THREE.Matrix4().getInverse(relativeTo.matrixWorld);
        var transform = new THREE.Matrix4();
        obj.traverse(child => {
            if (child.hasOwnProperty("hull")) {
                child.updateMatrixWorld();
                transform.copy(inverse).multiply(child.matrixWorld);
                result = func(child.hull, transform, result, child);
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
        return PrintableObject._applyAlgorithm(obj, relativeTo, null,
            (geo, xform, data, child) => GeometryAlgorithms.findLowestPoint(geo, xform, data, child));
    }

    /**
     * Finds the true bounding box of an object
     *
     * obj        - The object for which we wish to compute the bounding box.
     * relativeTo - Relative to this object's coordinate system.
     */
    static findBoundingBox(obj, relativeTo, initialBox) {
        return PrintableObject._applyAlgorithm(obj, relativeTo, initialBox,
            (geo, xform, data, child) => GeometryAlgorithms.findBoundingBox(geo, xform, data));
    }
}

PrintableObject.normalMaterial  = new THREE.MeshPhongMaterial( { color: 0xfafad2, side: THREE.DoubleSide, flatShading: true } );
PrintableObject.errorMaterial   = new THREE.MeshPhongMaterial( { color: 0xfa3e34, side: THREE.DoubleSide, flatShading: true } );