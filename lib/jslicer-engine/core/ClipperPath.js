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
class ClipperPaths {
    constructor(paths, scale) {
        this.cPaths = paths;
        this.scale  = scale;
    }

    static xformAndCopyPath(paths, func) {
        var xformed = [];
        for(var i = 0; i < paths.length; i++) {
            var copy = [];
            for(var j = 0; j < paths[i].length; j++) {
                copy.push(func(paths[i][j]));
            }
            xformed.push(copy);
        }
        return xformed;
    }

    static forEachSegment(paths, func) {
        for(var i = 0; i < paths.length; i++) {
            if(paths[i].length>1) {
                var start = paths[i][0];
                for(var j = 1; j < paths[i].length; j++) {
                    var end = paths[i][j];
                    func(start, end);
                    start = end;
                }
            }
        }
    }

    static orientPaths(paths) {
        for(var i = 0; i < paths.length; i++) {
            if(!ClipperLib.Clipper.Orientation(paths[i])) {
                paths[i].reverse();
                console.log("Reversing path. This is a kludge and probably will not work with models with holes");
            }
        }
    }

    // Returns the bounding box on the x,y plane
    static getBoundingBox(paths) {

        var min_x = Number.POSITIVE_INFINITY;
        var max_x = Number.NEGATIVE_INFINITY;

        var min_y = Number.POSITIVE_INFINITY;
        var max_y = Number.NEGATIVE_INFINITY;

        SlicerOps.forEachSegment(paths, function(start,end) {
            min_x = Math.min(start.X, end.X, min_x);
            max_x = Math.max(start.X, end.X, max_x);

            min_y = Math.min(start.Y, end.Y, min_y);
            max_y = Math.max(start.Y, end.Y, max_y);
        });

        return {
            min: {X: min_x, Y: min_y},
            max: {X: max_x, Y: max_y},
            width:  max_x - min_x,
            height: max_y - min_y
        };
    }

    static closeOpenPaths(paths) {
        for(var i = 0; i < paths.length; i++) {
            var len = paths[i].length;
            if(paths[i].length > 0 && paths[i][0] !== paths[i][len-1]) {
                paths[i].push(paths[i][0]);
            }
        }
    }

    inset(delta) {
        var solution = new ClipperLib.Paths();
        var co = new ClipperLib.ClipperOffset(2, 0.25);
        co.AddPaths(this.cPaths, ClipperLib.JoinType.jtSquare, ClipperLib.EndType.etClosedPolygon);
        co.Execute(solution, -delta * this.scale);
        ClipperPaths.closeOpenPaths(solution);
        return new ClipperPaths(solution, this.scale);
    }

    infill(infillObject) {
        return new ClipperPaths(infillObject.apply(this), this.scale);
    }

    append(path) {
        Array.prototype.push.apply(this.cPaths, path.cPaths);
    }

    get openContours() {
        var res = [];
        for(var i = 0; i < this.cPaths.length; i++) {
            var len = this.cPaths[i].length;
            if(len > 0) {
                if(this.cPaths[i][0] !== this.cPaths[i][len-1]) {
                    res.push(this.cPaths[i]);
                }
            }
        }
        return new ClipperPaths(res, this.scale);
    }

    get closedContours() {
        var res = [];
        for(var i = 0; i < this.cPaths.length; i++) {
            var len = this.cPaths[i].length;
            if(len > 0) {
                if(this.cPaths[i][0] === this.cPaths[i][len-1]) {
                    res.push(this.cPaths[i]);
                }
            }
        }
        return new ClipperPaths(res, this.scale);
    }

    get paths() {
        var scale = this.scale;
        return ClipperPaths.xformAndCopyPath(this.cPaths, function(v) {
            return {
                x: v.X/scale,
                y: v.Y/scale
            };
        });
    }

    get scalingFactor() {
        return this.scale;
    }

    toString() {
        return "ClipperPath with " + this.cPaths.length + " paths";
    }
}

var SlicerOps = SlicerOps || new Object;

SlicerOps.strokeEdges = function(ctx, vertices, edges, origin_x, origin_y, scale) {
    for(var i = 0; i < edges.length; i += 2) {
        ctx.strokeStyle = (i%4==0) ? "red" : "green";
        ctx.beginPath();
        ctx.moveTo(origin_x + vertices[edges[i  ]].x * scale, origin_y + vertices[edges[i  ]].y * scale);
        ctx.lineTo(origin_x + vertices[edges[i+1]].x * scale, origin_y + vertices[edges[i+1]].y * scale);
        ctx.stroke();
    }
}

SlicerOps.strokePath = function(ctx, paths, origin_x, origin_y, scale) {
    for(var i = 0; i < paths.length; i++) {
        if(paths[i].length>1) {
            ctx.beginPath();
            ctx.moveTo(origin_x + paths[i][0].x * scale, origin_y + paths[i][0].y * scale);
            for(var j = 1; j < paths[i].length; j++) {
                ctx.lineTo(origin_x + paths[i][j].x * scale, origin_y + paths[i][j].y * scale);
            }
            ctx.stroke();
        }
    }
}