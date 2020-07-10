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
        this.geometry.setAttribute( 'position',   new THREE.BufferAttribute(this.lineSegmentEnds,       3));
        this.geometry.setAttribute( 'normal',     new THREE.BufferAttribute(this.lineSegmentNormal,     3));
        this.geometry.setAttribute( 'colorIndex', new THREE.BufferAttribute(this.lineSegmentColorIndex, 1));
        this.lines = new THREE.LineSegments( this.geometry, this.getShaderMaterial() );
        this.add(this.lines);
    }

    loadGCodePath(gcode_parser) {
        this.nSegments = 0;
        this.nLayers   = 0;
        
        gcode_parser.parse({
            motion:  (x, y, z, e) => this.nSegments++,
            comment: (key, value) => {if(key == "LAYER") this.nLayers = Math.max(this.nLayers, parseInt(value))}
        });

        this.lineSegmentEnds       = new Float32Array(this.nSegments*6); // 6 floats per segment
        this.lineSegmentNormal     = new Float32Array(this.nSegments*6); // 6 floats per segment
        this.lineSegmentColorIndex = new Float32Array(this.nSegments*2); // 2 float per segment
        
        this.layerEnd              = new Uint32Array(this.nLayers+1);

        var i = 0;
        var last_x, last_y, last_z, last_e;
        var typeColorIndex   = Toolpath.typeList.indexOf("DEFAULT");
        var travelColorIndex = Toolpath.typeList.indexOf("TRAVEL");
        gcode_parser.parse({
            comment:
                (key, value) => {
                    if(key == "TYPE") {
                        if(!Toolpath.colorMap.hasOwnProperty(value)) {
                            key = "DEFAULT";
                            console.log("Warning: Unknown gcode type:", value);
                        }
                        typeColorIndex = Toolpath.typeList.indexOf(value);
                    }
                    if(key == "LAYER") {
                        this.layerEnd[parseInt(value)] = i;
                    }
                },
            motion:
                (this_x, this_y, this_z, this_e) =>
                {
                    // Initial condition
                    if(i == 0) {
                        last_x = this_x;
                        last_y = this_y;
                        last_z = this_z;
                        last_e = this_e;
                    }

                    var isExtruding = this_e > last_e;
                    var colorIndex = isExtruding ? typeColorIndex : travelColorIndex;
                    
                    // If extruding, add a segment to line segments
                    this.lineSegmentEnds[i*6 + 0] = last_x;
                    this.lineSegmentEnds[i*6 + 1] = last_y;
                    this.lineSegmentEnds[i*6 + 2] = last_z;
                    this.lineSegmentEnds[i*6 + 3] = this_x;
                    this.lineSegmentEnds[i*6 + 4] = this_y;
                    this.lineSegmentEnds[i*6 + 5] = this_z;

                    // Record the surface normal in XY plane
                    this.lineSegmentNormal[i*6 + 0] = last_y - this_y;
                    this.lineSegmentNormal[i*6 + 1] = last_x - this_x;
                    this.lineSegmentNormal[i*6 + 2] = 0;
                    this.lineSegmentNormal[i*6 + 3] = last_y - this_y;
                    this.lineSegmentNormal[i*6 + 4] = last_x - this_x;
                    this.lineSegmentNormal[i*6 + 5] = 0;

                    this.lineSegmentColorIndex[i*2 + 0] = colorIndex / Toolpath.numColors;
                    this.lineSegmentColorIndex[i*2 + 1] = colorIndex / Toolpath.numColors;
                    i++;
                    
                    last_x = this_x;
                    last_y = this_y;
                    last_z = this_z;
                    last_e = Math.max(this_e, last_e); // Use max here for retractions
                },
            setPosition:
                (axis, value) => {
                    switch(axis) {
                        case "X": last_x = value; break;
                        case "Y": last_y = value; break;
                        case "Z": last_z = value; break;
                        case "E": last_e = value; break;
                    }
                }
        });
    }

    getShaderTexture() {
        var colorData  = new Uint8Array(4 * Toolpath.numColors);
        
        Toolpath.typeList.forEach( (name, index) => {
            colorData[index * 4 + 0] = Toolpath.colorMap[name][0];
            colorData[index * 4 + 1] = Toolpath.colorMap[name][1];
            colorData[index * 4 + 2] = Toolpath.colorMap[name][2];
            colorData[index * 4 + 3] = Toolpath.colorMap[name][3] * (Toolpath.layerVisibility[index] ? 1 : 0);
        });
        
        if(Toolpath.texture) {
            Toolpath.texture.dispose();
        }
        
        Toolpath.texture = new THREE.DataTexture(colorData, 1, Toolpath.numColors, THREE.RGBAFormat);
        return Toolpath.texture;
    }
    
    getShaderMaterial() {
        if(!Toolpath.shader) {
            Toolpath.layerVisibility = new Array(Toolpath.numColors).fill(true);
            
            Toolpath.shader = new THREE.ShaderMaterial( {
                vertexShader:   Toolpath.vertexShader,
                fragmentShader: Toolpath.fragmentShader,
                uniforms: {
                    lightDirection:   {value: new THREE.Vector3(1,-1,1).normalize()},
                    ambient:          {value: 0.4},
                    diffuse:          {value: 0.7},
                    colorMap:         {value: this.getShaderTexture()}
                },
                transparent: true
            });
        }
        return Toolpath.shader;
    }
    
    /**
     * Enable or disables a particular layer
     */
    setVisibility(what, state) {
        var index = Toolpath.typeList.indexOf(what);
        if(index != -1) {
            Toolpath.layerVisibility[index] = state;
            Toolpath.shader.uniforms.colorMap.value = this.getShaderTexture();
        }
    }
    
    /**
     * Checks to see if any of the layers are enabled
     */
    get hasVisibleLayers() {
        return Toolpath.layerVisibility.some(x => x);
    }

    dispose() {
        this.geometry.dispose();
    }
    
    setGcodeLayer(layer) {
        this.geometry.setDrawRange(0, this.layerEnd[layer]*2);
    }

}

Toolpath.colorMap = {
   "TRAVEL":            [0,   0,   0,   128],
   "SKIN":              [250, 250, 210, 255],
   "WALL-OUTER":        [250, 250, 210, 255],
   "WALL-INNER":        [250, 250, 210, 255],
   "FILL":              [0,   255,   0, 255],
   "SKIRT":             [255, 255,   0, 255],
   "SUPPORT":           [128, 128, 128, 255],
   "SUPPORT-INTERFACE": [128, 128, 128, 255],
   "DEFAULT":           [128, 128, 128, 255]
};
Toolpath.typeList = Object.keys(Toolpath.colorMap);
Toolpath.numColors = Toolpath.typeList.length;

Toolpath.shader = null;

Toolpath.vertexShader = `
    uniform   vec3      lightDirection;
    uniform   float     ambient;
    uniform   float     diffuse;
    uniform   sampler2D colorMap;
    attribute float     colorIndex;
    varying   vec2      vUv;
    varying   vec4      vColor;

    void main() {
       vec4 color  = texture2D(colorMap, vec2(0,colorIndex));
       float iDiff = diffuse * abs(dot(normalize(normal), lightDirection));
       vUv         = uv;
       vColor      = vec4(clamp(vec3(color) * (iDiff + ambient), 0., 1.), color.a);
       gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;

Toolpath.fragmentShader = `
    varying   vec4    vColor;

    void main()  {
       if(vColor.a < 0.01) {
           discard;
       }
       gl_FragColor = vColor;
    }
`;