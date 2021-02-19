/**
 * STK500v2 protocol implementation for programming AVR chips.
 * The STK500v2 protocol is used by the ArduinoMega2560 and a few other Arduino platforms to load firmware.
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
 */

import {IspBase, IspError}  from './ispBase.js';
import {IntelHex}           from './intelHex.js';

// Comment out the following when building as Electron app:
//import {SequentialSerial}   from '../SequentialSerial.mjs';

export class Stk500v2 extends IspBase {
    constructor() {
        super();
        this.serial = null;
        this.seq = 1;
        this.last_addr = -1;
    }

    async connect(port) {
        if (this.serial) {
            this.close();
        }
        this.serial = port;
        await this.serial.open(115200, 1, 10000);
        this.seq = 1;

        // Reset the controller

        console.log("Reset the controller");
        for (let n = 0; n < 2; n++) {
            await this.serial.setDTR(true);
            await this.serial.wait(100);
            await this.serial.setDTR(false);
            await this.serial.wait(100);
        }
        await this.serial.wait(200);

        await this.serial.discardBuffers();
        console.log("Entering programming mode");
        try {
            var recv = await this.sendMessage([0x10, 0xc8, 0x64, 0x19, 0x20, 0x00, 0x53, 0x03, 0xac, 0x53, 0x00, 0x00]);
            if (JSON.stringify(recv) != JSON.stringify([0x10, 0x00])) {
                throw new IspError("Failed to enter programming mode");
            }

            await this.sendMessage([0x06, 0x80, 0x00, 0x00, 0x00]);
            recv = await this.sendMessage([0xEE]);
            if (recv[1] == 0x00) {
                this._has_checksum = true;
            } else {
                this._has_checksum = false;
            }
            this.serial.timeout = 5;
        } catch(e) {
            await this.close();
            throw e;
        }
        console.log("Done entering programming mode");
    }

    async close() {
        if (this.serial) {
            this.serial.close();
            this.serial = null;
        }
    }

    /**
     * Leave ISP does not reset the serial port, only resets the device, and
     * returns the serial port after disconnecting it from the programming
     * interface. This allows you to use the serial port without opening it
     * again.
     */
    async leaveISP() {
        if (this.serial) {
            const recv = await this.sendMessage([0x11]);
            if (JSON.stringify(recv) != JSON.stringify([0x11, 0x00])) {
                throw new IspError("Failed to leave programming mode");
            }
            ret = this.serial;
            this.serial = null;
            return ret;
        }
    }

    isConnected() {
        return !!this.serial;
    }

    hasChecksumFunction() {
        return this._has_checksum;
    }

    async sendISP(data) {
        const recv = await this.sendMessage([0x1D, 4, 4, 0, data[0], data[1], data[2], data[3]]);
        return recv.slice(2,6);
    }

    async writeFlash(flash_data) {
        // Set load addr to 0, in case we have more then 64k flash we need to enable the address extension
        const page_size = this.chip.pageSize * 2;
        const flash_size = page_size * this.chip.pageCount;
        if (flash_size > 0xFFFF) {
            await this.sendMessage([0x06, 0x80, 0x00, 0x00, 0x00]);
        } else {
            await this.sendMessage([0x06, 0x00, 0x00, 0x00, 0x00]);
        }
        const load_count = (flash_data.length + page_size - 1) / page_size;
        for (let i = 0; i < Math.floor(load_count); i++) {
            const preamble = [0x13, page_size >> 8, page_size & 0xFF, 0xc1, 0x0a, 0x40, 0x4c, 0x20, 0x00, 0x00];
            const payload  = flash_data.slice(i * page_size, i * page_size + page_size);
            await this.sendMessage(preamble.concat(payload));
            this.onProgress((i + 1) / load_count)
        }
        console.log("...DONE");
    }

    async verifyFlash(flash_data) {
        const length = flash_data.length;
        if (this._has_checksum) {
            await this.sendMessage([0x06, 0x00, (length >> 17) & 0xFF, (length >> 9) & 0xFF, (length >> 1) & 0xFF]);
            const res = await this.sendMessage([0xEE]);
            checksum_recv = res[2] | (res[3] << 8);
            checksum = 0;
            for (d in flash_data) {
                checksum += d;
            }
            checksum &= 0xFFFF;
            if (checksum != checksum_recv) {
                throw new IspError("Verify checksum mismatch: " + checksum +  " != " + checksum_recv);
            }
        } else {
            // Set load addr to 0, in case we have more then 64k flash we need to enable the address extension
            const flash_size = this.chip.pageSize * 2 * this.chip.pageCount;
            if (flash_size > 0xFFFF) {
                await this.sendMessage([0x06, 0x80, 0x00, 0x00, 0x00]);
            } else {
                await this.sendMessage([0x06, 0x00, 0x00, 0x00, 0x00]);
            }

            const load_count = Math.floor((length + 0xFF) / 0x100);
            for (let i = 0; i < load_count; i++) {
                const msg = await this.sendMessage([0x14, 0x01, 0x00, 0x20]);
                const recv = msg.slice(2,0x102);
                this.onProgress((i + 1)/load_count);
                for (let j = 0; j < 0x100; j++) {
                    if (i * 0x100 + j < length && flash_data[i * 0x100 + j] != recv[j]) {
                        throw new IspError("Verify error at: " + i * 0x100 + j);
                    }
                }
            }
        }
        console.log("...DONE");
    }

    async sendMessage(data) {
        const message = [0x1B, this.seq, (data.length >> 8) & 0xFF, data.length & 0xFF, 0x0E].concat(data);
        var checksum = 0;
        for (let c of message) {
            checksum ^= c;
        }
        message.push(checksum);
        await this.serial.write(message);
        await this.serial.flush();
        this.seq = (this.seq + 1) & 0xFF;
        return await this.recvMessage();
    }

    async recvMessage() {
        var state = "Start";
        var checksum = 0;
        var msg_size, data;
        while (true) {
            const s = await this.serial.read(1);
            if (s.length < 1) {
                throw new IspError("Timeout");
            }
            const b = s[0];
            checksum ^= b;
            switch (state) {
                case"Start":
                    if (b == 0x1B) {
                        state = "GetSeq";
                        checksum = 0x1B;
                    }
                    break;
                case "GetSeq":
                    state = "MsgSize1";
                    break;
                case "MsgSize1":
                    msg_size = b << 8;
                    state = "MsgSize2"
                    break;
                case "MsgSize2":
                    msg_size |= b;
                    state = "Token";
                    break;
                case "Token":
                    if (b != 0x0E) {
                        state = "Start";
                    } else {
                        state = "Data";
                        data = [];
                    }
                    break;
                case "Data":
                    data.push(b);
                    if (data.length == msg_size) {
                        state = "Checksum"
                    }
                    break;
                case "Checksum":
                    if (checksum != 0) {
                        state = "Start";
                    } else {
                        return data;
                    }
                    break;
            }
        }
    }
}
