/**
 *
 * @licstart
 *
 * Copyright (C) 2020  SynDaver Labs, Inc.
 * Copyright (C) 2017  AlephObjects, Inc.
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU Affero
 * General Public License (GNU AGPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU AGPL for more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU AGPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 *
 */

class Toolpath extends THREE.Object3D {
    constructor(gcode_path) {
        super();
        
        this.geometry = new THREE.BufferGeometry();
        this.loadGCodePath(gcode_path);
        this.geometry.setAttribute( 'position',  new THREE.BufferAttribute(this.lineSegmentEnds,      3));
        this.geometry.setAttribute( 'color',     new THREE.BufferAttribute(this.lineSegmentColors,    3));
        this.geometry.setAttribute( 'normal',    new THREE.BufferAttribute(this.lineSegmentNormal,    3));
        this.lines = new THREE.LineSegments( this.geometry, this.getShaderMaterial() );
        this.add(this.lines);
    }

    loadGCodePath(gcode_path) {
        var color = new THREE.Color(0xFF00FF);
        
        var toolpathSegments = 0;
        gcode_path.forEachSegment((gcode_x, gcode_y, gcode_z, gcode_e) => {toolpathSegments++;});

        this.lineSegmentEnds      = new Float32Array(toolpathSegments*6); // 6 floats per segment
        this.lineSegmentColors    = new Float32Array(toolpathSegments*6); // 6 floats per segment
        this.lineSegmentNormal    = new Float32Array(toolpathSegments*6); // 6 floats per segment

        var i = 0;
        var last_x, last_y, last_z;
        gcode_path.forEachSegment(
            (gcode_x, gcode_y, gcode_z, gcode_e) =>
            {
                var this_x = gcode_x;
                var this_y = gcode_y;
                var this_z = gcode_z;
                
                // Initial condition
                if(i == 0) {
                    last_x = this_x;
                    last_y = this_y;
                    last_z = this_z;
                }

                // If extruding, add a segment to line segments
                this.lineSegmentEnds[i*6 + 0] = last_x;
                this.lineSegmentEnds[i*6 + 1] = last_y;
                this.lineSegmentEnds[i*6 + 2] = last_z;
                this.lineSegmentEnds[i*6 + 3] = this_x;
                this.lineSegmentEnds[i*6 + 4] = this_y;
                this.lineSegmentEnds[i*6 + 5] = this_z;

                // Record the surface normal in XZ plane
                this.lineSegmentNormal[i*6 + 0] = last_z - this_z;
                this.lineSegmentNormal[i*6 + 1] = 0;
                this.lineSegmentNormal[i*6 + 2] = last_x - this_x;
                this.lineSegmentNormal[i*6 + 3] = last_z - this_z;
                this.lineSegmentNormal[i*6 + 4] = 0;
                this.lineSegmentNormal[i*6 + 5] = last_x - this_x;

                this.lineSegmentColors[i*6 + 0] = color.r;
                this.lineSegmentColors[i*6 + 1] = color.g;
                this.lineSegmentColors[i*6 + 2] = color.b;
                this.lineSegmentColors[i*6 + 3] = color.r;
                this.lineSegmentColors[i*6 + 4] = color.g;
                this.lineSegmentColors[i*6 + 5] = color.b;
                
                i++;
                
                last_x = this_x;
                last_y = this_y;
                last_z = this_z;
            }
        );
    }

    getShaderMaterial() {
        return new THREE.ShaderMaterial( {
            vertexShader:   Toolpath.vertexShader,
            fragmentShader: Toolpath.fragmentShader,
            uniforms: {
                lightDirection:   {value: new THREE.Vector3(1,1,-1).normalize()},
                ambient:          {value: 0.4},
                diffuse:          {value: 0.7}
            },
            vertexColors: THREE.VertexColors,
            transparent: false
        });
    }

    dispose() {
        this.geometry.dispose();
    }
}

Toolpath.vertexShader = `
    uniform   vec3    lightDirection;
    uniform   float   ambient;
    uniform   float   diffuse;
    varying   vec2    vUv;
    varying   vec3    vColor;

    void main() {
       float       iDiff = diffuse * max(dot(normalize(normal), lightDirection),0.);
       vUv         = uv;
       vColor      = clamp(abs(color) * (iDiff + ambient), 0., 1.);
       gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;

Toolpath.fragmentShader = `
    varying   vec3    vColor;

    void main()  {
       gl_FragColor = vec4(vColor, 1.0);
    }
`;