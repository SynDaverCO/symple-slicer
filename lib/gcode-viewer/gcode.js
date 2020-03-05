/**
 *
 * @licstart
 *
 * Copyright (C) 2017  AlephObjects, Inc.
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU Affero
 * General Public License (GNU AGPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU AGPL for more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU AGPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 *
 */

class GCodePath {
    constructor() {
        this.array = [];
    }

    parse(data) {
        var movementRe = /G[01]\s+([XYZFE][0-9.-]+\s+)+/g;
        var tokenRe    = /([XYZE])([0-9.-]+)/g;
        var m, n;
        var x = 0, y = 0, z = 0, e = 0;
        while (m = movementRe.exec(data)) {
            while (n = tokenRe.exec(m[0])) {
                var axis  = n[1];
                var value = parseFloat(n[2]);
                switch(axis) {
                    case "X": x = value; break;
                    case "Y": y = value; break;
                    case "Z": z = value; break;
                    case "E": e = value; break;
                }
            }
            this.array.push(x);
            this.array.push(y);
            this.array.push(z);
            this.array.push(e);
        }
    }

    forEachSegment(func) {
        for(var i = 0; i < this.array.length; i += 4) {
            var gcode_x = this.array[i + 0];
            var gcode_y = this.array[i + 1];
            var gcode_z = this.array[i + 2];
            var gcode_e = this.array[i + 3];
            func(gcode_x, gcode_y, gcode_z, gcode_e);
        }
    }
}