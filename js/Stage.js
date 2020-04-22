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

class Stage {
    constructor() {
        this.printer = {
            circular:          false,
            origin_at_center:  false,
            x_width:           282,
            y_depth:           282,
            z_height:          286
        };

        this.objects = [];
        this.printerRepresentation = new PrinterRepresentation(this.printer);
        this.bedRelative   = this.printerRepresentation.bedRelative;
        this.placedObjects = new THREE.Object3D();
        this.selectedGroup = new SelectionGroup();
        this.dragging = false;
        this.packer = null;
        this.timer = new ResettableTimeout();

        this.bedRelative.add(this.placedObjects);
    }

    adjustViewpoint() {
        renderLoop.adjustViewpoint(this.printerRepresentation);
    }

    render() {
        renderLoop.render();
    }

    setPrinterCharacteristics(circular, origin_at_center, x_width, y_depth, z_height) {
        this.printer.circular         = circular;
        this.printer.origin_at_center = origin_at_center;
        this.printer.x_width          = x_width;
        this.printer.y_depth          = y_depth;
        this.printer.z_height         = z_height;
        this.printerRepresentation.update(this.printer);
        this.arrangeObjectsOnPlatform();
        this.adjustViewpoint();
        this.render();
    }

    getBedMatrixWorldInverse() {
        var inv = new THREE.Matrix4();
        return inv.getInverse(this.bedRelative.matrixWorld);
    }

    /**
     * Returns the bounding sphere of an object in bed coordinates
     */
    getObjectBoundingSphere(object, bedMatrixWorldInverse) {
        var sphere = object.geometry.boundingSphere.clone();
        sphere.applyMatrix4(object.matrixWorld);
        sphere.applyMatrix4(bedMatrixWorldInverse ? bedMatrixWorldInverse : this.getBedMatrixWorldInverse());
        return sphere;
    }

    /**
     * Positions an object in the center of the bed. If fudge
     * is non-zero, it adds a random element to the position
     * in order to aid with the packing algorithm
     */
    centerObjectOnPlatform(object, fudge) {
        var sphere = object.geometry.boundingSphere;
        var vector = new THREE.Vector3();
        var delta = this.localToBed(object, vector.copy(sphere.center));
        if(!this.printer.origin_at_center) {
            delta.x -= this.printer.x_width/2;
            delta.y -= this.printer.y_depth/2;
        }
        object.position.x -= delta.x;
        object.position.y -= delta.y;
        if(fudge) {
            object.position.x += (Math.random() - 0.5) * fudge;
            object.position.y += (Math.random() - 0.5) * fudge;
        }
    }

    /**
     * Arrange objects on the platform such that there is no overlap.
     * Currently this uses the object's bounding sphere to determine
     * a circular footprint of the the object on the print bed.
     * However, this could be improved for tall and skinny objects
     * by only computing the bounding circle in X and Y.
     */
    arrangeObjectsOnPlatform() {
        var circles = [];
        var packingFinished = () => {
            if(this.packer) {
                var p = this.packer;
                this.packer = null;
                p.destroy();
            }
        };

        if(this.packer) packingFinished();

        this.selectNone();

        // Create an array of circles for the packing algorithm

        const inv = this.getBedMatrixWorldInverse();
        for(const [index, object] of this.objects.entries()) {
            var sphere = this.getObjectBoundingSphere(object, inv);
            var circle = {
                id:       'c' + index,
                radius:   sphere.radius,
                position: {x: sphere.center.x, y: sphere.center.y},
            };
            if(this.printer.origin_at_center) {
                // The circle packing algorithm works only with positive coordinates,
                // so shift the coordinate system.
                circle.position.x += this.printer.x_width/2;
                circle.position.y += this.printer.y_depth/2;
            }
            circles.push(circle);
        }

        // Function for repositioning the objects on the bed

        var packingUpdate = (updatedCircles) => {
            for (let id in updatedCircles) {
                const index = parseInt(id.substring(1));
                const object = this.objects[index];
                const circle = updatedCircles[id];
                object.position.x += circle.delta.x;
                object.position.y += circle.delta.y;
            }
            this.render();
        };

        // Run the packing algorithm

        this.packer = new CirclePacker({
            target:               {x:     this.printer.x_width/2, y:      this.printer.y_depth/2},
            bounds:               {width: this.printer.x_width,   height: this.printer.y_depth  },
            circles,
            continuousMode:       true,
            collisionPasses:       5,
            centeringPasses:       3,
            onMove:               packingUpdate,
            onMoveEnd:            packingFinished
        });
        this.packer.update();
        // Packing might run continuously, to abort after a few seconds.
        this.timer.start(packingFinished, 5000);
    }

