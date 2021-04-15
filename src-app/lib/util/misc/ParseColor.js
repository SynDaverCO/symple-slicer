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

/* Decode a CSS color
 */
function parseColor(color) {
    var m = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if(m) {
        return [parseInt(m[1], 10), parseInt(m[2],10), parseInt(m[3], 10), 255];
    }

    m = color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*((0.)?\d+)\s*\)$/i);
    if(m) {
        return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)];
    }
}

function getColorArrayFromElement(selector, property) {
    const el = document.querySelector(selector);
    const style = window.getComputedStyle(el);
    return parseColor(style.getPropertyValue(property));
}

function getColorValueFromElement(selector, property) {
    const rgb = getColorArrayFromElement(selector, property);
    return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
}

function getColorFloatArrayFromElement(selector, property) {
    return getColorArrayFromElement(selector, property).map(x => x/255);
}