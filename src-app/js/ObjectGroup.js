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
export class ObjectGroup extends THREE.Object3D {
    constructor() {
        super();
        this.boundingBox = new THREE.Box3();
    }

    static resetTransform(obj) {
        obj.position.set(0,0,0);
        obj.rotation.set(0,0,0);
        obj.scale.set(1,1,1);
    }

    /**
     * This method adjusts the ObjectGroup to include a collection
     * of items. The origin for the ObjectGroup is made to coincide
     * with the center of all the selected objects prior to adding the
     * objects as children.
     */
    _set(objs) {
        // We remove all existing objects from the selection so we
        // can reposition the SelectionGroup to the new center.
        while (this.children.length) {
            this.parent.attach(this.children.pop());
        }
        ObjectGroup.resetTransform(this);
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
     * Adds a single object to the group. This is done
     * via "_set()" to compute a new center.
     */
    addObject(obj) {
        var objs = this.children.slice(0); // Clone array
        objs.push(obj);
        this._set(objs);
    }

    /**
     * Removes one or more object(s) from the group.
     */
    removeFromGroup(obj) {
        (Array.isArray(obj) ? obj : [obj]).forEach(obj => this.parent.attach(obj));
        this.recompute();
    }

    setGroup(obj) {
        this._set(Array.isArray(obj) ? obj : [obj]);
    }

    inGroup(obj) {
        return this.children.indexOf(obj) > -1;
    }

    get count() {
        return this.children.length;
    }

    resetChildTransforms() {
        this.children.forEach(ObjectGroup.resetTransform);
    }
}