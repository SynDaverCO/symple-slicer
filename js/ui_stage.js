/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
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

function Stage() {
    // Private:
    
    var printer = {
        circular:    false,
        z_height:    300,
        bed_radius:  150, // when circular
        bed_depth:   300, // when rectangular
        bed_width:   300
    };
    
    var printableObjects = [];
        
    /********************** OBJECT INITIALIZATION **********************/
        
    var printVolume = new THREE.Object3D();
    
    // Set to printer coordinates (Z goes up)
    printVolume.rotateX(-90 * Math.PI / 180);
    printVolume.rotateZ(180 * Math.PI / 180);
    
    // Checkerboard material
    var uniforms = {
        checkSize: { type: "f", value: 15 },
        color1: { type: "v4", value: new THREE.Vector4(0.5, 0.5, 1.0, 1) },
        color2: { type: "v4", value: new THREE.Vector4(0.5, 0.5, 0.7, 1) },
    };

    var material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('checkersVertexShader').innerHTML,
        fragmentShader: document.getElementById('checkersFragmentShader').innerHTML
    });
    
    // Circular print bed
    var geometry;
    if (printer.circular) {
        var segments = 64;
        geometry = new THREE.CircleGeometry( printer.bed_radius, segments );
    } else {
        geometry = new THREE.PlaneGeometry( printer.bed_width, printer.bed_depth, 1 );
    }
    
    // Topside
    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.z = -0.1;
    printVolume.add(mesh);
    
    // Bottom
    var material = new THREE.MeshBasicMaterial( { color: 0x5555FF, transparent: true, opacity: 0.5} );
    mesh = new THREE.Mesh( geometry, material );
    mesh.rotation.x = Math.PI * -180 / 180;
    mesh.position.y = -0.1;
    printVolume.add(mesh);
    
    // Walls
    if (printer.circular) {
        geometry = new THREE.CylinderGeometry( printer.bed_radius, printer.bed_radius, printer.z_height, segments );
    } else {
        geometry = new THREE.BoxGeometry( printer.bed_width, printer.bed_depth, printer.z_height );
    }
    geometry.rotateX(90 * Math.PI / 180);
    var material = new THREE.MeshBasicMaterial( { color: 0x5555FF, transparent: true, opacity: 0.5} );
    var mesh = new THREE.Mesh( geometry, material );
    material.side = THREE.BackSide;
    mesh.position.z = printer.z_height / 2;
    printVolume.add(mesh);
    
    // Axis
    var axesHelper = new THREE.AxesHelper( 25 );
    var a = 225;
    //axesHelper.position.x = printer.radius * 1.2 * Math.cos(a * Math.PI / 180);
    //axesHelper.position.y = printer.radius * 1.2 * Math.sin(a * Math.PI / 180);
    //axesHelper.position.z = 0;
    printVolume.add( axesHelper );
    
    /********************** PRIVATE METHODS **********************/
        
    function arrangeObjectsOnPlatform() {
        for( var i = 0; i < printableObjects.length; i++) {
            var object = printableObjects[i];
            var bounds = object.getBoundingBox();
            
            console.log(bounds.min.x, bounds.max.x, bounds.min.y, bounds.max.y)
            
            object.setPosition(
                -(bounds.min.x + bounds.max.x)/2,
                -(bounds.min.y + bounds.max.y)/2,
                -bounds.min.z
            );
        }
    }
    
    /**
     * Returns the PrintableObject associated with a Scene object
     */
    function findPrintableObject(obj) {
        return obj.hasOwnProperty("printableObjectIdx") ? printableObjects[obj.printableObjectIdx] : null;
    }
    
    /********************** PUBLIC METHODS **********************/
    
    this.mousePicker = function( raycaster, scene ) {
        var intersects = raycaster.intersectObject( scene, true );

        for ( var i = 0; i < intersects.length; i++ ) {
            var printableObject = findPrintableObject(intersects[ i ].object);
            if(printableObject) {
                //printableObject.setSelected(true);
                outlinePass.selectedObjects = [intersects[ i ].object];
            }
        }
    }
    
    this.getPrintVolume = function() {
        return printVolume;
    }
    
    this.getGeometry = function() {
        // TODO: Support multiple objects.
        return printableObjects[0].getGeometry();
    }
    
    this.addGeometry = function(geometry) {
        var printable = new PrintableObject(geometry);
        printableObjects.push(printable);
        var sceneObj = printable.getTHREESceneObject();
        sceneObj.printableObjectIdx = printableObjects.length - 1;
        printVolume.add(sceneObj);
        
        arrangeObjectsOnPlatform();
    }
    
    this.addEdges = function(edges) {
        printVolume.add(model);
    }
}