/**
 * BOSSA.js is a JavaScript rewrite of BOSSAPY from Cura LE
 * BOSSAPY is python3 rewrite of https://github.com/shumatech/BOSSA
 *
 * BOSSA is a flash programming utility for Atmel's SAM family of flash-based
 * ARM microcontrollers. The motivation behind BOSSA is to create a simple,
 * easy-to-use, open source utility to replace Atmel's SAM-BA software. BOSSA
 * is an acronym for Basic Open Source SAM-BA Application to reflect that goal.
 *
 * @licstart
 *
 * Copyright (C) 2020, ShumaTech
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
 */

import {Samba}              from './samba.js';
import {BossaChipDB}        from './bossa_chip_db.js';
import {EEFC_Flash}         from './eefc_flash.js';
//import {SequentialSerial}   from '../SequentialSerial.mjs';

export class SerialError extends Error {}

export class BOSSA {
    constructor() {
        this.serial = null;
        this.chip = false;
        this.samba = null;
        this.flash = null;
    }

    async reset_to_bootloader(port) {
        console.log("...Initializing serial with ", port);
        this.serial = new SequentialSerial();
        await this.serial.open(port, 1200);
        await this.serial.setDTR(true);
        await this.serial.wait(100);
        await this.serial.setDTR(false);
        await this.serial.close();

        // After this new serial device should appear within max 2 seconds..
        await this.serial.wait(2000);
        this.serial = null;
    }

    async connect(port) {
        console.log("...Trying to connect with bootloader on", port );

        //this.serial = new SerialPort(port, {baudRate: 921600});
        this.serial = new SequentialSerial();
        await this.serial.open(port, 921600);

        this.samba = new Samba(this.serial);

        await this.samba.SetBinary();
        const cid = await this.samba.chipId();
        console.log("...ChipID =", cid.toString(16));

        /* Read the sam-ba version to detect if extended commands are available
         * NOTE: we MUST call version() after chipId(), otherwise sam-ba did not
         * answer correctly on some devices when used from UART.
         * The reason is unknown.
         */
        const ver = await this.samba.version();
        console.log("...SAM-BA version = [", ver, "]");

        this.chip = BossaChipDB.getChip(cid);
        if (!this.chip) {
            throw new Error("Chip with signature: " + cid.toString(16) + " not found");
        }

        if (this.chip.flash_type == "eefc") {
            this.flash = new EEFC_Flash(this.samba, this.chip);
        } else {
            this.flash = null;
            throw new Error("Unsupported flash type");
        }
    }

    async flash_firmware(arrayBuffer) {
        const data = new Uint8Array(arrayBuffer);
        console.log("...Flashing firmware");

        await this.flash.start();
        console.log("...Unlock all regions");
        await this.flash.unlockAll();

        console.log("...Erase flash");
        await this.flash.eraseAll();
        await this.flash.setEraseAuto(false);

        const file_size = data.length;
        const page_size = this.flash.pageSize();

        const num_pages = Math.floor( (file_size + page_size - 1) / page_size);
        if (num_pages > this.flash.numPages()) {
            throw new Error("FileSizeError")
        }
        console.log("...Write", file_size, "bytes to flash (", num_pages, "pages)");

        // Using Legacy write
        for (let page = 0; page < num_pages; page++) {
            this.onProgress(0.5 * page / num_pages);
            const offset = page * page_size;
            const pageData = data.slice(offset, offset + page_size);
            await this.flash.loadBuffer(pageData);
            await this.flash.writePage(page);
        }

        // Verify firmware write
        console.log("...Verifying", file_size, "bytes from flash (", num_pages, "pages)");
        for (var page = 0; page < num_pages; page++) {
            this.onProgress(0.5 + 0.5 * page / num_pages);
            const offset = page * page_size;
            const pageData = data.slice(offset, offset + page_size);
            const verifyData = await this.flash.readPage(page);
            for(let i = 0; i < pageData.length; i++) {
                if(verifyData[i] != pageData[i]) {
                    console.log("Verify fail at byte", i, "Got:", verifyData[i], "expected:", pageData[i]);
                    throw new Error("Write verification failed");
                }
            }
        }
        this.onProgress(1);

        console.log("...Set boot flash true");
        await this.flash.setBootFlash(true);
    }
    
    async reset_and_close() {
        console.log("...CPU reset");
        await this.samba.reset();

        console.log("...Closing Serial");
        await this.serial.close();

        // Wait for 5secs for port to re-appear
        await this.serial.wait(5000);
        this.serial = null;
    }

    async find_devices(filter) {
        var matchingDevices = [];
        const ports = await SequentialSerial.getPorts();
        for(let i = 0; i < ports.length; i++) {
            if(filter.hasOwnProperty("vendorId")  && ports[i].vendorId  != filter.vendorId)  continue;
            if(filter.hasOwnProperty("productId") && ports[i].productId != filter.productId) continue;
            if(filter.hasOwnProperty("path")      && ports[i].path      != filter.path)      continue;
            matchingDevices.push(ports[i].path);
        }
        return matchingDevices;
    }

    // Event handlers which can be overriden by the caller

    // Called with a progress value from 0 to 1
    onProgress(progress) {}
}