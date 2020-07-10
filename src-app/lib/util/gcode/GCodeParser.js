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

class GCodeParser {
    constructor(data) {
        this.data = data;
    }

    parse(obj) {
        var lineRe     = /^.*([\n\r]+|$)/gm;
        var movementRe = /^G[01]\s+([XYZFE][0-9\.\-]+\s*)+/;
        var setPosRe   = /^G92\s+([XYZE][0-9\.\-]+\s*)+/;
        var modeRe     = /^G9([01])\b/;
        var emodeRe    = /^M83\b/;
        var axisRe     = /([XYZE])([0-9\.\-]+)/g;
        var attrRe     = /^;(\w+):(.+)\s*$/
        var m, n;
        var e_abs = true, absolute = true, x = 0, y = 0, z = 0, e = 0;
        var processMotion  = obj.hasOwnProperty("motion");
        var processComment = obj.hasOwnProperty("comment");
        var processSetPos  = obj.hasOwnProperty("setPosition");
        
        function parseAxis(m, set_x, set_y, set_z, set_e) {
            while (n = axisRe.exec(m[0])) {
                var axis  = n[1];
                var value = parseFloat(n[2]);
                switch(axis) {
                    case "X": set_x(value); break;
                    case "Y": set_y(value); break;
                    case "Z": set_z(value); break;
                    case "E": set_e(value); break;
                }
            }
        }
        
        this.data.match(lineRe).forEach(
            line => {
                if (m = movementRe.exec(line)) {
                    parseAxis(
                        m,
                        v => x = absolute ? v : x + v,
                        v => y = absolute ? v : y + v,
                        v => z = absolute ? v : z + v,
                        v => e = e_abs    ? v : e + v 
                    );
                    if(processMotion) {
                        obj.motion(x, y, z, e);
                    }
                }
                else if (m = modeRe.exec(line)) {
                    absolute = e_abs = (m[1] == '0');
                }
                else if (m = emodeRe.exec(line)) {
                    e_abs = false;
                }
                else if(processComment && (m = attrRe.exec(line))) {
                    obj.comment(m[1], m[2]);
                }
                else if(m = setPosRe.exec(line)) {
                    parseAxis(
                        m,
                        v => {processSetPos && obj.setPosition("X", v); x = v;},
                        v => {processSetPos && obj.setPosition("Y", v); y = v;},
                        v => {processSetPos && obj.setPosition("Z", v); z = v;},
                        v => {processSetPos && obj.setPosition("E", v); e = v;}
                    );
                }
            }
        );
    }
}