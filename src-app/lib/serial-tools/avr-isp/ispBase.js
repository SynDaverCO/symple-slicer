/**
 * General interface for Isp based AVR programmers.
 * The ISP AVR programmer can load firmware into AVR chips. Which are commonly used on 3D printers.

 * Needs to be subclassed to support different programmers.
 * Currently only the stk500v2 subclass exists.
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

import {ChipDB} from './chipDB.js';

export class IspError extends Error {};

export class IspBase {
    // Base class for ISP based AVR programmers.
    // Functions in this class throw an IspError when something goes wrong.
    async programChip(flash_data, flash = true, verify = true) {
        const signature = await this.getSignature();
        // Program a chip with the given flash data.
        this.cur_ext_addr = -1;
        this.chip = ChipDB.getChip(signature);
        if (!this.chip) {
            throw new IspError("Chip with signature: " + JSON.stringify(signature) + "not found");
        }

        if(flash) {
            await this.chipErase();
            console.log("Flashing", flash_data.length, "bytes");
            await this.writeFlash(flash_data);
        }
        if(verify) {
            console.log("Verifying", flash_data.length, "bytes");
            await this.verifyFlash(flash_data);
        }
        console.log("Completed");
    }

    async getSignature() {
        // Get the AVR signature from the chip. This is a 3 byte array which describes which chip we are connected to.
        // This is important to verify that we are programming the correct type of chip and that we use proper flash block sizes.
        const recv1 = await this.sendISP([0x30, 0x00, 0x00, 0x00]);
        const recv2 = await this.sendISP([0x30, 0x00, 0x01, 0x00]);
        const recv3 = await this.sendISP([0x30, 0x00, 0x02, 0x00]);
        return [recv1[3],recv2[3],recv3[3]];
    }

    async chipErase() {
        // Do a full chip erase, clears all data, and lockbits.
        await this.sendISP([0xAC, 0x80, 0x00, 0x00]);
    }

    writeFlash(flash_data) {
        // Write the flash data, needs to be implemented in a subclass.
        throw new IspError("Called undefined writeFlash");
    }

    verifyFlash(flash_data) {
        // Verify the flash data, needs to be implemented in a subclass.
        throw new IspError("Called undefined verifyFlash");
    }

    // Additional methods for Symple Slicer

    reset_and_close() {
        return this.close();
    }

    flash_firmware(data) {
        return this.programChip(data,true,false);
    }

    verify_firmware(data) {
        return this.programChip(data,false,true);
    }

    enable_boot_flag() {
    }

    // Event handlers which can be overriden by the caller

    // Called with a progress value from 0 to 1
    onProgress(progress) {}
}