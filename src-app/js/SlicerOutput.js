/**
 * WebSlicer
 * Copyright (C) 2022  SynDaver 3D
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

class SlicerOutput {
    constructor(data, type) {
        this.data = data;
        this.type = type;
        this.filters = [];
    }

    async rawStream() {
        switch(this.type) {
            case 'binary':
                return new Blob([this.data], {type: 'text/plain'}).stream();
            case 'file':
                return this.data.stream();
            case 'node.path':
                return await GetNativeReadableStream(this.data);
        }
    }

    addTransform(filter) {
        this.filters.push(filter);
    }

    async stream() {
        let stream = await this.rawStream();
        stream = stream.pipeThrough(new NativeTextDecoderStream())
                       .pipeThrough(new LineAlignedTransformStream());
        if(this.header) {
            stream = stream.pipeThrough(new ReplaceGCodeHeader(this.header));
        }
        for(const filter of this.filters) {
            stream = stream.pipeThrough(filter);
        }
        return stream;
    }

    setHeader(header) {
        this.header = header;
    }

    async text() {
        try {
            // https://stackoverflow.com/questions/40385133/retrieve-data-from-a-readablestream-object
            // const transformedStream = (await this.stream()).pipeThrough(new TextEncoderStream());
            // return await (new Response(transformedStream).text());
            const reader = (await this.stream()).getReader();
            let result = '';
            while (true) {
                const {done, value} = await reader.read();
                if (done) {
                    break;
                }
               result += value;
            }
            return result;
        } catch(err) {
            console.error(err);
            if(this.type == 'node.path') {
                alert("Cannot load the GCODE from the slicer. The cura work directory will open in a window for troubleshooting.");
                await ShowTempDir(this.data);
            }
            return "";
        }
    }
}