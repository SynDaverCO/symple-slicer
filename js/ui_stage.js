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
    var printVolume = new THREE.Object3D();
    var selectedGroup = new SelectionGroup();

    this.onObjectTransformed = function() {
        dropObjectToFloor(selectedGroup);
    }

    /********************** OBJECT INITIALIZATION **********************/

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

    function isPrintableObject(obj) {
        return obj.hasOwnProperty("printableObjectIdx")
    }

    /**
     * Returns the PrintableObject associated with a 3D object
     */
    function findPrintableObject(obj) {
        return isPrintableObject(obj) ? printableObjects[obj.printableObjectIdx] : null;
    }
    
    /**
     * Converts a vector in object coordinates to print bed
     * coordinates
     */
    function localToBed(child, vector) {
        printVolume.worldToLocal(child.localToWorld(vector));
    }

    /**
     * Helper function for finding the vertex in an object closest
     * to the print bed.
     *
     *  vec          - Scratch Vector3 for use in computation
     *  parent       - Parent object for geometry
     *  geometry     - Geometry to tranverse
     *  lowestVertex - Pass result from previous call to continue search
     */
    function findLowestVertex(vector, object, geometry, lowestVertex) {
        geometry.vertices.forEach(function(v) {
            localToBed(object, vector.copy(v));
            if (!lowestVertex) {
                lowestVertex = {object: object, vertex: v, z: vector.z};
            } else {
                localToBed(object, vector.copy(v));
                if(vector.z < lowestVertex.z) {
                    lowestVertex.object = object;
                    lowestVertex.vertex = v;
                    lowestVertex.z      = vector.z;
                }
            }
        });
        return lowestVertex;
    }

    /**
     * Drops an object so it touches the print platform
     */
    function dropObjectToFloor(obj) {
        var lowestVertex;
        var vector = new THREE.Vector3();
        obj.traverse(function(child) {
            if (child instanceof THREE.Mesh) {
                lowestVertex = findLowestVertex(vector, child, child.hull || child.geometry, lowestVertex);
            }
        });
        obj.position.z -= lowestVertex.z;
    }
    
    /**
     * Lays an object flat on the print bed
     */
    function layObjectFlat(obj) {
        selectNone();
        // Step 1: Find the lowest vertex in the convex hull
        var vector = new THREE.Vector3();
        var lowestVertex = findLowestVertex(vector, obj, obj.hull);
        // Step 2: Obtain the world quaternion of the object
        var position = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();
        var scale = new THREE.Vector3();
        obj.matrixWorld.decompose( position, quaternion, scale );
        // Step 3: For all faces that share this vertex, compute the angle of that face to the horizontal.
        var downVector = new THREE.Vector3(0, -1, 0);
        var vertexIndex = obj.hull.vertices.indexOf(lowestVertex.vertex);
        var candidates = [];
        obj.hull.faces.forEach((face) => {
            if(vertexIndex == face.a ||
               vertexIndex == face.b ||
               vertexIndex == face.c) {
                   vector.copy(face.normal);
                   vector.applyQuaternion(quaternion);
                   candidates.push({
                        angle: Math.acos(vector.dot(downVector)),
                        face: face
                   });
               }
        });
        // Step 4: Find face closest to horizontal
        candidates.sort(function(a, b){return a.angle-b.angle});
        // Step 5: Find the normal vector for that face in world coordinates
        vector.copy(candidates[0].face.normal);
        downVector.applyQuaternion(quaternion.inverse());
        
        /*var arrowHelper = new THREE.ArrowHelper( downVector, new THREE.Vector3(), 100 );
        obj.add( arrowHelper );
        
        var arrowHelper = new THREE.ArrowHelper( vector, new THREE.Vector3(), 100 );
        obj.add( arrowHelper );*/
        
        // Step 6: Rotate object so that face is horizontal
        var rotation = new THREE.Quaternion();
        rotation.setFromUnitVectors(vector, downVector);

        // Step 6: Rotate object so that face is horizontal
        obj.quaternion.multiply(rotation);
        
        // Step 7: Bring the object down to the print plate
        dropObjectToFloor(obj);
        mine.render();
    }
    
    function onLayFlatClicked() {
        selectedGroup.children.forEach((obj) => {layObjectFlat(obj);});
    }

    function addObjectToSelection(obj) {
        printVolume.add(selectedGroup);
        selectedGroup.addToSelection(obj);
        outlinePass.selectedObjects = [selectedGroup];
        mine.transformControl.attach(selectedGroup);
        mine.render();
    }

    function selectNone() {
        selectedGroup.selectNone();
        outlinePass.selectedObjects = [];
        mine.transformControl.detach();
        mine.render();
    }

    /********************** PUBLIC METHODS **********************/

    this.onTranformToolChanged = function(tool) {
        switch(tool) {
            case "move":    this.transformControl.setMode("translate"); break;
            case "rotate":  this.transformControl.setMode("rotate"); break;
            case "scale":   this.transformControl.setMode("scale"); break;
            case "layflat": onLayFlatClicked(); break;
        }
    }

    this.onObjectClicked = function(obj) {
        addObjectToSelection(obj);
    }

    this.onFloorClicked = function(obj) {
        selectNone();
    }

    /**
     * This method is called when the user clicks on an object.
     * It evaluates the intersections from the raycaster and
     * determines what to do.
     */
    this.onMouseDown = function( raycaster, scene ) {
        var intersects = raycaster.intersectObject( scene, true );
        for (var i = 0; i < intersects.length; i++) {
            var obj = intersects[ i ].object;
            if (obj instanceof THREE.TransformControlsPlane)  continue; // Skip to next intersection
            if (obj == floorPlane)                            this.onFloorClicked();
            if (isPrintableObject(obj))                       this.onObjectClicked(obj);
            break; // Stop on first intersection
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
        //arrangeObjectsOnPlatform();
        dropObjectToFloor(sceneObj);
        this.render();
    }

    this.addEdges = function(edges) {
        printVolume.add(model);
    }
}