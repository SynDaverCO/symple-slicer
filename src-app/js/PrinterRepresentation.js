/**
 * WebSlicer
 * Copyright (C) 2020  SynDaver Labs, Inc.
 * Copyright (C) 2016  Marcio Teixeira
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

class PrinterRepresentation extends THREE.Object3D {
    constructor(printer) {
        super();

        // Set to printer coordinates (Z goes up)
        this.rotateX(-90 * Math.PI / 180);
        this.rotateZ(180 * Math.PI / 180);

        this.bedRelative = new THREE.Object3D();
        this.bedRelative.add( new THREE.AxesHelper( 25 ) );
        this.add(this.bedRelative);

        this.light = new THREE.DirectionalLight( 0xffffff, 0 );
        this.add(this.light);
        this.constructRepresentation(printer);
    }

    static applyStyleSheetColors() {
        const frameColor = getColorValueFromElement("#print_volume", 'border-color');
        const gridColor1 = getColorFloatArrayFromElement("#bed_grid", 'color');
        const gridColor2 = getColorFloatArrayFromElement("#bed_grid", 'background-color');

        PrinterRepresentation.wireframeMaterial.color = new THREE.Color(frameColor);
        PrinterRepresentation.checkerboardMaterial.uniforms.color1.value = new THREE.Vector4(gridColor1[0], gridColor1[1], gridColor1[2]);
        PrinterRepresentation.checkerboardMaterial.uniforms.color2.value = new THREE.Vector4(gridColor2[0], gridColor2[1], gridColor2[2]);
    }

    constructRepresentation(printer) {
        if (printer.circular) {
            var segments = 64;
            var bed_diameter = Math.min(printer.x_width, printer.y_depth);
            this.bed_geometry = new THREE.CircleBufferGeometry( bed_diameter/2, segments );
        } else {
            this.bed_geometry = new THREE.PlaneBufferGeometry( printer.x_width, printer.y_depth, 1 );
        }

        // Shadow receiver
        this.floor = new THREE.Mesh( this.bed_geometry, PrinterRepresentation.shadowMaterial );
        this.floor.position.z = 0.1;
        this.floor.receiveShadow = true;
        this.add(this.floor);

        // Checkered floor
        this.checkers = new THREE.Mesh( this.bed_geometry, PrinterRepresentation.checkerboardMaterial );
        this.checkers.position.z = 0.05;
        this.add(this.checkers);

        PrinterRepresentation.checkerboardMaterial.uniforms.checkSize.value = new THREE.Vector2(printer.x_width/10, printer.y_depth/10);

        // Walls

        this.box_geometry = new THREE.BoxGeometry( printer.x_width, printer.y_depth, printer.z_height );
        this.edge_geometry = new THREE.EdgesGeometry( this.box_geometry );
        this.box_frame = new THREE.LineSegments( this.edge_geometry, PrinterRepresentation.wireframeMaterial );
        this.box_frame.position.z = printer.z_height / 2;
        this.add(this.box_frame);

        // Light for casting shadows

        this.light.position.set( 0, 0, printer.z_height );
        this.light.castShadow = true;

        this.light.shadow.camera.left   = -printer.x_width / 2;
        this.light.shadow.camera.right  =  printer.x_width / 2;
        this.light.shadow.camera.top    = -printer.y_depth / 2;
        this.light.shadow.camera.bottom =  printer.y_depth / 2;

        //Set up shadow properties for the light
        this.light.shadow.mapSize.width  = 512;
        this.light.shadow.mapSize.height = 512;
        this.light.shadow.camera.near    = 0;
        this.light.shadow.camera.far     = printer.z_height + 1;

        // Adjust bed relative coordinate system.

        if (!printer.origin_at_center) {
            this.bedRelative.position.x = -printer.x_width / 2;
            this.bedRelative.position.y = -printer.y_depth / 2;
        } else {
            this.bedRelative.position.x = 0;
            this.bedRelative.position.y = 0;
        }
    }

    destroyRepresentation() {
        this.remove(this.floor);
        this.remove(this.checkers);
        this.remove(this.box_frame);

        this.box_geometry.dispose();
        this.edge_geometry.dispose();
    }

    update(printer) {
        this.destroyRepresentation();
        this.constructRepresentation(printer);
    }
}

// Static class properties

PrinterRepresentation.checkersFragmentShader = `
        varying vec2  vUv;
        uniform vec2 checkSize;
        uniform vec4  color1;
        uniform vec4  color2;

        vec4 checker(in float u, in float v) {
            float fmodResult = mod(floor(checkSize.x * u) + floor(checkSize.y * v), 2.0);

            if (fmodResult < 1.0) {
                return color1;
            } else {
                return color2;
            }
        }

        void main() {
            vec2 position = -1.0 + 2.0 * vUv;
            gl_FragColor = checker(vUv.x, vUv.y);
        }
    `;

PrinterRepresentation.checkersVertexShader = `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

PrinterRepresentation.checkerboardMaterial = new THREE.ShaderMaterial({
    uniforms: {
        checkSize: { type: "v2", value: new THREE.Vector2(15,15) },
        color1:    { type: "v4", value: new THREE.Vector4(0.55, 0.55, 0.55, 1) },
        color2:    { type: "v4", value: new THREE.Vector4(0.50, 0.50, 0.50, 1) },
    },
    vertexShader:   PrinterRepresentation.checkersVertexShader,
    fragmentShader: PrinterRepresentation.checkersFragmentShader,
    side: THREE.DoubleSide,
});

PrinterRepresentation.shadowMaterial = new THREE.ShadowMaterial({opacity: 0.25});

PrinterRepresentation.wireframeMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );