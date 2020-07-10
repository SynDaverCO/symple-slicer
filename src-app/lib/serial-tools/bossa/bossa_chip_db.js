/**
 *
 * @licstart
 *
 * Copyright (C) 2020 ShumaTech
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

export class BossaChipDB {
    static getChip(chip_id) {
        for (const [chip, data] of Object.entries(BossaChipDB.db)) {
            if (data.chip_id == chip_id) {
                return data;
            }
        }
    }
}

BossaChipDB.db = {
    // SAMD21
    "ATSAMD21J18A": {
        "chip_id": 0x10010000,
        "flash_type": "nvm",
        "addr": 0x00002000,
        "pages": 4096,
        "size": 64,
        "planes": 1,
        "lockRegions": 16,
        "user": 0x20004000,
        "stack": 0x20008000,
        "regs": 0x41004000,
        "canBrownout": true,
    },
    // SAM7SE:

    // SAM7S

    // SAM7XC

    // SAM7X

    "AT91SAMX512": {
        "chip_id": 0x275c0a40,
        "flash_type": "efc",
        "addr": 0x100000,
        "pages": 2048,
        "size": 256,
        "planes": 2,
        "lockRegions" : 32,
        "user": 0x202000,
        "stack": 0x220000,
        "canBootFlash": true,
    },
    "AT91SAMX256": {
        "chip_id": 0x275b0940,
        "flash_type": "efc",
        "addr": 0x100000,
        "pages": 1024,
        "size": 256,
        "planes": 1,
        "lockRegions" : 16,
        "user": 0x202000,
        "stack": 0x210000,
        "canBootFlash": true,
    },
    "AT91SAMX128": {
        "chip_id": 0x275a0740,
        "flash_type": "efc",
        "addr": 0x100000,
        "pages": 512 ,
        "size": 256,
        "planes": 1,
        "lockRegions" : 8,
        "user": 0x202000,
        "stack": 0x208000,
        "canBootFlash": true,
    },

    // SAM4S

    // SAM3N

    // SAM3S

    // SAM3U

    // SAM3X
    "ATSAM3X8E": {
        "chip_id": 0x285e0a60,
        "flash_type": "eefc",
        "addr": 0x00080000,
        "pages": 2048,
        "size": 256,
        "planes": 2,
        "lockRegions" : 32,
        "user": 0x20001000,
        "stack": 0x20010000,
        "regs": 0x400e0a00,
        "canBrownout": false,
    },

    // SAM3A

    // SAM7L

    // SAM9XE

    "ATSAM9XE512": {
        "chip_id": 0x329aa3a0,
        "flash_type": "eefc",
        "addr": 0x200000,
        "pages": 1024,
        "size": 512,
        "planes": 1,
        "lockRegions" : 32,
        "user": 0x300000,
        "stack": 0x307000,
        "regs": 0xfffffa00,
        "canBrownout": true,
    },
    "ATSAM9XE256": {
        "chip_id": 0x329a93a0,
        "flash_type": "eefc",
        "addr": 0x200000,
        "pages": 512,
        "size": 512,
        "planes": 1,
        "lockRegions" : 16,
        "user": 0x300000,
        "stack": 0x307000,
        "regs": 0xfffffa00,
        "canBrownout": true,
    },
    "ATSAM9XE128": {
        "chip_id": 0x329973a0,
        "flash_type": "eefc",
        "addr": 0x200000,
        "pages": 256,
        "size": 512,
        "planes": 1,
        "lockRegions" : 8,
        "user": 0x300000,
        "stack": 0x303000,
        "regs": 0xfffffa00,
        "canBrownout": true,
    },
};