    /**
     * Converts a vector in object coordinates to print bed
     * coordinates
     */
    localToBed(child, vector) {
        this.bedRelative.worldToLocal(child.localToWorld(vector));
        return vector;
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
    findLowestPoint(vector, object, geometry, lowestPoint) {
        // Helper function for iterating through vertices, regardless of geometry type.
        const forEachVertex = (geom, lambda) => {
            if(geom instanceof THREE.BufferGeometry) {
                const positions = geom.getAttribute('position');
                const vector = new THREE.Vector3();
                for(var i = 0; i < positions.count; i++) {
                    vector.set(
                        positions.array[i * 3 + 0],
                        positions.array[i * 3 + 1],
                        positions.array[i * 3 + 2]
                    );
                    lambda(vector);
                }
            } else {
                geom.vertices.forEach(lambda);  
            }
        }

        forEachVertex(geometry, (v, i) => {
            this.localToBed(object, vector.copy(v));
            if (!lowestPoint) {
                lowestPoint = {object: object, index: i, z: vector.z};
            } else {
                this.localToBed(object, vector.copy(v));
                if(vector.z < lowestPoint.z) {
                    lowestPoint.object = object;
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
    dropObjectToFloor(obj) {
        obj.updateMatrixWorld();
        var lowestPoint;
        var vector = new THREE.Vector3();
        obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                lowestPoint = this.findLowestPoint(vector, child, child.hull, lowestPoint);
            }
        });
        if(lowestPoint) {
            obj.position.z -= lowestPoint.z;
        }
    }

    /**
     * Lays an object flat on the print bed
     */
    layObjectFlat(obj) {
        this.selectNone();

        var vector = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();

        // Step 1: Find the lowest point in the convex hull
        var pivot = this.findLowestPoint(vector, obj, obj.hull);

        // Step 2: Obtain the world quaternion of the object
        obj.matrixWorld.decompose( vector, quaternion, vector );
        
        // Helper function for iterating through faces, regardless of geometry type.
        const forEachFace = (geom, lambda) => {
            if(geom instanceof THREE.BufferGeometry) {
                console.log("Lay flat: Is buffer geometry");
                console.log(geom);
                console.log(geom.getIndex());
                if(geom.getIndex()) {
                    console.log("Is indexed");
                }
            } else {
                geom.faces.forEach(lambda);  
            }
        }

        // Step 3: For all faces that share this vertex, compute the angle of that face to the horizontal.
        var downVector = new THREE.Vector3(0, -1, 0);
        var candidates = [];
        forEachFace(obj.hull, (face) => {
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
        candidates.sort((a, b) => {return a.angle-b.angle});

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
        this.dropObjectToFloor(obj);
        this.render();
    }

    modifySelection(obj, addObject) {
        this.placedObjects.add(this.selectedGroup);
        if(addObject) {
            this.selectedGroup.addToSelection(obj);
        } else {
            this.selectedGroup.setSelection([obj]);
        }
        renderLoop.outlinePass.selectedObjects = [this.selectedGroup];
        this.transformControl.attach(this.selectedGroup);
        this.render();
    }

    selectNone() {
        this.selectedGroup.selectNone();
        renderLoop.outlinePass.selectedObjects = [];
        this.transformControl.detach();
        this.render();
    }

    getPrinterRepresentation() {
        return this.printerRepresentation;
    }

    /**
     * This function returns a list of ready to slice geometries with
     * all the transformations already baked in.
     */
    getAllGeometry() {
        return this.objects.map(obj => {
            var geometry = obj.geometry.clone();
            var transform = obj.matrixWorld.clone();
            var worldToPrinterRepresentation = new THREE.Matrix4();
            transform.premultiply(worldToPrinterRepresentation.getInverse(this.bedRelative.matrixWorld));
            geometry.applyMatrix4(transform);
            return geometry;
        });
    }

    addGeometry(geometry) {
        var obj = new PrintableObject(geometry);
        this.objects.push(obj);
        this.placedObjects.add(obj);
        this.dropObjectToFloor(obj);
        this.centerObjectOnPlatform(obj, 1);
        this.arrangeObjectsOnPlatform();
    }

    removeObjects() {
        this.selectNone();
        this.objects.forEach(obj => {this.placedObjects.remove(obj);});
        this.objects = [];
        this.render();
    }

    /**
     * Attaches a special handler for the TransformControl. Since the control
     * does not have a "mirror" mode, we use a custom "mouseDown" handler to
     * modify the behavior of the "translate" mode to act as if it were a
     * "mirror".
     */
    setTransformControl(control) {
        this.transformControl = control;
        this.transformControl.addEventListener( 'mouseDown', ( event ) => {
            if(this.currentTool == "mirror") {
                this.transformControl.dragging = false;
                switch(this.transformControl.axis) {
                    case 'X': this.selectedGroup.scale.x = this.selectedGroup.scale.x < 0 ? 1 : -1; break;
                    case 'Y': this.selectedGroup.scale.y = this.selectedGroup.scale.y < 0 ? 1 : -1; break;
                    case 'Z': this.selectedGroup.scale.z = this.selectedGroup.scale.z < 0 ? 1 : -1; break;
                }
                this.render();
                SettingsPanel.onObjectTransforming("scale");
            }
        } );
    }

    clearGcodePath() {
        if(this.toolpath) {
            this.showGcodePath(false);
            this.bedRelative.remove(this.toolpath);
            this.toolpath.dispose();
            this.placedObjects.visible = true;
        }
        this.render();
    }

    setGcodePath(gcode_path) {
        this.clearGcodePath();
        if(gcode_path) {
            this.toolpath = new Toolpath(gcode_path);
            this.toolpath.visible = false;
            this.bedRelative.add(this.toolpath);
        }
        this.render();
    }

    showGcodePath(which, enabled) {
        if(this.toolpath) {
            this.toolpath.setVisibility(which, enabled);
            if(this.toolpath.isVisible) {
                this.toolpath.visible      = true;
                this.placedObjects.visible = false;
            } else {
                this.toolpath.visible      = false;
                this.placedObjects.visible = true;
            }
            this.render();
        }
    }

    setGcodeLayer(value) {
        if(this.toolpath) {
            this.toolpath.setGcodeLayer(value);
            this.render();
        }
    }

    get isGcodePathVisible() {
        return this.toolpath && this.toolpath.isVisible;
    }

    // Returns a count of gcode layers
    getGcodeLayers() {
        return this.toolpath ? this.toolpath.nLayers : 0;
    }

    get tranformMode() {
        return this.currentTool == "mirror" ? "scale" : this.transformControl.mode;
    }

    // Event handlers

    onTranformToolChanged(tool) {
        this.transformControl.enabled = false;
        this.selectedGroup.recompute();
        this.currentTool = tool;
        const cntl = this.transformControl;
        switch(tool) {
            case "move":    cntl.setMode("translate"); cntl.setSpace("world"); break;
            case "rotate":  cntl.setMode("rotate");    cntl.setSpace("world"); break;
            case "scale":   cntl.setMode("scale");     cntl.setSpace("local"); break;
            case "mirror":  cntl.setMode("translate"); cntl.setSpace("local"); break;
            case "layflat": this.onLayFlatClicked(); break;
        }
        SettingsPanel.onTransformModeChanged(stage.tranformMode);
        this.transformControl.enabled = true;
    }

    onObjectTransformed() {
        this.dropObjectToFloor(this.selectedGroup);
        this.dragging = true;
    }

    onTransformationEdit(dropToFloor = true) {
        if (dropToFloor) {
            this.dropObjectToFloor(this.selectedGroup);
        }
        this.render();
    }

    onObjectClicked(obj, event) {
        this.modifySelection(obj, event.shiftKey);
        SettingsPanel.onObjectSelected();
    }

    onFloorClicked(obj) {
        this.selectNone();
        SettingsPanel.onObjectUnselected();
    }

    onMouseDown( raycaster, scene, event ) {
        this.dragging = false;
    }

    isControlObject(obj) {
        return obj instanceof THREE.TransformControls ?
            true :
            obj.parent ? this.isControlObject(obj.parent) : false;
    }

    /**
     * This method is called when the user clicks on an object.
     * It evaluates the intersections from the raycaster and
     * determines what to do.
     */
    onMouseUp( raycaster, scene, event ) {
        if(this.dragging) return;
        var intersects = raycaster.intersectObject( scene, true );
        for (var i = 0; i < intersects.length; i++) {
            var obj = intersects[ i ].object;
            if (this.isControlObject(obj)) {
                // Disregard clicks on the control object
                continue;
            }
            if (obj instanceof PrintableObject) {
                this.onObjectClicked(obj, event);
                return;
            }
            // Stop on first intersection
            return;
        }
        // If nothing selected
        this.onFloorClicked();
    }

    onViewChanged() {
        this.dragging = true;
    }

    onLayFlatClicked() {
        this.selectedGroup.children.forEach(obj => this.layObjectFlat(obj));
    }
}