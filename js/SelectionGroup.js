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
        this.selectNone();
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
    }

    /**
     * Selects an object if it is not already selected, otherwise deselects it.
     */
    addOrRemove(obj) {
        if(this.isSelected(obj)) {
            this.removeFromSelection(obj);
        } else {
            this.addToSelection(obj);
        }
    }

    /**
     * Removes an object from the selection. This is done
     * via "setSelection()" to compute a new center.
     */
    removeFromSelection(obj) {
        this.parent.attach(obj);
        // Force a recomputation of the center:
        this._set(this.children.slice(0));
    }

    setSelection(objs) {
        this._set(objs);
    }

    /**
     * Removes all objects from the selection group. Also resets the transform
     * for the now empty SelectionGroup
     */
    selectNone() {
        while (this.children.length) {
            this.removeFromSelection(this.children.pop());
        }
        this.position.set(0,0,0);
        this.rotation.set(0,0,0);
        this.scale.set(1,1,1);
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
            if(this.currentTool == "mirror") {
                this.transformControl.dragging = false;
                switch(this.transformControl.axis) {
                    case 'X': this.scale.x = this.scale.x < 0 ? 1 : -1; break;
                    case 'Y': this.scale.y = this.scale.y < 0 ? 1 : -1; break;
                    case 'Z': this.scale.z = this.scale.z < 0 ? 1 : -1; break;
                }
                this.onObjectTransforming("scale");
            }
        } );

        this.transformControl.addEventListener( 'change', event => {
          this.onObjectTransforming(this.tranformMode);
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
        if(this.count) {
            this.transformControl.enabled = false;
            this.recompute();
            this.currentTool = mode;
            switch(mode) {
                case "move":    this.setTransformModeAndSpace("translate", "world"); break;
                case "rotate":  this.setTransformModeAndSpace("rotate",    "world"); break;
                case "scale":   this.setTransformModeAndSpace("scale",     "local"); break;
                case "mirror":  this.setTransformModeAndSpace("translate", "local"); break;
            }
            this.updateSelection();
            this.transformControl.enabled = true;
        }
    }

    setTransformModeAndSpace(mode, space) {
        this.transformControl.setMode(mode);
        this.transformControl.setSpace(space);
    }

    updateSelection() {
        if(this.count > 0) {
            renderLoop.outlinePass.selectedObjects = [this];
        } else {
            renderLoop.outlinePass.selectedObjects = [];
        }

        if(this.count > 0 && this.currentTool) {
            this.transformControl.attach(this);
        } else {
            this.transformControl.detach();
        }
    }

    get tranformMode() {
        return this.currentTool == "mirror" ? "scale" : this.transformControl.mode;
    }

    static isControlObject(obj) {
        return obj instanceof THREE.TransformControls ?
            true :
            obj.parent ? SelectionGroup.isControlObject(obj.parent) : false;
    }

    // Event call backs
    onObjectTransforming(mode) {}
    onTransformBegin() {}
    onTransformEnd() {}
}