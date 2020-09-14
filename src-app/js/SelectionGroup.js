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

/**
 * The SelectionGroup allows multiple objects to be selected and transformed
 * as a group around their center.
 */
class SelectionGroup extends THREE.Object3D {
    constructor() {
        super();
        this.boundingBox = new THREE.Box3();
        this.isTransforming = false;
    }

    /**
     * This method adjusts the SelectionGroup to include a collection
     * of items. The origin for the SelectionGroup is made to coincide
     * with the center of all the selected objects prior to adding the
     * objects as children.
     */
    _set(objs) {
        // We remove all existing objects from the selection so we
        // can reposition the SelectionGroup to the new center.
        while (this.children.length) {
            this.parent.attach(this.children.pop());
        }
        this.position.set(0,0,0);
        this.rotation.set(0,0,0);
        this.scale.set(1,1,1);
        if(objs.length == 0)
            return;
        // Copy the rotation and scaling factors from the first object
        this.rotation.copy(objs[0].rotation);
        this.scale.copy(objs[0].scale);
        // Set SelectionGroup origin to center of all selected objects.
        this.boundingBox.setFromObject(objs[0]);
        objs.forEach(obj => this.boundingBox.expandByObject(obj));
        this.parent.worldToLocal(this.boundingBox.getCenter(this.position));
        // Attach all selected objects to myself without changing their world transform.
        objs.forEach(obj => {this.attach(obj);});
    }

    /**
     * Forces a call to "setSelection()" to compute a new center
     * for the current selection.
     */
    recompute() {
        this._set(this.children.slice(0));
    }

    /**
     * Adds a single object to the selection. This is done
     * via "setSelection()" to compute a new center.
     */
    addToSelection(obj) {
        var objs = this.children.slice(0); // Clone array
        objs.push(obj);
        this._set(objs);
        this.selectionChanged();
    }

    /**
     * Selects an object if it is not already selected, otherwise deselects it.
     */
    addOrRemoveFromSelection(obj) {
        if(this.isSelected(obj)) {
            this.removeFromSelection(obj);
        } else {
            this.addToSelection(obj);
        }
    }

    /**
     * Removes one or more object(s) from the selection.
     */
    removeFromSelection(obj) {
        (Array.isArray(obj) ? obj : [obj]).forEach(obj => this.parent.attach(obj));
        this.recompute();
        this.selectionChanged();
    }

    setSelection(obj) {
        this._set(Array.isArray(obj) ? obj : [obj]);
        this.selectionChanged();
    }

    /**
     * Removes all objects from the selection group. Also resets the transform
     * for the now empty SelectionGroup
     */
    selectNone() {
        this._set([]);
        this.selectionChanged();
    }

    isSelected(obj) {
        return this.children.indexOf(obj) > -1;
    }

    get count() {
        return this.children.length;
    }

    setTransformControl(control) {
        this.transformControl = control;

        // Since the control does not have a "mirror" mode, we use a custom
        // "mouseDown" handler to modify the behavior of the "translate" mode.
        this.transformControl.addEventListener( 'mouseDown', event => {
            if(this.mode == "mirror") {
                this.transformControl.dragging = false;
                switch(this.transformControl.axis) {
                    case 'X': this.scale.x *= -1; break;
                    case 'Y': this.scale.y *= -1; break;
                    case 'Z': this.scale.z *= -1; break;
                }
                this.onTransformChange("scale");
            }
        } );

        this.transformControl.addEventListener( 'change', event => {
          this.onTransformChange(this.tranformMode);
        });

        control.addEventListener( 'dragging-changed', event => {
            if(this.viewControl) {
                this.viewControl.enabled = ! event.value;
            }
            if (event.value) {
                this.isTransforming = true;
                this.onTransformBegin();
            } else {
                this.isTransforming = false;
                this.onTransformEnd();
            }
        } );

        // https://stackoverflow.com/questions/41000983/using-transformcontrols-with-outlinepass-in-three-js?noredirect=1&lq=1
        // Fix for transform controls being updated in OutlinePass
        this.transformControl.traverse(obj => { // To be detected correctly by OutlinePass.
            obj.isTransformControls = true;
        });
    }

    setViewControl(control) {
        this.viewControl = control;
    }

    setTransformMode(mode) {
        if(!mode || mode == "none") {
            this.mode = null;
            this.transformControl.detach();
        }
        else if(this.count) {
            this.transformControl.enabled = false;
            this.recompute();
            this.mode = mode;
            switch(mode) {
                case "move":    this.setTransformModeAndSpace("translate", "world"); break;
                case "rotate":  this.setTransformModeAndSpace("rotate",    "world"); break;
                case "scale":   this.setTransformModeAndSpace("scale",     "local"); break;
                case "mirror":  this.setTransformModeAndSpace("translate", "local"); break;
            }
            this.transformControl.attach(this);
            this.transformControl.enabled = true;
        }
    }

    setTransformModeAndSpace(mode, space) {
        this.transformControl.setMode(mode);
        this.transformControl.setSpace(space);
    }

    selectionChanged() {
        if(this.count > 0) {
            renderLoop.outlinePass.selectedObjects = [this];
        } else {
            renderLoop.outlinePass.selectedObjects = [];
            this.setTransformMode("none");
        }
        this.onSelectionChanged();
    }

    get tranformMode() {
        return this.mode == "mirror" ? "scale" : this.transformControl.mode;
    }

    static isControlObject(obj) {
        return obj instanceof THREE.TransformControls ?
            true :
            obj.parent ? SelectionGroup.isControlObject(obj.parent) : false;
    }

    // Event call backs
    onTransformChange(mode) {}
    onTransformBegin() {}
    onTransformEnd() {}
    onSelectionChanged() {}
}