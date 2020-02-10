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
class ToolbarUI {
	constructor(elementId) {
		this.ui = document.getElementById(elementId);
        this.onChange = function() {};
        this.selected = null;
	}
	
	// private:
	
	static addTag(parent, type, attr_list) {
		var el = document.createElement(type);
        if(attr_list) {
            for (const attr in attr_list)
                if(attr_list[attr] !== undefined)
                    el[attr] = attr_list[attr];
        }
		parent.appendChild(el);
		return el;
	}
	
	// privileged:
    
    addIcon(id, title, img_src) {
        var me = this;
        ToolbarUI.addTag(this.ui, "img", {
            id: id,
            title: title,
            src: img_src,
            onclick: function() {me.selected = id; me.onChange(id);}
        });
    }
}
