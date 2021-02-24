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

import { WordCopyApplet } from './wordcopy_applet.js';

export class EEFC_Flash {
    constructor(samba, chip) {
        this.samba     = samba;
        this.chip      = chip;
        this.wordCopy  = new WordCopyApplet(samba,chip);
        this.eraseAuto = false;

        this.onBufferA   = true;
        // page buffers will have the size of a physical page and will be situated right after the applet
        this.pageBufferA = this.chip.user + 0x1000;
        this.pageBufferB = this.pageBufferA + this.chip.size;
    }

    async start() {
        await this.wordCopy.write();
        // Copying init code from Flash console.log here
        await this.wordCopy.setWords(Math.floor(this.chip.size / 4) );
        await this.wordCopy.setStack(this.chip.stack);

        // SAM3 Errata (FWS must be 6)
        await this.samba.writeWord(this.chip.regs + 0x000, 0x600);
        if (this.chip.planes == 2) {
            await this.samba.writeWord(this.chip.regs + 0x200, 0x600);
        }
    }

    async eraseAll() {
        await this.waitFSR();
        await this.writeFCR0(0x5, 0);
        if (this.chip.planes == 2) {
            await this.waitFSR();
            await this.writeFCR1(0x5, 0);
        }
    }

    setEraseAuto(enable) {
        this.eraseAuto = enable;
    }

    async isLocked() {
        await this.waitFSR();
        await this.writeFCR0(0xa, 0);
        await this.waitFSR();
        const frr0 = await this.readFRR0();
        if (frr0) {
            return true;
        }
        if (this.chip.planes == 2) {
            await this.writeFCR1(0xa, 0);
            await this.waitFSR();
            const frr1 = await this.readFRR1();
            if (frr1) {
                return true;
            }
        }
        return false;
    }

    async getLockRegion(region) {
        if (region >= this.chip.lockRegions) {
            throw Error("RegionError");
        }

        await this.waitFSR();
        if ((this.chip.planes == 2) && (region >= this.chip.lockRegions/2)) {
            await this.writeFCR1(0xa, 0);
            await this.waitFSR();
            const frr1 = await this.readFRR1();
            if (frr1 & (1 << (region - Math.floor(this.chip.lockRegions/2)))) {
                return true;
            }
        } else {
            await this.writeFCR0(0xa, 0);
            await this.waitFSR();
            const frr0 = await this.readFRR0();
            if (frr0 & (1 << region)) {
                return true;
            }
        }
        return false;
    }


    async setLockRegion(region, enable) {
        if (region >= this.chip.lockRegions) {
            throw Error("RegionError");
        }

        const regEnabled = await this.getLockRegion(region);
        if (enable != regEnabled) {
            if ((this.chip.planes == 2) && (region >= this.chip.lockRegions/2)) {
                const page = (region - this.chip.lockRegions / 2) * this.chip.pages / this.chip.lockRegions;
                await this.waitFSR()
                if (enable) {
                    await this.writeFCR1(0x8, page);
                } else {
                    await this.writeFCR1(0x9, page);
                }
            } else {
                const page = region * this.chip.pages / this.chip.lockRegions;
                await this.waitFSR()
                if (enable) {
                    await this.writeFCR0(0x8, page);
                } else {
                    await this.writeFCR0(0x9, page);
                }
            }
        }
    }

    async getSecurity() {
        await this.waitFSR();
        await this.writeFCR0(0xd, 0);
        await this.waitFSR();
        const frr0 = await this.readFRR0();
        return !!(frr0 & (1 << 0));
    }

    async setSecurity() {
        await this.waitFSR();
        await this.writeFCR0(0xb, 0);
    }

    async getBod() {
        if (!this.chip.canBrownout) {
            return false;
        }
        await this.waitFSR();
        await this.writeFCR0(0xd, 0);
        await this.waitFSR();
        const frr0 = await this.readFRR0();
        return !!(frr0 & (1 << 1));
    }

    async setBod(enable) {
        if (!this.chip.canBrownout) {
            return;
        }
        await this.waitFSR();
        if (enable) {
            await this.writeFCR0(0xb, 1);
        } else {
            await this.writeFCR0(0xc, 1);
        }
    }

    async getBor() {
        if (!this.chip.canBrownout) {
            return false;
        }
        await this.waitFSR();
        await this.writeFCR0(0xd,0);
        await this.waitFSR();
        const frr0 = await this.readFRR0();
        return !!(frr0 & (1 << 2));
    }

    async setBor(enable) {
        if (!this.chip.canBrownout) {
            return;
        }
        await this.waitFSR();
        if (enable) {
            await this.writeFCR0(0xb, 2);
        } else {
            await this.writeFCR0(0xc, 2);
        }
    }

