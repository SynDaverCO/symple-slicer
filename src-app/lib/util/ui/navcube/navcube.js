/**
 * Toolbar UI
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
class NavCube {
    constructor(selector) {
        this.selector = selector;
        $.contextMenu({
            selector: selector, 
            callback: (evt, key, options) => {this.onViewSelected(key);},
            items: {
                "front":  {name: "Front"},
                "left":   {name: "Left"},
                "right":  {name: "Right"},
                "back":   {name: "Back"},
                "top":    {name: "Top"},
                "bottom": {name: "Bottom"}
            }
        });
        
        $(selector).click(() => this.onViewSelected("front"));
    }

    update(degx, degy, degz) {
        $(this.selector).css({
            transform: "rotateX(" + degx + "deg) " +
                       "rotateY(" + degy + "deg) " +
                       "rotateZ(" + degz + "deg) " +
                       "translateX(0) translateY(0) translateZ(0)"
                       }
        );
    }

    // Event handlers; can be overriden

    onViewSelected(view) {}
}