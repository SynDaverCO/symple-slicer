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

export class SlicerOutput {
    constructor(data, type) {
        this.data = data;
        this.type = type;
    }

    async stream() {
        switch(this.type) {
            case 'binary':
                return new Blob([this.data], {type: 'text/plain'}).stream();
            case 'file':
                return this.data.stream();
            case 'node.path':
                return await GetNativeReadableStream(this.data);
        }
    }
}