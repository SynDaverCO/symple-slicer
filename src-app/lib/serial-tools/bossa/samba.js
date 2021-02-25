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

 /**
  * Implements the SAMBA protocol as described here:
  *   http://www.varsanofiev.com/inside/at91_sam_ba.htm
  *   https://sourceforge.net/p/lejos/wiki-nxt/SAM-BA%20Protocol/
  *
  * There seems to be some ambiguity in these documents about whether
  * a command should be terminated with "#" or "#\n". The original
  * bossa code used "#" but it seems "#\n" works better.
  */

export class Samba {
    constructor(serial) {
        this.serial = serial;
    }

    static hex8(val) {
        return val.toString(16).padStart(8, "0");
    }

    static littleEndian(data) {
        return (data[3] << 24) + (data[2] << 16) + (data[1] << 8) + data[0];
    }

    async SetBinary() {
        // Logger.log("...Set binary mode")
        await this.serial.write('N#\n');
        await this.serial.flush();
        await this.serial.read(2); // Expects b'\n\r' here
    }

    async write(addr, data) {
        //cmd = str.encode("S" + str('%0*x' % (8,addr)) + "," + str('%0*x' % (8,len(data)))  + "#");
        const cmd = "S" + Samba.hex8(addr) + "," + Samba.hex8(data.length) + "#\n";
        await this.serial.write(cmd);
        await this.serial.flush();
        await this.serial.write(data);
        await this.serial.flush();

        // Logger.log("...Write to addr=" + hex(addr) + " of " + str(size) + " bytes")
    }

    async read(addr, size) {
        // The SAM firmware has a bug reading powers of 2 over 32 bytes
        // via USB.  If that is the case here, then send two commands.
        // One to read one less byte followed by one to read the last byte.
        const splitRead = size > 32 && !(size & (size - 1));
        if(splitRead) {
            size--;
        }

        const cmd = "R" + Samba.hex8(addr) + "," + Samba.hex8(size) + "#\n";
        await this.serial.write(cmd);
        if(splitRead) {
            // Request last byte
            const cmd = "o" + Samba.hex8(addr + size) + ",1#\n";
            await this.serial.write(cmd);
            size++;
        }
        await this.serial.flush();
        return this.serial.read(size);
    }

    async go(addr) {
        //cmd = str.encode("G" + str('%0*x' % (8,addr)) + "#");
        const cmd = "G" + Samba.hex8(addr) + "#\n";
        await this.serial.write(cmd);
        await this.serial.flush();
        // Logger.log("...Go to addr=" + hex(addr) )
    }

    async version() {
        var version_string = "";
        await this.serial.write('V#\n');
        await this.serial.flush();
        while(true) {
            const data = await this.serial.read(1);
            const s = String.fromCharCode(data[0]);
            if (s == '\r') {
                return version_string.trim();
            }
            version_string += s;
        }
    }

    async chipId() {
        // Read the ARM reset vector
        const vector = await this.readWord(0x0);

        if ((vector & 0xff000000) == 0xea000000) {
            return this.readWord(0xfffff240);
        }
        // Else use the Atmel SAM3 or SAM4 or SAMD registers

        // The M0+, M3 and M4 have the CPUID register at a common addresss 0xe000ed00
        const cpuid_reg = await this.readWord(0xe000ed00);
        const part_no = cpuid_reg & 0x0000fff0;

        // Check if it is Cortex M0+
        if (part_no == 0xC600) {
            return this.readWord(0x41002018) & 0xFFFF00FF;
        }
        // Else assume M3 or M4
        var cid = await this.readWord(0x400e0740);
        if (cid == 0x0) {
            cid = await this.readWord(0x400e0940);
        }

        return cid;
    }

    async reset() {
        const chip_id = await this.chipId();
        if (chip_id == 0x285e0a60) {
            await this.writeWord(0x400E1A00, 0xA500000D);
        } else {
            console.log("...Reset is not supported for this CPU");
            /* Some linux users experienced a lock up if the serial
               port is closed while the port itself is being destroyed.
               This delay is here to give the time to kernel driver to
               sort out things before closing the port.
             */
            await this.sleepSeconds(0.1);
        }
    }

    async readByte(address) {
        const cmd = "o" + Samba.hex8(address) + ",1#\n";
        await this.serial.write(cmd);
        await this.serial.flush();
        const bytes = await this.serial.read(1);
        return bytes[0];
    }

    async readWord(address) {
        //cmd = str.encode("w" + str('%0*x' % (8,address)) + ",4#");
        const cmd = "w" + Samba.hex8(address) + ",4#\n";
        await this.serial.write(cmd);
        await this.serial.flush();
        const bytes = await this.serial.read(4);
        const value = Samba.littleEndian(bytes);
        // console.log("...Read from addr=" + hex(address) + "[" + hex(value)+ "]")
        return value;
    }

    async writeWord(address, value) {
        //cmd = str.encode("W" + str('%0*x' % (8,address)) + "," + str('%0*x' % (8,value))  + "#");
        const cmd = "W" + Samba.hex8(address) + "," + Samba.hex8(value) + "#\n";
        await this.serial.write(cmd);
        await this.serial.flush();
    }

    sleepSeconds(s) {
        return this.serial.wait(s * 1000);
    }
}