    async getBootFlash() {
        await this.waitFSR();
        await this.writeFCR0(0xd, 0);
        await this.waitFSR();
        const frr0 = await this.readFRR0();
        if (this.chip.canBrownout) {
            result = !!(frr0 & (1 << 3));
        } else {
            result = !!(frr0 & (1 << 1));
        }
        return result;
    }

    async setBootFlash(enable) {
        await this.waitFSR();
        if (enable) {
            if (this.chip.canBrownout) {
                await this.writeFCR0(0xb, 3);
            } else {
                await this.writeFCR0(0xb, 1);
            }
        } else {
            if (this.chip.canBrownout) {
                await this.writeFCR0(0xc,3);
            } else {
                await this.writeFCR0(0xc,1);
            }
        }
        await this.waitFSR();
        await this.samba.sleepSeconds(0.01);
    }

    async writePage(page) {
        if (page > this.chip.pages) {
            throw Error("FlashPageError");
        }
        await this.wordCopy.setDstAddr(this.chip.addr + page * this.chip.size);
        await this.wordCopy.setSrcAddr(this.activePageBuffer);
        this.onBufferA = !this.onBufferA;
        await this.waitFSR();
        await this.wordCopy.runv();
        if ((this.chip.planes == 2) && (page >= Math.floor( this.chip.pages / 2 ))) {
            if (this.eraseAuto) {
                await this.writeFCR1(0x3, page - Math.floor(this.chip.pages / 2));
            } else {
                await this.writeFCR1(0x1, page - Math.floor(this.chip.pages / 2));
            }
        } else {
            if (this.eraseAuto) {
                await this.writeFCR0(0x3, page);
            } else {
                await this.writeFCR0(0x1, page);
            }
        }
    }

    async readPage(page) {
        if (page > this.chip.page) {
            throw Error("FlashPageError");
        }
        /* The SAM3 firmware has a bug where it returns all zeros for reads
         * directly from the flash so instead, we copy the flash page to
         * SRAM and read it from there.
         */
        await this.wordCopy.setDstAddr(this.activePageBuffer);
        await this.wordCopy.setSrcAddr(this.chip.addr + page * this.chip.size);
        await this.waitFSR();
        await this.wordCopy.runv();

        return this.samba.read(this.activePageBuffer, this.chip.size);
    }

    async waitFSR() {
        var tries = 0;
        var fsr1 = 0x1;
        while (tries <= 500) {
            tries = tries + 1;
            const fsr0 = await this.samba.readWord(this.chip.regs + 0x008);
            if (fsr0 & (1 << 2)) {
                throw Error("FlashLockError");
            }

            if (this.chip.planes == 2) {
                fsr1 = await this.samba.readWord(this.chip.regs + 0x208);
                if (fsr1 & (1 << 2)) {
                    throw Error("FlashLockError");
                }
            }
            if (fsr0 & fsr1 & 0x1) {
                break;
            }
            await this.samba.sleepSeconds(0.0001);
        }
        if (tries > 500) {
            throw Error("FlashCmdError");
        }
    }

    writeFCR0(cmd, arg) {
        return this.samba.writeWord(this.chip.regs + 0x004, (0x5a << 24) | (Math.floor(arg) << 8) | cmd );
    }

    writeFCR1(cmd, arg) {
        return this.samba.writeWord(this.chip.regs + 0x204, (0x5a << 24) | (Math.floor(arg) << 8) | cmd );
    }

    readFRR0() {
        return this.samba.readWord(this.chip.regs + 0x00C);
    }

    readFRR1() {
        return this.samba.readWord(this.chip.regs + 0x20C);
    }

    // ------------ Adding Functions common to Flash console.log here for now -------------
    async lockAll() {
        for (var region = 0; region < this.chip.lockRegions; region++) {
            await this.setLockRegion(region, true);
        }
    }

    async unlockAll() {
        for (var region = 0; region < this.chip.lockRegions; region++) {
            await this.setLockRegion(region, false);
            // This is not part of the original bossa implementation.
            // Added for more robustness to serial errors.
            if(await this.getLockRegion(region)) {
                console.log("Retrying flash lock on", region);
                await this.setLockRegion(region, false);
            }
        }
    }

    loadBuffer(data) {
        return this.samba.write(this.activePageBuffer, data);
    }

    readBuffer() {
        return this.samba.read(this.activePageBuffer, this.chip.size);
    }

    get activePageBuffer() {
        return this.onBufferA ? this.pageBufferA : this.pageBufferB
    }

    writeBuffer(dst_addr, size) {
        return this.samba.writeBuffer(this.activePageBuffer, dst_addr + this.chip.addr, size);
    }

    checksumBuffer(start_addr, size) {
        return this.samba.checksumBuffer(start_addr + this.chip.addr, size);
    }

    pageSize() {
        return this.chip.size;
    }

    numPages() {
        return this.chip.pages;
    }
}