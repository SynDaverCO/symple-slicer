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
        this.dragging      = false;
        this.packer = null;
        this.timer = new ResettableTimeout();

        this.selection = new SelectionGroup();
        this.selection.onTransformChange = mode => {
            this.render();
            SettingsPanel.onTransformChange(mode);
        }
        this.selection.onTransformEnd = () => {
            this.dropObjectToFloor(this.selection);
            this.highlightOutOfBounds(this.selection.children);
        };
        this.selection.onSelectionChanged = SettingsPanel.onSelectionChanged;

        this.placedObjects.add(this.selection);
        this.bedRelative.add(this.placedObjects);

        $.contextMenu({
            trigger: 'none',
            selector: 'canvas',
            callback: (evt, key, options) => {
                switch(key) {
                    case "select_all"  : this.selectAll(); break;
                    case "arrange_all" : this.arrangeAll(); break;
                    case "delete_all"  : this.removeAll(); break;
                    case "center_one" : this.centerSelectedObject(); break;
                    case "delete_some" : this.removeSelectedObjects(); break;
                    case "xform_some"  : SettingsPanel.onToolChanged("move");
                }
            },
            items: {
                center_one:  {name: "Center Selected Object"},
                delete_some: {name: "Delete Selected Objects", icon: "delete"},
                separator1: "-----",
                xform_some:  {name: "Edit Transform Values", icon: "edit"},
                separator2: "-----",
                select_all: {name: "Select All Objects"},
                arrange_all: {name: "Arrange All Objects"},
                delete_all: {name: "Clear Build Plate", icon: "delete"}
            }
        });
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

        // Print volume used for checking whether the print is in bounds.
        this.printVolume = new THREE.Box3();
        this.printVolume.min.set(0, 0, 0);
        this.printVolume.max.set(x_width,  y_depth, z_height);
    }

    getBedMatrixWorldInverse() {
        var inv = new THREE.Matrix4();
        return inv.getInverse(this.bedRelative.matrixWorld);
    }

    /**
     * Returns the bounding sphere of an object in bed coordinates
     */
    getObjectBoundingSphere(object, bedMatrixWorldInverse) {
        object.updateMatrixWorld();
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
        this.selectNone();

        const center = object.geometry.boundingBox.getCenter(new THREE.Vector3());
        const delta = this.objectToBed(object, center);
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
     * Shrinks an object to fit the print volume.
     */
    scaleObjectToFit(object) {
        const size = object.geometry.boundingBox.getSize(new THREE.Vector3());
        const scale = Math.min(
            this.printer.x_width / size.x,
            this.printer.y_depth / size.y,
            this.printer.z_height / size.z,
            1
        );
        object.scale.x = scale;
        object.scale.y = scale;
        object.scale.z = scale;
    }

    /**
     * Arrange objects on the platform such that there is no overlap.
     * Currently this uses the object's bounding sphere to determine
     * a circular footprint of the the object on the print bed.
     * However, this could be improved for tall and skinny objects
     * by only computing the bounding circle in X and Y.
     *
     *   lockedObject - An object which should not move.
     *
     */
    arrangeObjectsOnPlatform(lockedObject) {
        var circles = [];
        var packingFinished = () => {
            if(this.packer) {
                var p = this.packer;
                this.packer = null;
                p.destroy();
            }
            this.highlightOutOfBounds(this.objects);
            this.render();
        };

        if(this.packer) packingFinished();

        this.selectNone();

        // Create an array of circles for the packing algorithm

        var lockedCircle;

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
            if(lockedObject == object) {
                lockedCircle = circle;
            }
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
        if(lockedCircle) {
            // There isn't a way to tell the circle packer to lock down
            // particular objects, but you can get the same effect
            // by using the drag handler.
            this.packer.dragStart(lockedCircle.id);
        }
        this.packer.update();
        // Packing might run continuously, to abort after a few seconds.
        this.timer.start(packingFinished, 5000);
    }

    /**
     * Tests to see whether a particular object is within the print volume
     */
    testWithinBounds(obj) {
        const bounds = PrintableObject.findBoundingBox(obj, this.bedRelative);
        bounds.min.z = Math.ceil(bounds.min.z); // Account for slight numerical imprecision
        return this.printVolume.containsBox(bounds);
    }

    /**
     * Highlight any objects that are outside the print volume
     */
    highlightOutOfBounds(objs) {
        SettingsPanel.transformOutOfBoundsError = false;
        objs.forEach(obj => {
            const within = this.testWithinBounds(obj);
            obj.error = !within;
            if(!within) {
                SettingsPanel.transformOutOfBoundsError = true;
            }
        });
    }

    /**
     * Converts a vector in object coordinates to print bed
     * coordinates
     */
    objectToBed(child, vector) {
        return this.bedRelative.worldToLocal(child.localToWorld(vector));
    }

    /**
     * Drops an object so it touches the print platform
     */
    dropObjectToFloor(obj) {
        const lowestPoint = PrintableObject.findLowestPoint(obj, this.bedRelative);
        if(lowestPoint) {
            obj.position.z -= lowestPoint.z;
        }
    }

    /**
     * The center of the selected objects is used for positioning, but when
     * presenting editable values to the user, we want to use the lowest
     * point on the object as the Z reference point. This method computes
     * the correction applied to the Z value text box.
     */
    get selectionHeightAdjustment() {
        const lowestPoint = PrintableObject.findLowestPoint(this.selection, this.bedRelative);
        return lowestPoint ? this.selection.position.z - lowestPoint.z : 0;
    }

    /**
     * Lays an object flat on the print bed
     */
    layObjectFlat(obj) {
        this.selectNone();

        const helper = new FaceRotationHelper(obj);
        const downVector = new THREE.Vector3(0, -1, 0);

        // Step 1: Compute the center of the object in world coordinates
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(obj);
        const center = boundingBox.getCenter(new THREE.Vector3());

        // Step 2: Find the face in the convex hull intersected by a ray
        //         from the center of the object downwards
        const restingFace = helper.findIntersectingFace(obj.hull, center, downVector);

        // Step 3: Rotate object so that the object lays on that face.
        if(restingFace) {
            helper.alignFaceNormalToVector(restingFace, downVector);
        } else {
            console.log("Unable to locate resting face");
        }

        // Step 5: Bring the object down to the print plate
        this.dropObjectToFloor(obj);
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
        this.addObjects([obj]);
        this.scaleObjectToFit(obj);
        this.dropObjectToFloor(obj);
        this.centerObjectOnPlatform(obj, 1);
        if(this.numObjects > 1) {
            this.arrangeObjectsOnPlatform();
        }
        this.render();
    }

    get numObjects() {
        return this.objects.length;
    }

    addObjects(objs) {
        objs.forEach(obj => {
            this.objects.push(obj);
            this.placedObjects.add(obj);
        });
        SettingsPanel.onObjectCountChanged(this.objects.length);
    }

    removeObjects(objs) {
        this.selection.removeFromSelection(objs);
        objs.forEach(obj => {
            this.placedObjects.remove(obj);
            var index = this.objects.indexOf(obj);
            if (index > -1) {
                this.objects.splice(index, 1);
            }
        });
        SettingsPanel.onObjectCountChanged(this.objects.length);
    }

    removeSelectedObjects() {
        this.removeObjects(this.selection.children.slice());
        this.render();
    }

    centerSelectedObject() {
        if(this.selection.children.length == 0) {
            return;
        }
        if(this.selection.children.length > 1) {
            alert("Can only center one object at a time.");
            return;
        }
        const objectToCenter = this.selection.children[0];
        this.centerObjectOnPlatform(objectToCenter, 1);
        if(this.numObjects > 1) {
            this.arrangeObjectsOnPlatform(objectToCenter);
        }
        this.render();
    }

    arrangeAll() {
        this.arrangeObjectsOnPlatform();
    }

    removeAll() {
        this.removeObjects(this.objects.slice());
        this.render();
    }

    selectAll() {
        this.selection.setSelection(this.objects);
        this.render();
    }

    selectNone() {
        this.selection.selectNone();
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
            if(this.toolpath.hasVisibleLayers) {
                this.showToolpath();
            } else {
                this.hideToolpath();
            }
        }
    }

    setGcodeLayer(value) {
        if(this.toolpath) {
            this.toolpath.setGcodeLayer(value);
            this.render();
        }
    }

    get isToolpathVisible() {
        return this.toolpath && this.toolpath.visible;
    }

    showToolpath() {
        if(this.toolpath && this.toolpath.hasVisibleLayers) {
            this.toolpath.visible      = true;
            this.placedObjects.visible = false;
            this.render();
        }
    }

    hideToolpath() {
        if(this.toolpath) {
            this.toolpath.visible      = false;
        }
        this.placedObjects.visible = true;
        this.render();
    }

    // Returns a count of gcode layers
    getGcodeLayers() {
        return this.toolpath ? this.toolpath.nLayers : 0;
    }

    // Event handlers

    onToolChanged(tool) {
        if(this.selection.count) {
            if(tool == "layflat") {
                this.onLayFlatClicked();
            } else {
                this.selection.setTransformMode(tool);
                SettingsPanel.onToolChanged(tool);
                SettingsPanel.onSelectionChanged();
            }
        }
    }

    onTransformEdit(dropToFloor = true) {
        if (dropToFloor) {
            this.dropObjectToFloor(this.selection);
        }
        this.checkSelectionWithinBounds();
        this.render();
    }

    onTransformDismissed() {
        stage.selection.setTransformMode("none");
        this.render();
    }

    showContextMenu(event) {
        $('canvas').contextMenu({x: event.clientX, y: event.clientY});
    }

    onObjectClicked(obj, event) {
        if(event.button == 2) {
            this.showContextMenu(event);
        } else if(event.shiftKey) {
            this.selection.addOrRemoveFromSelection(obj);
            this.render();
        } else {
            this.selection.setSelection(obj);
            this.render();
        }
    }

    onFloorClicked(event) {
        if(event.button == 2) {
            this.showContextMenu(event);
        } else {
            this.selectNone();
            this.render();
            SettingsPanel.onObjectUnselected();
        }
    }

    onMouseDown( raycaster, scene, event ) {
        this.dragging = false;
    }

    /**
     * This method is called when the user clicks on an object.
     * It evaluates the intersections from the raycaster and
     * determines what to do.
     */
    onMouseUp( raycaster, scene, event ) {
        if(this.dragging || this.selection.isTransforming) return;
        var intersects = raycaster.intersectObject( scene, true );
        for (var i = 0; i < intersects.length; i++) {
            var obj = intersects[ i ].object;
            if (SelectionGroup.isControlObject(obj)) {
                // Disregard clicks on the control object
                continue;
            }
            if (obj instanceof PrintableObject) {
                this.onObjectClicked(obj, event);
                return;
            }
            // Stop on first intersection
            break;
        }
        this.onFloorClicked(event);
    }

    onViewChanged() {
        this.dragging = true;
    }

    onLayFlatClicked() {
        this.selection.children.forEach(obj => this.layObjectFlat(obj));
    }
}