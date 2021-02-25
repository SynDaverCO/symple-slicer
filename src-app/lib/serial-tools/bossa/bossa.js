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

// Comment out the following when building as Electron app:
//import {SequentialSerial}   from '../SequentialSerial.mjs';

export class SerialError extends Error {}

export class BOSSA {
    constructor() {
        this.serial = null;
        this.chip = false;
        this.samba = null;
        this.flash = null;
    }

    static compareArray(a,b,len) {
        if(a.length < len || b.length < len) return false;
        for(let i = 0; i < len; i++) {
            if(a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }

    async reset_to_bootloader(port) {
        console.log("...Initializing serial with ", port);
        this.serial = port;
        await this.serial.open(1200);
        await this.serial.setDTR(true);
        await this.serial.wait(100);
        await this.serial.setDTR(false);
        await this.serial.close();

        // After this new serial device should appear within max 5 seconds..
        await this.serial.wait(5000);
        this.serial = null;
    }

    async connect(port) {
        console.log("...Trying to connect with bootloader on", port );

        this.serial = port;
        await this.serial.open(921600);

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

        await this.flash.start();
    }

    async flash_firmware(arrayBuffer, maxRetries = 3) {
        const data = new Uint8Array(arrayBuffer);
        console.log("...Flashing firmware");

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
            this.onProgress(page / num_pages);
            const offset = page * page_size;
            const pageData = data.slice(offset, offset + page_size);
            await this.flash.loadBuffer(pageData);
            // The original bossa implementation does not read back the buffer
            // before writing it to flash, but doing so catches serial errors.
            for(let retries = 0; retries < maxRetries; retries++) {
                const readBack = await this.flash.readBuffer();
                if(BOSSA.compareArray(pageData, readBack, pageData.length)) break;
                console.log("...Upload corruption detected. Resending page", page);
                await this.samba.readByte(0xDEAD); // Something to grep for if monitoring
                await this.flash.loadBuffer(pageData);
            }
            await this.flash.writePage(page);
        }
        this.onProgress(1);
    }

    async verify_firmware(arrayBuffer) {
        const data = new Uint8Array(arrayBuffer);

        const file_size = data.length;
        const page_size = this.flash.pageSize();

        const num_pages = Math.floor( (file_size + page_size - 1) / page_size);
        if (num_pages > this.flash.numPages()) {
            throw new Error("FileSizeError")
        }

        // Verify firmware write
        console.log("...Verifying", file_size, "bytes from flash (", num_pages, "pages)");
        for (let page = 0; page < num_pages; page++) {
            this.onProgress(page / num_pages);
            const offset = page * page_size;
            const pageData = data.slice(offset, offset + page_size);
            const readBack = await this.flash.readPage(page);
            if(!BOSSA.compareArray(pageData, readBack, pageData.length)) {
                throw new Error("Write verification failed on page " + page);
            }
        }
        this.onProgress(1);
    }

    async enable_boot_flag() {
        console.log("...Set boot flash true");
        await this.flash.setBootFlash(true);
    }

    async reset_and_close() {
        if(this.samba) {
            console.log("...CPU reset");
            await this.samba.reset();
            this.samba = null;
        }

        if(this.serial) {
            console.log("...Closing Serial");
            await this.serial.close();

            // Wait for 5 secs for port to re-appear
            await this.serial.wait(5000);
            this.serial = null;
        }
    }

    // Event handlers which can be overriden by the caller

    // Called with a progress value from 0 to 1
    onProgress(progress) {}
}