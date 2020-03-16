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

/*
General data flow:

0) Begin with a 3D geometry:

    vertices = [{x,y,z},{x,y,z},{x,y,z}]
    faces = [{a,b,c},{a,b,c},{a,b,c}]

1) The output of sliceGeometry is a set of vertices and disjoint edges:

    vertices = [{x,y},{x,y},{x,y}]
    edges    = [v -> v, v -> v, v -> v]

2) makePaths connects the edges end to end, yielding paths that consist of
   sequences of vertex indices:

    vertices = [{x,y},{x,y},{x,y}]]
    paths    = [
      [v -> v -> v -> v],
      [v -> v -> v]
    ]

3) toClipperPath collapses the vertex information into the paths array. This
   format is compatible with the clipper library.

    paths = [
       [{x,y} -> {x,y} -> {x,y} -> {x,y}]
       [{x,y} -> {x,y} -> {x,y}]
    ]

*/

var SlicerOps = SlicerOps || new Object;

// This data structure maps a pair of indices to a unique data bucket.
// Either a,b or b,a always map to the same bucket.
SlicerOps.PairwiseLookupTable = class {
    constructor() {
        this.table = [];
    }

    hash(a,b) {
        return (a * b) % 255;
    }

    // Retrieve data bucket corresponding to pair a & b
    _lookup(a,b) {
        var index = this.hash(a,b);
        if(typeof this.table[index] == 'undefined') {
            this.table[index] = [];
        } else {
            var candidates = this.table[index];
            for(var i = 0; i < candidates.length; i++) {
                if(candidates[i].a === a && candidates[i].b === b) {
                    return candidates[i];
                }
            }
        }
        // No data bucket found, create one
        var bucket = {a:a, b:b};
        this.table[index].push(bucket);
        return bucket;
    }

    lookup(a,b) {
        // Maintain order invariance
        return (a < b) ? this._lookup(a,b) : this._lookup(b,a);
    }

    forEach(func) {
        for(var i = 0; i < this.table.length; i++) {
            if(typeof this.table[i] != 'undefined') {
                for(var j = 0; j < this.table[i].length; j++) {
                    if(!func(this.table[i][j])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}

// Given a collection of vertex indexes where each pair
// represents an edge, constructs a lookup table
// where the indices of all vertices connected to another
// can be queried.
SlicerOps.ConnectivityLookupTable = class  {
    constructor(edges) {
        this.table = [];

        for(var i = 0; i < edges.length; i += 2) {
            this.lookup(edges[i]).push(edges[i+1]);
            this.lookup(edges[i+1]).push(edges[i]);
        }
    }

    lookup(index) {
        return (typeof this.table[index] == 'undefined') ?
            (this.table[index] = []) : this.table[index];
    }
}

class MeshSlicer {
    constructor(geometry) {
            this.geometry = geometry;
    }

    // Takes a triangular mesh and returns a collection of edges
    // comprising a slice of the object at height z. The resulting
    // contours are represented by an array of vertices and array of
    // vertex indices such that each pair of indices represents
    // an edge. These edges are unordered and will require further
    // processing to be coalesced into paths or closed loops.
    //
    // If faceTest is defined, it is a function that is called
    // for each face to determine whether it contributes an edge.
    //
    // For this function to work properly, vertices need to
    // be merged (i.e. using geometry.mergeVertices)
    static sliceGeometry(geometry, z, faceTest) {
        var intersectionTable = new SlicerOps.PairwiseLookupTable();
        var vertices          = [];
        var edges             = [];
        var blendUVs          = false;

        if(geometry.faceVertexUvs[0].length != 0) {
            blendUVs = true;
        }

        // Default faceTest function accepts all faces
        if (typeof faceTest == 'undefined') {
            faceTest = function() {return true};
        }

        // Computes the point in which the line AB crosses the plane at height z
        function intersection(a, b, z) {
            var s = (z - a.z) / (b.z - a.z);
            return {
                x: (b.x - a.x) * s + a.x,
                y: (b.y - a.y) * s + a.y
            };
        }

        // Like intersection, but also does texture coordinates
        function blend(s, a, b) {
            return (b - a) * s + a;
        }

        function interpolate(fi, ia, ib, a, b, an, bn, z) {
            var s = (z - a.z) / (b.z - a.z);
            var faceUV = geometry.faceVertexUvs[0][fi];
            return {
                x: blend(s, a.x, b.x),
                y: blend(s, a.y, b.y),
                u: blend(s, faceUV[an].x, faceUV[bn].y),
                v: blend(s, faceUV[an].x, faceUV[bn].y)
            };
        }


        // Pushes a new vertex into the list and returns the index
        function pushVertex(v) {
            return vertices.push(v) - 1;
        }

        /* Calls intersection() above, but uses the PairwiseLookupTable
           to store only unique vertices in the vertex list. The primary
           reason to do this is to avoid having to de-duplicate vertices
           later.

            fi - Face index
            ia - Index to vertex a
            ib - Index to vertex b
            a  - Vertex a
            b  - Vertex b
            an - Number of vertex a in face (0, 1 or 2)
            bn - Number of vertex b in face (0, 1 or 2)

        */
        function lookupIntersectionToPlane(fi, ia, ib, a, b, an, bn) {
            var bucket = intersectionTable.lookup(ia, ib);
            if(!bucket.hasOwnProperty('index')) {
                bucket.index = pushVertex(blendUVs ? interpolate(fi, ia, ib, a, b, an, bn, z) : intersection(a, b, z));
                bucket.count = 0;
            }
            bucket.count++;
            return bucket.index;
        }

        // Loop through all the faces in the model, checking whether
        // that face is sliced by the slicing plane.
        for(var i = 0; i < geometry.faces.length; i++) {
            var face = geometry.faces[i];

            // A triangle which is sliced by the plane will in general have two
            // edges which are bisected. The general algorithm is to identify those
            // edges, compute the intersection of those edges with the plane, and
            // add an edge connecting those intersection points to our solution.
            var a = geometry.vertices[face.a];
            var b = geometry.vertices[face.b];
            var c = geometry.vertices[face.c];

            if(!faceTest(a, b, c)) {
                continue;
            }

            // The vertex test returns -1 if the vertex is below the plane, 1 if it is
            // above or at the plane
            function testVertex(v) {
                if(v.z >=  z)  return  1;
                if(v.z <  z)   return -1;
            }

            var a_test = testVertex(a);
            var b_test = testVertex(b);
            var c_test = testVertex(c);

            // The vertex test allows us to determine whether a edge was bisected by the plane.
            // If the results are the same for both vertices, the edge is entirely above or below
            // the plane and can be ignored. If they differ, the plane bisects the edge.
            var ab_bisected = (a_test != b_test);
            var bc_bisected = (b_test != c_test);
            var ca_bisected = (c_test != a_test);

            var intersections = [];

            // For each sliced edge, compute the intersection
            if(ab_bisected) intersections.push(lookupIntersectionToPlane(i, face.a, face.b, a, b, 0, 1));
            if(bc_bisected) intersections.push(lookupIntersectionToPlane(i, face.b, face.c, b, c, 1, 2));
            if(ca_bisected) intersections.push(lookupIntersectionToPlane(i, face.c, face.a, c, a, 2, 1));

            function checkOrientation(v1,v2) {
                var d = new THREE.Vector3(  v2.x - v1.x,   v2.y - v1.y, 0);
                var c = new THREE.Vector3(face.normal.x, face.normal.y, 0);
                d.cross(c);
                return d.z > 0;
            }

            if(intersections.length == 2) {
                if(!checkOrientation(vertices[intersections[0]], vertices[intersections[1]])) {
                    intersections.reverse();
                }
                Array.prototype.push.apply(edges,intersections);
            } else {
                if(intersections.length != 0) {
                    console.log("sliceGeometry: Warning: Incorrect number (" + intersections.length + ") of intersections from triangular facet. This should not happen.");
                }
            }
        }

        // Sanity check.
        var sane = intersectionTable.forEach(
            function(bucket){
                if(bucket.count == 1) {
                    console.log("Invalid mesh: Edge used by only one triangle! May need to merge vertices?");
                    return false;
                }
                if(bucket.count > 2) {
                    console.log("Invalid mesh: Edge shared by more than two triangles!");
                    return false;
                }
                return true;
            }
        );

        return {
            vertices: vertices,
            edges:    edges,
            sane:     sane
        };
    }

    static makePaths(edges) {
        var connectsTo = new SlicerOps.ConnectivityLookupTable(edges);
        var vertexUsed = [];

        // Take any edge.
        function forward(prev, cur, next) {
            return 1;
        }

        // Choose only unmarked edges.
        function unused(prev, cur, next) {
            return vertexUsed[next] ? 0 : 1;
        }

        // Chooses an edges with the greatest score as determined by
        // the chooser function.
        function bestChoice(chooser, prev, cur, choices) {
            var next, best = 0;
            for(var i = 0; i < choices.length; i++) {
                if(choices[i] != prev) {
                    var score = chooser(prev, cur, choices[i]);
                    if(score > best) {
                        next = choices[i];
                        best = score;
                    }
                }
            }
            return next;
        }

        // Traces a path of connected edges using the connectivity info in connectsTo.
        // The chooser function controls which edges are followed while the keeper
        // function performs an operation on the visited edges.
        function walkPath(first, chooser, keeper) {
            var cur = first;
            var prev;
            do {
                var next = bestChoice(chooser, prev, cur, connectsTo.lookup(cur));
                var res = keeper(prev, cur, next);
                if(!res || typeof next == 'undefined') {
                    return;
                }
                prev = cur;
                cur  = next;
            } while(cur != first);
            keeper(prev, cur, next);
        }

        // Walks down a path until end is found. In
        // the case of a loop, return first.
        function findEndpoint(first) {
            var endpoint;
            walkPath(first, unused,
                function(prev, cur, next) {
                    endpoint = cur;
                    return true;
                }
            );
            return endpoint;
        }

        // Travels down the path to the other end, saving
        // vertex indices.
        function savePath(first) {
            var path = [];
            walkPath(first, forward,
                function(prev, cur, next) {
                    path.push(cur);
                    if(vertexUsed[cur]) {
                        return false;
                    }
                    vertexUsed[cur] = true;
                    return true;
                }
            );
            return path;
        }

        // Form path until all vertices are accounted for.
        var paths = [];
        for(var start = 0; start < edges.length; start++) {
            if(!vertexUsed[edges[start]]) {
                paths.push(savePath(findEndpoint(edges[start])));
            }
        }

        return paths;
    }

    static toClipperPath(vertices, paths, scale) {
        var c_vertices    = [];
        var c_paths       = [];

        c_vertices.length = vertices.length;
        c_paths.length    = paths.length;

        for(var i = 0; i < vertices.length; i++) {
            c_vertices[i] = new ClipperLib.IntPoint(
                Math.round(vertices[i].x * scale),
                Math.round(vertices[i].y * scale)
            );
        }

        for(var i = 0; i < paths.length; i++) {
            c_paths[i]        = [];
            c_paths[i].length = paths[i].length;
            for(var j = 0; j < paths[i].length; j++) {
                c_paths[i][j] = new ClipperLib.IntPoint(c_vertices[paths[i][j]]);
            }
        }
        return c_paths;
    }

    getSlice(z, scale) {
        var slice    = MeshSlicer.sliceGeometry(this.geometry, z);
        var paths    = MeshSlicer.makePaths(slice.edges);
        var cPaths   = MeshSlicer.toClipperPath(slice.vertices, paths, scale);
        var paths    = new ClipperPaths(cPaths, scale);
        paths.isSane = slice.sane;
        return paths;
    }
}