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
var GEOMETRY_READERS = {};

(function( GEOMETRY_READERS, undefined ) { // EXTEND NAMESPACE

    var correct_winding_order = false;

    /* A sample creator object that returns a nested array
       with no deduplication.


       var faces = [
            [[nx,ny,nz], [x, y, z],...,[x, y, z]],
            ...
            [[nx,ny,nz], [x, y, z],...,[x, y, z]]
        ];

    */
    GEOMETRY_READERS.FaceArrayCreator = function() {
        // Private:
        var that     = this;
        var faces    = [];
        var loop;

        // Privileged:
        this.startLoop = function() {
            loop = [];
        }

        this.facetNorm = function(x,y,z) {
            loop.push([x,y,z]);
        }

        this.addVertex = function(x,y,z) {
            loop.push([x,y,z]);
        }

        this.endLoop = function() {
            faces.push(loop);
        }

        this.result = function() {
            return faces;
        }
    }

    /* A sample creator object that returns THREE geometry */
    GEOMETRY_READERS.THREEGeometryCreator = function() {
        // Private:
        var geometry = new THREE.Geometry();
        var vIndex   = 0;
        var face;
        var normal = new THREE.Vector3();
        var a      = new THREE.Vector3();
        var b      = new THREE.Vector3();
        var errors = 0;

        // Privileged:
        this.startLoop = function() {
            face     = [];
        }

        this.facetNorm = function(x,y,z) {
            normal.set(x,y,z);
        }

        this.addVertex = function(x,y,z) {
            geometry.vertices.push(new THREE.Vector3( x,  y, z ));
            face.push(vIndex++);
        }

        this.endLoop = function() {
            // Check whether the face winding is correct.
            var sign = 1;
            if(correct_winding_order) {
                a.subVectors(geometry.vertices[face[1]], geometry.vertices[face[0]]);
                b.subVectors(geometry.vertices[face[2]], geometry.vertices[face[0]]);
                sign = a.cross(b).dot(normal);
            }
            if(sign > 0) {
                geometry.faces.push(new THREE.Face3( face[0], face[1], face[2] ) );
            } else {
                geometry.faces.push(new THREE.Face3( face[2], face[1], face[0] ) );
                errors++;
            }
        }

        this.result = function() {
            geometry.computeBoundingSphere();
            console.log("Created new geometry with " + geometry.faces.length + " faces" );
            if(correct_winding_order && errors > 0) {
                console.log("Adjusted winding order on", errors, "faces");
            }
            return geometry;
        }
        
    }

    /* Parses a string containing the contents of an ASCII STL
       file
     */
    function readAsciiStl(str, creator) {
        var endOfFirstLine = str.indexOf('\n');

        var header = str.substr(0, endOfFirstLine).trim();
        var tokens = str.substr(endOfFirstLine).trim().split(/\s+/).reverse();

        function expect(expectation) {
            var token = tokens.pop();
            if(token !== expectation) {
                throw "parseAsciiStl: expected " + expectation + ", got " + token;
            }
        }

        function peek() {
            return tokens[tokens.length-1];
        }

        function getFloat() {
            return parseFloat(tokens.pop());
        }

        while(tokens.length) {
            creator.startLoop();
            if(peek() !== "facet") {
                break;
            }
            expect("facet");
            expect("normal");
            creator.facetNorm(getFloat(), getFloat(), getFloat());
            expect("outer");
            expect("loop");
            while(peek() === "vertex") {
                tokens.pop();
                creator.addVertex(getFloat(), getFloat(), getFloat());
            }
            expect("endloop");
            expect("endfacet");
            creator.endLoop();
        }
        expect("endsolid");
    }

    /* Parses a string containing the contents of a binary STL
       file
     */
    function readBinaryStl(fileData, creator) {
        var STL_HEADER_SIZE = 80;
        var data = new DataView(fileData, STL_HEADER_SIZE);

        var offset = 0;

        function getFloat() {
            var val = data.getFloat32(offset, true);
            offset += 4;
            return val;
        }

        function getAttrByteCount() {
            var val = data.getUint16(offset, true);
            offset += 2;
            return val;
        }

        function getNumFacets() {
            var val = data.getUint32(offset, true);
            offset += 4;
            return val;
        }

        var nFacets = getNumFacets();
        for( var i = 0; i < nFacets; i++) {
            creator.startLoop();
            creator.facetNorm(getFloat(), getFloat(), getFloat());
            creator.addVertex(getFloat(), getFloat(), getFloat());
            creator.addVertex(getFloat(), getFloat(), getFloat());
            creator.addVertex(getFloat(), getFloat(), getFloat());
            creator.endLoop();
            var attr = getAttrByteCount(); // Attribute byte count
            //if(attr == 0) {
            //  throw "parseBinaryStl: expected non-zero attribute byte count, got " + attr;
            //}
        }
    }

    /* Parses a string containing the contents of an STL file and
       feeds data to the specified creator object
     */
    GEOMETRY_READERS.readStl = function(arrayBuffer, creatorObj) {

        function decodeAsciiArray(array) {
            // The original solution cannot handle large files:
            //    var str  = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
            // Using solution from https://github.com/michael/github/issues/137
            var strs = [];
            var chunksize = 1024;
            for (var i = 0; i * chunksize < array.length; i++){
                strs.push(String.fromCharCode.apply(null, array.subarray(i * chunksize, (i + 1) * chunksize)));
            }
            return strs.join('');
        }

        var creator = new creatorObj || new FaceArrayCreator();

        // Decode the first five characters to check if we have an ASCII STL
        var str  = decodeAsciiArray(new Uint8Array(arrayBuffer,0,5));
        if(str == "solid") {
            console.log("Detected ASCII STL" );
            try {
                var str  = decodeAsciiArray(new Uint8Array(arrayBuffer));
                readAsciiStl(str, creator);
            } catch (err) {
                // Failed to read ASCII STL. Try binary?
                console.log("Failed. Trying as binary." );
                readBinaryStl(arrayBuffer, creator);
            }
        } else {
            console.log("Detected Binary STL" );
            readBinaryStl(arrayBuffer, creator);
        }
        return creator.result();
    }

}( GEOMETRY_READERS = GEOMETRY_READERS || {} )); // END OF NAMESPACE