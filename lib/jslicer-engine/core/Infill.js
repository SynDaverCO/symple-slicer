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

var SlicerOps = SlicerOps || new Object;

/*
The algorithm for the following line intersection routine can be
derived from the parametric forms for lines AB and CD:

  x = (bx - ax) * t + ax  [1]
  y = (by - ay) * t + ay  [2]

  x = (dx - cx) * s + cx  [3]
  y = (dy - cy) * s + cy  [4]

Let:

  s1.x = bx - ax
  s1.y = by - ay
  s2.x = dx - cx
  s2.y = dy - cy

So:

  x = s1.x * t + ax  [1]
  y = s1.y * t + ay  [2]

  x = s2.x * s + cx  [3]
  y = s2.y * s + cy  [4]


Set the equations equal to each other:

  s1.x * t + ax = s2.x * s + cx    [5]
  s1.y * t + ay = s2.y * s + cy    [6]

Solve equation [5] for t:

       s2.x        ax - cx
  t =  ---- * s -  -------   [7]
       s1.x          s1.x

Solve equation [6] for s:

        s1.y           ay - cy
  s =   ------- * t +  -------   [8]
        s2.y             s2.y

Substitute equation [7] into equation [8]:

        s1.y   s2.x         s1.y     ax - cx    ay - cy
  s =   ---- * ---- * s  -  ----  *  -------  + -------   [8]
        s2.y   s1.x         s2.y      s1.x       s2.y

Multiply all terms in [8] by s2.y * s1.x:

  s2.y * s1.x * s = s1.y * s2.x * s - s1.y * (ax - cx) + s1.x * (ay - cy)

Move terms with s to the left side of the equation:

  s2.y * s1.x * s - s1.y * s2.x * s = -s1.y * (ax - cx) + s1.x * (ay - cy)

Solve for s:

  s = (-s1.y * (ax - cx) + s1.x * (ay - cy)) / (s2.y * s1.x - s1.y * s2.x)

A similar derivation can be done for t
*/

/* Computes the intersection of lines AB and CD,
   specified by four points a, b, c, d.

   Source:
      http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
 */
function lineIntersection(a, b, c, d, unbounded) {
    var s1 = {X:b.X - a.X, Y:b.Y - a.Y};
    var s2 = {X:d.X - c.X, Y:d.Y - c.Y};

    s = (-s1.Y * (a.X - c.X) + s1.X * (a.Y - c.Y)) / (-s2.X * s1.Y + s1.X * s2.Y);
    t = ( s2.X * (a.Y - c.Y) - s2.Y * (a.X - c.X)) / (-s2.X * s1.Y + s1.X * s2.Y);

    if (unbounded || (s >= 0 && s <= 1 && t >= 0 && t <= 1)) {
        return {
            s : s,
            t : t,
            X: a.X + (t * s1.X),
            Y: a.Y + (t * s1.Y)
        }
    }
}

class PolyFill {
    // Sort the intersections by t
    static compareByT(a, b) {
        if (a.t < b.t) {
            return -1;
        } else if (a.t > b.t) {
            return 1;
        } else {
            return 0;
        }
    }

    static intersectLineWithPoly(paths, a, b, fillStyle) {
        var intersections = [];
        // Find all intersections of the line AB with segments in the polygon
        ClipperPaths.forEachSegment(paths,
            function(start, end) {
                var intersection = lineIntersection(a, b, start, end);
                if(intersection) {
                    intersections.push(intersection);
                }
            });

        intersections = intersections.sort(PolyFill.compareByT);

        // Create line segments based on the even odd rule
        for( var i = 0; i < (intersections.length-1); i+=2) {
            fillStyle.addSegment(i/2, intersections[i], intersections[i+1]);
        }
    }

    /* polyFill: Raster fills a polygon on the XY plane.
     * Generates a collection of edges spaced by "spacing"
     * and with a slope of "angle" that covers the
     * polygon.
     *
     * Limitations: Polygon must be a single loop of ordered
     * edges. Currently does not handle when angle is
     * 90 (best to keep between -45 and 45)
     */

    static polyFill(paths, bounds, spacing, angle, fillStyle) {
        var fill = new (fillStyle || RasterFill);

        var rad     = angle * Math.PI / 180;
        var slope_x = Math.cos(rad);
        var slope_y = Math.sin(rad);
        var rise    = bounds.width / slope_x * slope_y;
        var start_y = (slope_y > 0) ? -rise : 0;

        var row     = 0;
        var nRows   = (bounds.height + Math.abs(rise))/spacing;

        for(var row = 0; row <= nRows; row++) {
            var a = {X:bounds.min.X, Y:bounds.min.Y + start_y + row * spacing};
            var b = {X:bounds.max.X, Y:bounds.min.Y + start_y + row * spacing + rise};

            // Find all intersections of this line with the polygon
            PolyFill.intersectLineWithPoly(paths, a, b, fill);
        }

        return fill.getSegments();
    }
}

// Fill style for the polyFill that orders edges left to right,
// as in a raster fill.
class RasterFill {
    constructor() {
        this.segments = [];
    }

    addSegment(intersection, a, b) {
        this.segments.push([a, b]);
    };

    getSegments() {
        return this.segments;
    }
}

// Fill style for the polyFill that optimizes edges for pen plotters and
// 3D printing by alternating edge direction and minimizing travel.
class PenFill {
    constructor() {
        this.byIntersection = [];
    }

    addSegment(intersection, a, b) {
        // Expand array if needed
        while(this.byIntersection.length <= intersection) {
            this.byIntersection[this.byIntersection.length] = [];
        }
        // Push edge into bucket corresponding to intersection number
        this.byIntersection[intersection].push([a, b]);
    };

    getSegments() {
        var sorted = [];
        for(var i = 0; i < this.byIntersection.length; i++) {
            for(var j = 0; j < this.byIntersection[i].length; j++) {
                var k = this.byIntersection[i][j];
                if(j%2) {
                    sorted.push([k[0],k[1]]);
                } else {
                    sorted.push([k[1],k[0]]);
                }
            }
        }
        return sorted;
    }
}

class SlantedInfill extends PolyFill {
    constructor(geometryBoundingBox, spacing) {
        super();
        this.unscaledBounds = geometryBoundingBox;
        this.spacing        = spacing;
    }

    apply(cPath) {
        var cScale = cPath.scalingFactor;
        var scaledBounds = {
            min: {X: this.unscaledBounds.min.x*cScale, Y: this.unscaledBounds.min.y*cScale},
            max: {X: this.unscaledBounds.max.x*cScale, Y: this.unscaledBounds.max.y*cScale},
            width:  (this.unscaledBounds.max.x - this.unscaledBounds.min.x)*cScale,
            height: (this.unscaledBounds.max.y - this.unscaledBounds.min.y)*cScale
        }
        return PolyFill.polyFill(cPath.cPaths, scaledBounds, this.spacing*cScale, 45, PenFill);
    }
}