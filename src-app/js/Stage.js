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
            this.highlightOutOfBounds(this.getPrintableObjects(this.selection));
        };
        this.selection.onSelectionChanged = ObjectTransformPage.onSelectionChanged;

        this.placedObjects.add(this.selection);
        this.bedRelative.add(this.placedObjects);

        this.addContextMenu();
    }

    static applyStyleSheetColors() {
        const color = getColorArrayFromElement("#stl_normal", 'color');
        Toolpath.colorMap["SKIN"] = color;
        Toolpath.colorMap["WALL-OUTER"] = color;
        Toolpath.colorMap["WALL-INNER"] = color;
    }

    addContextMenu() {
        let noneSelected = () => {
            return this.selection.children.length == 0;
        }

        let noObjects = () => {
            return this.numPrintableObjects == 0;
        }

        let multiExtruder = () => {
            return SelectProfilesPage.numberOfExtruders() > 1;
        }

        let extruderSelected = (extruder) => {
            return () => {console.log("test", extruder); return this.testAllSelectedObjectsOnExtruder(extruder)};
        }

        $.contextMenu({
            selector: 'canvas',
            trigger: 'none',
            callback: (evt, key, options) => this.menuAction(key),
            items: {
                select_all: {name: "Select All Objects", disabled: noObjects},
                arrange_all: {name: "Arrange All Objects", disabled: noObjects},
                delete_all: {name: "Clear Build Plate", disabled: noObjects, icon: "delete"},
                separator1: "-----",
                xform_some:  {name: "Edit Transform Values\u2026", disabled: noneSelected, icon: "edit"},
                separator2: "-----",
                center_some:  {name: "Center Selected Objects", disabled: noneSelected},
                delete_some: {name: "Delete Selected Objects", disabled: noneSelected, icon: "delete"},
                assign_extruder: {
                    name: "Assign Selected Objects to Extruder",
                    disabled: noneSelected,
                    visible: multiExtruder,
                    items: {
                        extruder_0: {name: "Extruder 1", disabled: extruderSelected(0)},
                        extruder_1: {name: "Extruder 2", disabled: extruderSelected(1)}
                    }
                },
                separator3: "-----",
                group_some: {name: "Group Selected Objects", disabled: noneSelected},
                merge_some: {name: "Merge Selected Objects", disabled: noneSelected},
                ungroup_some: {name: "Ungroup Selected Objects", disabled: noneSelected},
            }
        });
    }

    menuAction(key) {
        switch(key) {
            case "select_all"   : this.selectAll(); break;
            case "arrange_all"  : this.arrangeAll(); break;
            case "delete_all"   : this.removeAll(); break;
            case "center_some"  : this.centerSelectedObjects(); break;
            case "delete_some"  : this.removeSelectedObjects(); break;
            case "xform_some"   : ObjectTransformPage.onToolChanged("move"); break;
            case "group_some"   : this.groupSelectedObjects(false); break;
            case "merge_some"   : this.groupSelectedObjects(true); break;
            case "ungroup_some" : this.ungroupSelectedObjects(); break;
            case "extruder_0"   : this.assignExtruderToSelectedObjects(0); break;
            case "extruder_1"   : this.assignExtruderToSelectedObjects(1); break;
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
        return inv.copy(this.bedRelative.matrixWorld).invert();
    }

    /**
     * Positions an object in the center of the bed.
     */
    centerObjectOnPlatform(object) {
        this.selectNone();
        const boundingBox = ObjectAlgorithms.findBoundingBox(object, this.bedRelative);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const delta = center;
        if(!this.printer.origin_at_center) {
            delta.x -= this.printer.x_width/2;
            delta.y -= this.printer.y_depth/2;
        }
        // Subtract out the center of the object so that it falls on the origin
        object.position.x -= delta.x;
        object.position.y -= delta.y;
    }

    /**
     * Shrinks an object to fit the print volume.
     */
    scaleObjectToFit(object, ask) {
        const boundingBox = ObjectAlgorithms.findBoundingBox(object, this.bedRelative);
        const size = boundingBox.getSize(new THREE.Vector3());
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
            this.highlightOutOfBounds(this.getPrintableObjects());
            this.render();
        };

        if(this.packer) packingFinished();

        this.selectNone();

        // Create an array of circles for the packing algorithm

        const objects = this.getTopLevelObjects();

        for(const [index, object] of objects.entries()) {
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
            const sphere = ObjectAlgorithms.findBoundingSphere(object, this.bedRelative);
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
                const object = objects[index];
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
        const bounds = ObjectAlgorithms.findBoundingBox(obj, this.bedRelative);
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
        this.getSelectedObjects().forEach(obj => {
            box = ObjectAlgorithms.findBoundingBox(obj, this.selection, box);
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
        const lowestPoint = ObjectAlgorithms.findLowestPoint(obj, this.bedRelative);
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
        const lowestPoint = ObjectAlgorithms.findLowestPoint(this.selection, this.bedRelative);
        return lowestPoint ? this.selection.position.z - lowestPoint.z : 0;
    }

    /**
     * Lays an object flat on the print bed
     */
    layObjectFlat(obj) {
        this.selectNone();

        const downVector = new THREE.Vector3(0, 0, -1);

        // Step 1: Compute the center of the object in bed coordinates
        const boundingBox = ObjectAlgorithms.findBoundingBox(obj, obj.parent);
        const center = boundingBox.getCenter(new THREE.Vector3());

        // Step 2: Find the convex hull for the object, in object coordinates.
        const hull = ObjectAlgorithms.findConvexHull(obj, obj.parent);

        // Step 3: Find the face in the convex hull intersected by a ray
        //         from the center of the object downwards
        const restingFace = FaceRotationHelper.findIntersectingFace(hull, center, downVector);

        // Step 4: Rotate object so that the object lays on that face.
        if(restingFace) {
            FaceRotationHelper.alignFaceNormalToVector(obj, restingFace, downVector);
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

    // Return all printable objects in the stage
    getPrintableObjects(container) {
        if(!container) container = this.placedObjects;
        const result = [];
        container.traverse(obj => {
            if (obj instanceof PrintableObject) {
                result.push(obj);
            }
        });
        return result;
    }

    // Returns all top-level objects in the stage, selected or not
    getTopLevelObjects() {
        return this.placedObjects.children
            .filter(item => item !== this.selection)
            .concat(this.selection.children);
    }

    // Returns all top-level selected objects on the stage
    getSelectedObjects() {
        return this.selection.children.slice();
    }

    /**
     * This function returns a list of ready to slice geometries along
     * with the transformation matrix.
     */
    getAllGeometry() {
        return this.getPrintableObjects().map(obj => {
            const transform = obj.matrixWorld.clone();
            const worldToPrinterRepresentation = new THREE.Matrix4();
            transform.premultiply(worldToPrinterRepresentation.copy(this.bedRelative.matrixWorld).invert());
            return {geometry: obj.geometry, filename: obj.filename, extruder: obj.extruder, transform};
        });
    }

    addGeometry(geometry, filename) {
        this.selectNone();
        var obj = new PrintableObject(geometry, filename);
        this.addObjects([obj]);
        this.scaleObjectToFit(obj, true);
        this.dropObjectToFloor(obj);
        this.centerObjectOnPlatform(obj);
        this.arrangeObjectsOnPlatform(this.getTopLevelObjects());
        this.render();
    }

    get numPrintableObjects() {
        return this.getPrintableObjects().length;
    }

    addObjects(objs) {
        objs.forEach(obj => this.placedObjects.add(obj));
        PlaceObjectsPage.onObjectCountChanged(this.numPrintableObjects);
    }

    removeObjects(objs) {
        this.selection.removeFromSelection(objs);
        objs.forEach(obj => this.placedObjects.remove(obj));
        PlaceObjectsPage.onObjectCountChanged(this.numPrintableObjects);
    }

    removeSelectedObjects() {
        this.removeObjects(this.getSelectedObjects());
        this.render();
    }

    centerSelectedObjects() {
        const selection = this.getSelectedObjects();
        if(selection.length == 0) return;
        if(selection.length > 1) {
            this.arrangeObjectsOnPlatform(selection);
        } else {
            this.centerObjectOnPlatform(selection[0]);
        }
        this.highlightOutOfBounds(this.getPrintableObjects());
        this.render();
    }

    assignExtruderToSelectedObjects(extruder) {
        this.getPrintableObjects(this.selection).forEach(obj => obj.setExtruder(extruder));
        this.render();
    }

    testAllSelectedObjectsOnExtruder(extruder) {
        return this.getPrintableObjects(this.selection).every(obj => obj.extruder == extruder);
    }

    groupSelectedObjects(resetTransforms) {
        if(resetTransforms) {
            this.selection.resetChildTransforms();
        }
        const group = this.selection.groupObjects();
        this.dropObjectToFloor(group);
        this.render();
    }

    ungroupSelectedObjects() {
        this.selection.ungroupObjects();
    }

    arrangeAll() {
        this.arrangeObjectsOnPlatform();
    }

    removeAll() {
        this.removeObjects(this.getTopLevelObjects());
        this.render();
    }

    selectAll() {
        this.selection.setSelection(this.getTopLevelObjects());
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
        this.highlightOutOfBounds(this.getPrintableObjects());
        this.render();
    }

    onTransformDismissed() {
        stage.selection.setTransformMode("none");
        this.render();
    }

    showContextMenu(event) {
        $('canvas').contextMenu({x: event.clientX, y: event.clientY});
    }

    // Find the top-level group for grouped objects, else return the object itself.
    findRootObject(obj) {
        while(obj.parent != this.placedObjects && obj.parent != this.selection) {
            obj = obj.parent;
        }
        return obj;
    }

    onObjectClicked(obj, event) {
        obj = this.findRootObject(obj);
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

    onViewChanged(camera) {
        this.dragging = true;
        OverhangShader.onViewChanged(camera);
    }

    onLayFlatClicked() {
        this.getSelectedObjects().forEach(obj => this.layObjectFlat(obj));
    }
}