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
        this.setPrinterCharacteristics({
            circular:          false,
            origin_at_center:  false,
            x_width:           282,
            y_depth:           282,
            z_height:          286
        });

        this.objects = [];
        this.placedObjects = new THREE.Object3D();
        this.dragging      = false;
        this.packer = null;
        this.timer = new ResettableTimeout();

        this.selection = new SelectionGroup();
        this.selection.onTransformChange = mode => {
            this.render();
            ObjectTransformPage.onTransformChange(mode);
        }
        this.selection.onTransformEnd = () => {
            this.dropObjectToFloor(this.selection);
            this.highlightOutOfBounds(this.selection.children);
        };
        this.selection.onSelectionChanged = ObjectTransformPage.onSelectionChanged;

        this.placedObjects.add(this.selection);
        this.bedRelative.add(this.placedObjects);

        $.contextMenu({
            trigger: 'none',
            selector: 'canvas',
            callback: (evt, key, options) => this.menuAction(key),
            items: {
                center_some:  {name: "Center Selected Objects"},
                delete_some: {name: "Delete Selected Objects", icon: "delete"},
                separator1: "-----",
                xform_some:  {name: "Edit Transform Values\u2026", icon: "edit"},
                separator2: "-----",
                select_all: {name: "Select All Objects"},
                arrange_all: {name: "Arrange All Objects"},
                delete_all: {name: "Clear Build Plate", icon: "delete"}
            }
        });
    }

    static applyStyleSheetColors() {
        const color = getColorArrayFromElement("#stl_normal", 'color');
        Toolpath.colorMap["SKIN"] = color;
        Toolpath.colorMap["WALL-OUTER"] = color;
        Toolpath.colorMap["WALL-INNER"] = color;
    }

    menuAction(key) {
        switch(key) {
            case "select_all"  : this.selectAll(); break;
            case "arrange_all" : this.arrangeAll(); break;
            case "delete_all"  : this.removeAll(); break;
            case "center_some" : this.centerSelectedObjects(); break;
            case "delete_some" : this.removeSelectedObjects(); break;
            case "xform_some"  : ObjectTransformPage.onToolChanged("move");
        }
    }

    render() {
        renderLoop.render();
    }

    setPrinterCharacteristics(printer) {
        if(!this.printerRepresentation) {
            this.printerRepresentation = new PrinterRepresentation(printer);
        } else {  
            this.printerRepresentation.update(printer);
        }
        this.bedRelative = this.printerRepresentation.bedRelative;
        // Print volume used for checking whether the print is in bounds.
        this.printVolume = new THREE.Box3();
        this.printVolume.min.set(0, 0, 0);
        this.printVolume.max.set(printer.x_width, printer.y_depth, printer.z_height);
        this.printer = printer;
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
     * Positions an object in the center of the bed.
     */
    centerObjectOnPlatform(object) {
        this.selectNone();

        const center = object.geometry.boundingBox.getCenter(new THREE.Vector3());
        const delta = this.objectToBed(object, center);
        if(!this.printer.origin_at_center) {
            delta.x -= this.printer.x_width/2;
            delta.y -= this.printer.y_depth/2;
        }
        object.position.x -= delta.x;
        object.position.y -= delta.y;
    }

    /**
     * Shrinks an object to fit the print volume.
     */
    scaleObjectToFit(object, ask) {
        const size = object.geometry.boundingBox.getSize(new THREE.Vector3());
        const scale = Math.min(
            this.printer.x_width / size.x,
            this.printer.y_depth / size.y,
            this.printer.z_height / size.z
        );
        if(scale < 1) {
            if(!ask || confirm("This model is too large to fit the print volume. Click OK to scale to fit, or CANCEL otherwise")) {
                object.scale.x = scale;
                object.scale.y = scale;
                object.scale.z = scale;
            }
        }
    }

    /**
     * Arrange objects on the platform such that there is no overlap.
     * Currently this uses the object's bounding sphere to determine
     * a circular footprint of the the object on the print bed.
     * However, this could be improved for tall and skinny objects
     * by only computing the bounding circle in X and Y.
     *
     *   objectsToArrange - Restrict arrangement to certain objects.
     *
     */
    arrangeObjectsOnPlatform(objectsToArrange) {
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

        const inv = this.getBedMatrixWorldInverse();
        for(const [index, object] of this.objects.entries()) {
            const isAbsoluteCenter =  objectsToArrange && objectsToArrange[0] == object;
            const isPulledToCenter = !objectsToArrange || objectsToArrange.includes(object);
            if(isAbsoluteCenter) {
                // The first object in the selection is pulled to the exact center of the bed.
                this.centerObjectOnPlatform(object);
            }
            else {
                // Add a small perturbation to the objects position to
                // allow the packing algorithm to converge.
                object.position.x += Math.random() - 0.5;
                object.position.y += Math.random() - 0.5;
            }
            const sphere = this.getObjectBoundingSphere(object, inv);
            const circle = {
                id:               'c' + index,
                radius:           sphere.radius,
                position:         {x: sphere.center.x, y: sphere.center.y},
                isPulledToCenter: isPulledToCenter,
                isPinned:         isAbsoluteCenter
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
        this.timer.start(packingFinished, 3000);
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
        ObjectTransformPage.transformOutOfBoundsError = false;
        objs.forEach(obj => {
            const within = this.testWithinBounds(obj);
            obj.error = !within;
            if(!within) {
                ObjectTransformPage.transformOutOfBoundsError = true;
            }
        });
    }

    /**
     * Computes the dimensions of the selection, for populating the text boxes.
     */
    getSelectionDimensions(scaled = true) {
        var box;
        this.selection.children.forEach(obj => {
            box = PrintableObject.findBoundingBox(obj, this.selection, box);
        });
        var size = new THREE.Vector3();
        if(box) {
            box.getSize(size);
            if(scaled) {
                size.x *= this.selection.scale.x;
                size.y *= this.selection.scale.y;
                size.z *= this.selection.scale.z;
            }
        }
        return size;
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
        this.scaleObjectToFit(obj, true);
        this.dropObjectToFloor(obj);
        this.centerObjectOnPlatform(obj);
        this.arrangeObjectsOnPlatform(this.objects);
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
        PlaceObjectsPage.onObjectCountChanged(this.objects.length);
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
        PlaceObjectsPage.onObjectCountChanged(this.objects.length);
    }

    removeSelectedObjects() {
        this.removeObjects(this.selection.children.slice());
        this.render();
    }

    centerSelectedObjects() {
        if(this.selection.children.length == 0) {
            return;
        }
        if(this.numObjects > 1) {
            this.arrangeObjectsOnPlatform(this.selection.children.slice());
        } else {
            let objectToCenter = this.selection.children[0];
            this.centerObjectOnPlatform(objectToCenter);
            this.highlightOutOfBounds([objectToCenter]);
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
                ObjectTransformPage.onToolChanged(tool);
                ObjectTransformPage.onSelectionChanged();
            }
        }
    }

    onTransformEdit(dropToFloor = true) {
        if (dropToFloor) {
            this.dropObjectToFloor(this.selection);
        }
        this.highlightOutOfBounds(this.selection.children);
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
            ObjectTransformPage.onObjectUnselected();
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
            if (obj.type === "LineSegments") {
                // Disregard clicks on the toolpath
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