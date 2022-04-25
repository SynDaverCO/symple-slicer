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

    getConvexHull() {
        if(!this.hasOwnProperty("hull")) {
            console.log("Computing convex hull");
            this.hull = GeometryAlgorithms.makeConvexHull(this.geometry);
        }
        return this.hull;
    }
}

PrintableObject.normalMaterial  = new THREE.MeshPhongMaterial( { color: 0xfafad2, side: THREE.DoubleSide, flatShading: true } );
PrintableObject.errorMaterial   = new THREE.MeshPhongMaterial( { color: 0xfa3e34, side: THREE.DoubleSide, flatShading: true } );

OverhangShader.patchMaterial(PrintableObject.normalMaterial);
