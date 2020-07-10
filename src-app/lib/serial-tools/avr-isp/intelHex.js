/**
 * Module to read intel hex files into binary data blobs.
 * IntelHex files are commonly used to distribute firmware
 * See: http://en.wikipedia.org/wiki/Intel_HEX
 *
 * This is a ECMA 6 conversion of the code from Cura LulzBot Edition
 * Which in turn is a python 3 conversion of the code created by David Braam for the Cura project.
 *
 * @licstart
 *
 * Copyright (C) 2020 Ultimaker B.V.
 * Copyright (C) 2020 Aleph Objects, Inc.
 * Copyright (C) 2020 SynDaver Labs, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * @licend
 *
 */

export class IntelHex {
    static decode(data) {
        // Read an verify an intel hex file. Return the data as an list of bytes.
        const bytes = [];
        const str = typeof data === 'string' ? str : new TextDecoder().decode(data);
        var extra_addr = 0;
        for (let line of str.split(/\s*\n\s*/)) {
            if (line.length < 1) {
                continue;
            }
            if (line[0] != ":") {
                throw new Error("Hex file has a line not starting with ':'");
            }
            const rec_len  = parseInt(line.substring(1,3), 16);
            const addr     = parseInt(line.substring(3,7), 16) + extra_addr;
            const rec_type = parseInt(line.substring(7,9), 16);
            if (line.length != rec_len * 2 + 11) {
                throw new Error("Error in hex file: " + line);
            }
            var check_sum = 0;
            for (let i = 0; i < rec_len + 5; i++) {
                check_sum += parseInt(line.substring(i*2+1,i*2+3), 16);
            }
            check_sum &= 0xFF;
            if (check_sum != 0) {
                throw new Error("Checksum error in hex file: " + line);
            }

            switch(rec_type) {
                case 0: // Data record
                    while (bytes.length < addr + rec_len) {
                        bytes.push(0);
                    }
                    for (let i = 0; i < rec_len; i++) {
                        bytes[addr + i] = parseInt(line.substring(i*2+9,i*2+11), 16);
                    }
                    break;
                case 1: // End Of File record
                    break;
                case 2: // Extended Segment Address Record
                    extra_addr = parseInt(line.substring(9,13), 16) * 16;
                    break;
                default:
                    console.log(rec_type, rec_len, addr, check_sum, line);
            }
        }
        return bytes;
    }
}