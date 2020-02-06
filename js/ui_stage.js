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

function Stage() {
    var mine = this;

    // Private:

    var printer = {
        circular:    false,
        z_height:    300,
        bed_radius:  150, // when circular
        bed_depth:   300, // when rectangular
        bed_width:   300
    };

    var printableObjects = [];

    var selectedPrintableObject = null;

    this.onObjectTransformed = function() {
        if(selectedPrintableObject != null)
            dropToFloor(selectedPrintableObject);
    }

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

    var checkerboardMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader:   document.getElementById('checkersVertexShader'  ).innerHTML,
        fragmentShader: document.getElementById('checkersFragmentShader').innerHTML,
        side: THREE.DoubleSide,
    });

    // Print bed representation
    var geometry;
    if (printer.circular) {
        var segments = 64;
        geometry = new THREE.CircleBufferGeometry( printer.bed_radius, segments );
    } else {
        geometry = new THREE.PlaneBufferGeometry( printer.bed_width, printer.bed_depth, 1 );
    }

    // Shadow receiver
    var mesh = new THREE.Mesh( geometry, new THREE.ShadowMaterial({opacity: 0.25}) );
    mesh.position.z = 0.1;
    mesh.receiveShadow = true;
    printVolume.add(mesh);
    var floorPlane = mesh;

    // Checkered floor
    var mesh = new THREE.Mesh( geometry, checkerboardMaterial );
    mesh.position.z = 0.05;
    printVolume.add(mesh);

    // Walls
    if (printer.circular) {
        geometry = new THREE.CylinderGeometry( printer.bed_radius, printer.bed_radius, printer.z_height, segments );
    } else {
        geometry = new THREE.BoxGeometry( printer.bed_width, printer.bed_depth, printer.z_height );
    }
    geometry.rotateX(90 * Math.PI / 180);
    var material = new THREE.MeshBasicMaterial( {
        color: 0x5555FF,
        transparent: true,
        side: THREE.BackSide,
        opacity: 0.5,
        depthWrite: false
    } );
    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.z = printer.z_height / 2;
    printVolume.add(mesh);

    // Light for casting shadows
    
    var light = new THREE.DirectionalLight( 0xffffff, 0 );
    light.position.set( 0, 0, printer.z_height );
    light.castShadow = true;
    printVolume.add(light);

    if (printer.circular) {
        light.shadow.camera.left   = -printer.bed_radius;
        light.shadow.camera.right  =  printer.bed_radius;
        light.shadow.camera.top    = -printer.bed_radius;
        light.shadow.camera.bottom =  printer.bed_radius;
    } else {
        light.shadow.camera.left   = -printer.bed_width / 2;
        light.shadow.camera.right  =  printer.bed_width / 2;
        light.shadow.camera.top    = -printer.bed_depth / 2;
        light.shadow.camera.bottom =  printer.bed_depth / 2;
    }

    //Set up shadow properties for the light
    light.shadow.mapSize.width  = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near    = 0;
    light.shadow.camera.far     = printer.z_height + 1;

    this.shadowLight = light;

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

            object.object.position.set(
                -(bounds.min.x + bounds.max.x)/2,
                -(bounds.min.y + bounds.max.y)/2,
                -bounds.min.z
            );
        }
    }

    /**
     * Returns the PrintableObject associated with a 3D object
     */
    function findPrintableObject(obj) {
        return obj.hasOwnProperty("printableObjectIdx") ? printableObjects[obj.printableObjectIdx] : null;
    }

    /**
     * Drops a PrintableObject so it touches the print platform
     */
    function dropToFloor(obj) {
        var min_z = Number.POSITIVE_INFINITY;
        var pt = new THREE.Vector3();
        obj.hull.vertices.forEach(function(v) {
            pt.copy(v);
            printVolume.worldToLocal(obj.object.localToWorld(pt));
            min_z = Math.min(min_z, pt.z);
        });
        obj.object.position.z -= min_z;
    }

    /********************** PUBLIC METHODS **********************/

    this.onTranformToolChanged = function(tool) {
        switch(tool) {
            case "move":   this.transformControl.setMode("translate"); break;
            case "rotate": this.transformControl.setMode("rotate"); break;
            case "scale":  this.transformControl.setMode("scale"); break;
        }
    }

    /**
     * This method is called when the user clicks on an object.
     * It evaluates the intersections from the raycaster and
     * determines what should be selected or unselected.
     */
    this.onMouseDown = function( raycaster, scene ) {
        var intersects = raycaster.intersectObject( scene, true );

        for (var i = 0; i < intersects.length; i++) {
            var obj = intersects[ i ].object;
            // If the first object we hit is the floor plane,
            // then unselect everything.
            if(i == 0 && obj == floorPlane) {
                outlinePass.selectedObjects = [];
                mine.transformControl.detach();
                break;
            }
            // If we intersected a PrintableObject, highlight it.
            var printableObject = findPrintableObject(obj);
            if(printableObject) {
                outlinePass.selectedObjects = [obj];
                mine.transformControl.attach(obj);
                selectedPrintableObject = printableObject;
                break;
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
        this.render();
    }

    this.addEdges = function(edges) {
        printVolume.add(model);
    }
}