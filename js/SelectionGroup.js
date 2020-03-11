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
    }

    /**
     * Forces a call to "setSelection()" to compute a new center
     * for the current selection.
     */
    recompute() {
        this.setSelection(this.children.slice(0));
    }

    /**
     * Adds a single object to the selection. This is done
     * via "setSelection()" to compute a new center.
     */
    addToSelection(obj) {
        var objs = this.children.slice(0); // Clone array
        objs.push(obj);
        this.setSelection(objs);
    }

    /**
     * Removes an object from the selection. This is done
     * via "setSelection()" to compute a new center.
     */
    removeFromSelection(obj) {
        this.parent.attach(obj);
        // Force a recomputation of the center:
        this.setSelection(this.children.slice(0));
    }

    /**
     * This method adjusts the SelectionGroup to include a collection
     * of items. The origin for the SelectionGroup is made to coincide
     * with the center of all the selected objects prior to adding the
     * objects as children.
     */
    setSelection(objs) {
        // We remove all existing objects from the selection so we
        // can reposition the SelectionGroup to the new center.
        this.selectNone();
        if(objs.length == 0)
            return;
        // Set SelectionGroup origin to center of all selected objects.
        this.boundingBox.setFromObject(objs[0]);
        objs.forEach(obj => this.boundingBox.expandByObject(obj));
        this.parent.worldToLocal(this.boundingBox.getCenter(this.position));
        // Attach all selected objects to myself without changing their world transform.
        objs.forEach(obj => {this.attach(obj);});
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
}