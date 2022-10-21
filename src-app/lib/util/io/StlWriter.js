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
var GEOMETRY_WRITERS = {};

(function( GEOMETRY_WRITERS, undefined ) { // EXTEND NAMESPACE
    GEOMETRY_WRITERS.writeStl = (geometry, writeFunc) => {
        var headerData = new Uint8Array(80);
        var uint16Data = new Uint16Array(1);
        var uint32Data = new Uint32Array(1);
        var vectorData = new Float32Array(3);

        // Unpack the buffered geometry
        
        const position = geometry.getAttribute('position');
        const index = geometry.getIndex();

        // Write the 80 byte header
        writeFunc(new Uint8Array(headerData.buffer), 0, headerData.length * headerData.BYTES_PER_ELEMENT);

        // Write the number of triangles
        uint32Data[0] = GeometryAlgorithms.countFaces(geometry);
        writeFunc(new Uint8Array(uint32Data.buffer), 0, uint32Data.length * uint32Data.BYTES_PER_ELEMENT);

        // Write the triangle information
        GeometryAlgorithms.forEachFace(geometry,
            (face, i) => {
                // Write the face normal
                vectorData[0] = face.normal.x;
                vectorData[1] = face.normal.y;
                vectorData[2] = face.normal.z;
                writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex A information
                vectorData[0] = face.a.x;
                vectorData[1] = face.a.y;
                vectorData[2] = face.a.z;
                writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex B information
                vectorData[0] = face.b.x;
                vectorData[1] = face.b.y;
                vectorData[2] = face.b.z;
                writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex C information
                vectorData[0] = face.c.x;
                vectorData[1] = face.c.y;
                vectorData[2] = face.c.z;
                writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the attribute type count
                uint16Data[0] = 0;
                writeFunc(new Uint8Array(uint16Data.buffer), 0, uint16Data.length * uint16Data.BYTES_PER_ELEMENT);
            });
    }


    GEOMETRY_WRITERS.writeStlAsync = async (geometry, writeFunc) => {
        var headerData = new Uint8Array(80);
        var uint16Data = new Uint16Array(1);
        var uint32Data = new Uint32Array(1);
        var vectorData = new Float32Array(3);

        // Unpack the buffered geometry
        
        const position = geometry.getAttribute('position');
        const index = geometry.getIndex();

        // Write the 80 byte header
        await writeFunc(new Uint8Array(headerData.buffer), 0, headerData.length * headerData.BYTES_PER_ELEMENT);

        // Write the number of triangles
        uint32Data[0] = GeometryAlgorithms.countFaces(geometry);
        await writeFunc(new Uint8Array(uint32Data.buffer), 0, uint32Data.length * uint32Data.BYTES_PER_ELEMENT);

        // Write the triangle information
        await GeometryAlgorithms.forEachFaceAsync(geometry,
            async (face, i) => {
                // Write the face normal
                vectorData[0] = face.normal.x;
                vectorData[1] = face.normal.y;
                vectorData[2] = face.normal.z;
                await writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex A information
                vectorData[0] = face.a.x;
                vectorData[1] = face.a.y;
                vectorData[2] = face.a.z;
                await writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex B information
                vectorData[0] = face.b.x;
                vectorData[1] = face.b.y;
                vectorData[2] = face.b.z;
                await writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the vertex C information
                vectorData[0] = face.c.x;
                vectorData[1] = face.c.y;
                vectorData[2] = face.c.z;
                await writeFunc(new Uint8Array(vectorData.buffer), 0, vectorData.length * vectorData.BYTES_PER_ELEMENT);
                // Write the attribute type count
                uint16Data[0] = 0;
                await writeFunc(new Uint8Array(uint16Data.buffer), 0, uint16Data.length * uint16Data.BYTES_PER_ELEMENT);
            });
    }

}( GEOMETRY_WRITERS = GEOMETRY_WRITERS || {} )); // END OF NAMESPACE