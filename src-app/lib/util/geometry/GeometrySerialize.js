/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
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

function geometryToJSON(geometry) {
    const bufferGeometry = geometry instanceof THREE.BufferGeometry ? geometry : new THREE.BufferGeometry().fromGeometry(geometry);
    const result = {data: [], transferables: []};

    function pushAttribute(name, attr) {
        if(attr) {
            result.data.push({
                name: name,
                data: attr.array.buffer,
                size: attr.itemSize,
                type: attr.array.constructor.name,
                normalize: attr.normalize
            });
            result.transferables.push(attr.array.buffer);
        }
    }
    pushAttribute("position", bufferGeometry.getAttribute("position"));
    //pushAttribute("color",    bufferGeometry.getAttribute("color"));
    pushAttribute("normal",   bufferGeometry.getAttribute("normal"));
    pushAttribute("index",    bufferGeometry.getIndex());
    return result;
}

function jsonToGeometry(json, needsBufferGeometry = false) {
    var bufferGeometry = new THREE.BufferGeometry();
    json.forEach(attr => {
        var ba;
        switch(attr.type) {
            case "Uint16Array":  ba = new THREE.Uint16BufferAttribute(attr.data, attr.size, attr.normalize); break;
            case "Uint32Array":  ba = new THREE.Uint32BufferAttribute(attr.data, attr.size, attr.normalize); break;
            case "Float32Array": ba = new THREE.Float32BufferAttribute(attr.data, attr.size, attr.normalize); break;
            default:
                console.log("Unknown type:", attr.type);
        }
        if(attr.name == "index") {
            bufferGeometry.setIndex(ba);
        } else {
            bufferGeometry.setAttribute(attr.name, ba);
        }
    });
    return needsBufferGeometry ? bufferGeometry : new THREE.Geometry().fromBufferGeometry(bufferGeometry);
}