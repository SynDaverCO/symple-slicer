/**
 * Database of AVR chips for avr_isp programming. Contains signatures and flash sizes from the AVR datasheets.
 * To support more chips add the relevant data to the avrChipDB list.
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
export class ChipDB {
    static getChip(sig) {
        for (const [chip, data] of Object.entries(ChipDB.db)) {
            if (ChipDB.signaturesMatch(data.signature, sig)) {
                return data;
            }
        }
    }
    
    static signaturesMatch(a,b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }
}

ChipDB.db = {
    "ATMega1280": {
            "signature": [0x1E, 0x97, 0x03],
            "pageSize": 128,
            "pageCount": 512,
    },
    "ATMega2560": {
            "signature": [0x1E, 0x98, 0x01],
            "pageSize": 128,
            "pageCount": 1024,
    },
}
