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


// This data structure allows us to find connected adjacent faces
SlicerOps.ConnectedFaceMap = function(geometry) {

    // Private members:
    var sharedEdges = new SlicerOps.PairwiseLookupTable();

    function createMap(geometry) {
        function tallyEdge(faceIndex, v1, v2) {
            var bucket = intersectionTable.lookup(v1, v2);
            if(!bucket.hasOwnProperty('faces')) {
                bucket.faces = [];
            }
            bucket.faces.push(faceIndex);
        }

        for(var i = 0; i < geometry.faces.length; i++) {
            var face = geometry.faces[i];
            tallyEdge(i, face.a, face.b);
            tallyEdge(i, face.b, face.c);
            tallyEdge(i, face.c, face.a);
        }
    }

    // Public member:

    // When v1 and v2 are on the face, returns the face(s)
    // which are connected and share that edge. The result
    // will be incorrect if v1 or v2 are not in the face.
    this.connectedFace = function(face, v1, v2) {
        var bucket = intersectionTable.lookup(v1, v2);
        var adjacentFaces = [];
        for(var i = 0; i < bucket.faces.length; i++) {
            if(bucket.faces[i] != face) {
                adjacentFaces.push(i);
            }
        }
        return adjacentFaces;
    }

    // Returns the indices of faces which are adjacent
    // to a face
    this.adjacentFaces = function(face) {
        return  adjacentFace(face, face.a, face.b)
        .concat(adjacentFace(face, face.b, face.c))
        .concat(adjacentFace(face, face.c, face.a));
    }

    this.forEach = function(func) {
        sharedEdges.forEach(
            function(bucket) {
                return func(bucket.faces, bucket.a, bucket.b)
            }
        );
    }

    // Initialization:
    createMap(geometry);
}


SlicerOps.computeSupport = function(geometry) {
    var connectivityMap = SlicerOps.ConnectedFaceMap(geometry);
    // A contour edge is an edge that connects two faces
    // such that one is upward facing and the other is downward
    // facing.
    function findAllContourEdges(connectivityMap) {
        var edges = [];

        connectivityMap.forEach(
            function(faces,v1,v2) {
                var upwardFacing   = false;
                var downwardFacing = false;
                for(var i = 0; i < face.length; i++) {
                    var face = geometry.faces[i];
                    if(face.normal.z >= 0) {
                        upwardFacing = true;
                    }
                    if(face.normal.z < 0) {
                        downwardFacing = true;
                    }
                }
                if(upwardFacing && downwardFacing) {
                    edges.push(v1, v2);
                }
            }
        );
        return edges;
    }
    var countours = SlicerOps.makePaths(findAllContourEdges(connectivityMap));

    // Convert into clipper paths

    var cContours = [];
    for(var i = 0; i < countours.length; i++) {
        var path = countours[i];
        var cPath = [];
        for(var j = 0; j < path.length; j++) {
            cPath.push({
                x:geometry.vertices.path[j].x,
                y:geometry.vertices.path[j].y
            });
        }
        cContours.push(cPath);
    }

    // Make sure all contours have the same orientation
    SlicerOps.orientPaths(cContours);

    return cContours;
}
