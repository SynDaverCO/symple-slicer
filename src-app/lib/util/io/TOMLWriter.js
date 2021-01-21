/**
 * TOMLWriter
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

class TOMLWriter {
    constructor() {
        this.str = "";
    }

    writeCategory(category) {
        if(this.str.length) this.str += "\n";
        this.str += "[" + category + "]\n\n";
    }

    valueType(value) {
        return Array.isArray(value) ? "array" : typeof value;
    }

    /**
     * Writes a value into the TOML file
     *
     *   key     - the name of the value
     *   value   - the value
     *   comment - if provided, this is added as a comment at the end of the line
     *   enabled - If false, the entire line is commented out
     */
    writeValue(key, value, comment, enabled = true) {
        let val_str;
        switch(typeof value) {
            case "object":
            case "boolean":
            case "number":
                val_str = JSON.stringify(value);
                break;
            case "string":
                if(value.indexOf('\n') != -1) {
                    val_str = '"""\n' + value + '"""';
                } else {
                    val_str = '"' + value + '"';
                }
                break;
        }
        if(!enabled) {
            this.str += "# ";
            val_str = val_str.replace(/\n/g, "\n#"); // Comment out each line of a multi-line values
        }
        this.str += key + " = " + val_str;
        if(comment) {
            this.str += " # " + comment;
        }
        this.str += "\n";
        return true;
    }

    _recurseObject(obj, name, which) {
        if(name) {
            this.writeCategory(name);
        }
        const keys = which || Object.keys(obj);
        // Write the primitive (non-object) values from this object.
        for (const key of keys) {
            if(obj.hasOwnProperty(key)) {
                const value = obj[key];
                if(this.valueType(value) != "object") {
                    this.writeValue(key, value);
                }
            }
        }
        // If there are any nested objects, write them out as categories
        for (const key of keys) {
            if(obj.hasOwnProperty(key)) {
                const value = obj[key];
                if(this.valueType(value) == "object") {
                    const catName = (name ? name + "." : "") + key;
                    this._recurseObject(value, catName);
                }
            }
        }
    }

    /**
     * Writes out an object as a TOML file. If whichProperties is specified,
     * it indicates what properties are written and in what order.
     */
    writeProperties(obj, whichProperties) {
        this._recurseObject(obj, null, whichProperties);
    }

    // Reformats the TOML file so all the comments line up
    static alignComments(str) {
        const comment  = /^(..*?)([#;].*)$/gm;
        let   tab_stop = 0;
        for(const m of str.matchAll(comment)) {
            tab_stop = Math.max(tab_stop, m[1].length);
        }
        return str.replace(comment, (m, p1, p2) => p1.padEnd(tab_stop) + p2)
    }
}