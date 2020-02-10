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

    this.printer = {
        circular:    false,
        z_height:    300,
        bed_radius:  150, // when circular
        bed_depth:   300, // when rectangular
        bed_width:   300
    };

    var printableObjects = [];
    var printVolume = new THREE.Object3D();
    var selectedGroup = new SelectionGroup();
    var dragging;
    
    this.onObjectTransformed = function() {
        dropObjectToFloor(selectedGroup);
        dragging = true;
    }

    /********************** OBJECT INITIALIZATION **********************/

    // Set to printer coordinates (Z goes up)
    printVolume.rotateX(-90 * Math.PI / 180);
    printVolume.rotateZ(180 * Math.PI / 180);

    // Checkerboard material
    var uniforms = {
        checkSize: { type: "f", value: 15 },
        color1: { type: "v4", value: new THREE.Vector4(0.55, 0.55, 0.55, 1) },
        color2: { type: "v4", value: new THREE.Vector4(0.50, 0.50, 0.50, 1) },
    };

    var checkerboardMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader:   document.getElementById('checkersVertexShader'  ).innerHTML,
        fragmentShader: document.getElementById('checkersFragmentShader').innerHTML,
        side: THREE.DoubleSide,
    });

    // Print bed representation
    var geometry;
    if (this.printer.circular) {
        var segments = 64;
        geometry = new THREE.CircleBufferGeometry( this.printer.bed_radius, segments );
    } else {
        geometry = new THREE.PlaneBufferGeometry( this.printer.bed_width, this.printer.bed_depth, 1 );
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

    var box = new THREE.BoxGeometry( this.printer.bed_width, this.printer.bed_depth, this.printer.z_height );
    geometry = new THREE.EdgesGeometry( box ); // or WireframeGeometry( geometry )
    material = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
    var wireframe = new THREE.LineSegments( geometry, material );
    wireframe.position.z = this.printer.z_height / 2;
    printVolume.add(wireframe);

    // Light for casting shadows
    
    var light = new THREE.DirectionalLight( 0xffffff, 0 );
    light.position.set( 0, 0, this.printer.z_height );
    light.castShadow = true;
    printVolume.add(light);

    if (this.printer.circular) {
        light.shadow.camera.left   = -this.printer.bed_radius;
        light.shadow.camera.right  =  this.printer.bed_radius;
        light.shadow.camera.top    = -this.printer.bed_radius;
        light.shadow.camera.bottom =  this.printer.bed_radius;
    } else {
        light.shadow.camera.left   = -this.printer.bed_width / 2;
        light.shadow.camera.right  =  this.printer.bed_width / 2;
        light.shadow.camera.top    = -this.printer.bed_depth / 2;
        light.shadow.camera.bottom =  this.printer.bed_depth / 2;
    }

    //Set up shadow properties for the light
    light.shadow.mapSize.width  = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near    = 0;
    light.shadow.camera.far     = this.printer.z_height + 1;

    this.shadowLight = light;

    // Axis
    var axesHelper = new THREE.AxesHelper( 25 );
    var a = 225;
    //axesHelper.position.x = this.printer.radius * 1.2 * Math.cos(a * Math.PI / 180);
    //axesHelper.position.y = this.printer.radius * 1.2 * Math.sin(a * Math.PI / 180);
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
     * Helper function for finding the point in an object closest
     * to the print bed.
     *
     *  vector       - Scratch Vector3 for use in computation
     *  object       - Parent object for geometry
     *  geometry     - Geometry to tranverse
     *  lowestPoint - Pass result from previous call to continue search
     */
    function findLowestPoint(vector, object, geometry, lowestPoint) {
        geometry.vertices.forEach(function(v, i) {
            localToBed(object, vector.copy(v));
            if (!lowestPoint) {
                lowestPoint = {object: object, vertex: v, index: i, z: vector.z};
            } else {
                localToBed(object, vector.copy(v));
                if(vector.z < lowestPoint.z) {
                    lowestPoint.object = object;
                    lowestPoint.vertex = v;
                    lowestPoint.index  = i;
                    lowestPoint.z      = vector.z;
                }
            }
        });
        return lowestPoint;
    }

    /**
     * Drops an object so it touches the print platform
     */
    function dropObjectToFloor(obj) {
        obj.updateMatrixWorld();
        var lowestPoint;
        var vector = new THREE.Vector3();
        obj.traverse(function(child) {
            if (child instanceof THREE.Mesh) {
                lowestPoint = findLowestPoint(vector, child, child.hull || child.geometry, lowestPoint);
            }
        });
        obj.position.z -= lowestPoint.z;
    }

    /**
     * Lays an object flat on the print bed
     */
    function layObjectFlat(obj) {
        selectNone();

        var vector = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();

        // Step 1: Find the lowest point in the convex hull
        var pivot = findLowestPoint(vector, obj, obj.hull);

        // Step 2: Obtain the world quaternion of the object
        obj.matrixWorld.decompose( vector, quaternion, vector );

        // Step 3: For all faces that share this vertex, compute the angle of that face to the horizontal.
        var downVector = new THREE.Vector3(0, -1, 0);
        var candidates = [];
        obj.hull.faces.forEach((face) => {
            if(pivot.index == face.a ||
               pivot.index == face.b ||
               pivot.index == face.c) {
                   // Rotate face normal into world coordinates and
                   // find the angle between it and the world down vector
                   vector.copy(face.normal);
                   vector.applyQuaternion(quaternion);
                   candidates.push({
                        angle:  Math.acos(vector.dot(downVector)),
                        normal: face.normal
                   });
               }
        });

        // Step 4: Find the normal which is closest to horizontal
        candidates.sort(function(a, b){return a.angle-b.angle});

        // Step 5: Transform the downVector into object coordinates
        downVector.applyQuaternion(quaternion.inverse());

        /*var arrowHelper = new THREE.ArrowHelper( downVector, new THREE.Vector3(), 100 );
        obj.add( arrowHelper );

        var arrowHelper = new THREE.ArrowHelper( vector, new THREE.Vector3(), 100 );
        obj.add( arrowHelper );*/

        // Step 6: Rotate object so that the face normal and down vector are aligned.
        // This causes the object to "layflat" on that face.
        quaternion.setFromUnitVectors(candidates[0].normal, downVector);
        obj.quaternion.multiply(quaternion);

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
        this.transformControl.enabled = false;
        selectedGroup.recompute();
        this.currentTool = tool;
        switch(tool) {
            case "move":    this.transformControl.setMode("translate"); break;
            case "rotate":  this.transformControl.setMode("rotate"); break;
            case "scale":   this.transformControl.setMode("scale"); break;
            case "mirror":  this.transformControl.setMode("translate"); break;
            case "layflat": onLayFlatClicked(); break;
        }
        this.transformControl.enabled = true;
    }

    this.onObjectClicked = function(obj) {
        addObjectToSelection(obj);
    }

    this.onFloorClicked = function(obj) {
        selectNone();
    }

    this.onMouseDown = function( raycaster, scene ) {
        dragging = false;
    }

    /**
     * This method is called when the user clicks on an object.
     * It evaluates the intersections from the raycaster and
     * determines what to do.
     */
    this.onMouseUp = function( raycaster, scene ) {
        if(dragging) return;
        var intersects = raycaster.intersectObject( scene, true );
        for (var i = 0; i < intersects.length; i++) {
            var obj = intersects[ i ].object;
            if (obj instanceof THREE.TransformControlsPlane)  continue; // Skip to next intersection
            if (obj == floorPlane)                            this.onFloorClicked();
            if (isPrintableObject(obj))                       this.onObjectClicked(obj);
            break; // Stop on first intersection
        }
    }
    
    this.onViewChanged = function() {
        dragging = true;
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

    /**
     * Attaches a special handler for the TransformControl. Since the control
     * does not have a "mirror" mode, we use a custom "mouseDown" handler to
     * modify the behavior of the "translate" mode to act as if it were a
     * "mirror".
     */
    this.setTransformControl = function(control) {
        this.transformControl = control;
        this.transformControl.space = "local";

        this.transformControl.addEventListener( 'mouseDown', function ( event ) {
            if(mine.currentTool == "mirror") {
                mine.transformControl.dragging = false;
                switch(mine.transformControl.axis) {
                    case 'X': selectedGroup.scale.x = selectedGroup.scale.x < 0 ? 1 : -1; break;
                    case 'Y': selectedGroup.scale.y = selectedGroup.scale.y < 0 ? 1 : -1; break;
                    case 'Z': selectedGroup.scale.z = selectedGroup.scale.z < 0 ? 1 : -1; break;
                }
            }
        } );
    }
}