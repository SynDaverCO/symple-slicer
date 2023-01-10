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

import { OverhangShader } from './OverhangShaderMaterial.js';
import { ParseColor } from '../lib/util/misc/ParseColor.js';

export class PrintableObject extends THREE.Mesh {
    constructor(geometry) {
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
        super(geometry, PrintableObject.modelMaterials[0]);
        this.castShadow = true;
        this.extruder = 0;
    }

    static applyStyleSheetColors() {
        const normalColor = ParseColor.getColorValueFromElement("#stl_normal", 'color');
        const errorColor = ParseColor.getColorValueFromElement("#stl_error", 'color');
        PrintableObject.modelMaterials[0].color = new THREE.Color(normalColor);
        PrintableObject.errorMaterials[0].color = new THREE.Color(errorColor);
        // Recompute color shades
        PrintableObject.allocateMaterials(PrintableObject.modelMaterials, 0);
        PrintableObject.allocateMaterials(PrintableObject.errorMaterials, 0);
    }

    set error(error) {
        this.material = (error ? PrintableObject.errorMaterials : PrintableObject.modelMaterials)[this.extruder];
    }

    setExtruder(extruder) {
        // Make sure we have enough materials in the array
        PrintableObject.allocateMaterials(PrintableObject.modelMaterials, extruder+1);
        PrintableObject.allocateMaterials(PrintableObject.errorMaterials, extruder+1);
        // Assign material to this object
        this.extruder = extruder;
        this.material = PrintableObject.modelMaterials[extruder];
    }

    // Make sure there are at least "count" materials available
    // and recompute shades.
    static allocateMaterials(materials, count) {
        // Expand the material list by duplicating the first element
        while(materials.length < count) {
            const newMaterial = materials[0].clone();
            if(materials == PrintableObject.modelMaterials)
                OverhangShader.patchMaterial(newMaterial);
            materials[materials.length] = newMaterial;
        }
        // Make each subsequent color a darker shade of the previous color.
        for(var i = 1; i < materials.length; i++) {
            const c = materials[i].color;
            c.copy(materials[0].color);
            c.offsetHSL(0,0,-1/materials.length*i);
        }
    }
}

PrintableObject.modelMaterials = [new THREE.MeshPhongMaterial( { color: 0xfafad2, side: THREE.DoubleSide, flatShading: true } )];
PrintableObject.errorMaterials = [new THREE.MeshPhongMaterial( { color: 0xfa3e34, side: THREE.DoubleSide, flatShading: true } )];

OverhangShader.patchMaterial(PrintableObject.modelMaterials[0]);
