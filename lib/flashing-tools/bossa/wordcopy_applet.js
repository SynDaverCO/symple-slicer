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

export class WordCopyApplet {
    constructor(samba, chip) {
        this.samba = samba;
        this.chip = chip;

        this.dst_addr = 0x00000028;
        this.reset = 0x00000024;
        this.src_addr = 0x0000002c;
        this.stack = 0x00000020;
        this.start = 0x00000000;
        this.words = 0x00000030;
        this.code = Uint8Array.from([
            0x09, 0x48, 0x0a, 0x49, 0x0a, 0x4a, 0x02, 0xe0, 0x08, 0xc9, 0x08, 0xc0, 0x01, 0x3a, 0x00, 0x2a,
            0xfa, 0xd1, 0x04, 0x48, 0x00, 0x28, 0x01, 0xd1, 0x01, 0x48, 0x85, 0x46, 0x70, 0x47, 0xc0, 0x46,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00]);
    }

    async write() {
        await this.samba.write(this.chip.user, this.code);
    }

    async setDstAddr(dstAddr) {
        await this.samba.writeWord(this.chip.user + this.dst_addr, dstAddr);
    }

    async setSrcAddr(srcAddr) {
        await this.samba.writeWord(this.chip.user + this.src_addr, srcAddr);
    }

    async setWords(words) {
        await this.samba.writeWord(this.chip.user + this.words, words);
    }

    async setStack(stack) {
        await this.samba.writeWord(this.chip.user + this.stack, stack);
    }

    async run() {
        // Add one to the start address for Thumb mode
        await this.samba.go(this.chip.user + this.start + 1);
    }

    async runv() {
        // Add one to the start address for Thumb mode
        await this.samba.writeWord( this.chip.user + this.reset, this.chip.user + this.start + 1);
        // The stack is the first reset vector
        await this.samba.go(this.chip.user + this.stack);
    }
}