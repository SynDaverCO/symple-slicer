/**
 * WebSlicer
 * Copyright (C) 2020  SynDaver Labs, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const SerialPort = require('serialport');
const { ipcRenderer } = require('electron');

/************ Contents of "serial-tools/nodejs/SequentialSerial.mjs" ************/

class SerialTimeout extends Error {}
class SerialDisconnected extends Error {}

class SequentialSerial {

    constructor(path, vendorId, productId) {
        this.path = path;
        this.usbVendorId = parseInt(vendorId, 16);
        this.usbProductId = parseInt(productId, 16);
    }

    /**
     * Returns a promise that resolves once the serial port is open and ready.
     * The timeout value specifies how long future calls to read() will wait
     * for data before throwing an exception
     */

    open(baud, timeout = 1) {
        this.decoder = new TextDecoder();
        this.encoder = new TextEncoder();
        this.timeout = timeout;
        return new Promise((resolve, reject) => {
            this.serial = new SerialPort(this.path, {baudRate: baud});
            this.serial.on('error', reject);
            this.serial.on('open', resolve);
        });
    }

    /**
     * Returns a promise that resolves once all output data has been written
     */
    flush() {
        return new Promise((resolve, reject) => {
            this.serial.drain(resolve);
        });
    }

    discardBuffers() {
        return new Promise((resolve, reject) => {
            this.serial.flush(resolve);
        });
    }

    /**
     * Returns a promise that resolves after some data has been written
     */
    write(data) {
        return new Promise((resolve, reject) => {
            const okayToProceed = this.serial.write(data);
            if(okayToProceed) {
                resolve();
            } else {
                this.serial.drain(resolve);
            }
        });
    }

    /**
     * Returns a promise which resolves when "len" bytes have been read.
     */
    read(len) {
        this.readStart = Date.now();
        const tryIt = (serial, resolve, reject) => {
            var result = this.serial.read(len);
            if(result) {
                resolve(result);
            } else if(!this.serial.isOpen) {
                reject(new SerialDisconnected("Serial port closed while waiting for data"));
            } else {
                if(Date.now() - this.readStart > this.timeout * 1000) {
                    reject(new SerialTimeout("Timeout expired while waiting for data"));
                } else {
                    // Using setTimeout here is crucial for allowing the I/O buffer to refill
                    setTimeout(() => tryIt(this.serial, resolve, reject), 0);
                }
            }
        }
        return new Promise((resolve, reject) => {
            tryIt(this.serial, resolve, reject);
        });
    }

    /**
     * Returns a line of text from the serial port.
     */
    async readline() {
        let line = "";
        while(true) {
            let c = this.decoder.decode(await this.read(1));
            switch(c) {
                case '\r': break;
                case '\n': return this.encoder.encode(line);
                default:   line += c;
            }
        }
    }

    /**
     * Returns a promise that resolves after a certain number of miliseconds.
     */
    wait(ms) {
        return new Promise((resolve, reject) => {setTimeout(resolve,ms);});
    }

    async close() {
        await this.serial.close();
        this.serial = null;
    }

    setDTR(value) {
        return new Promise((resolve, reject) => this.serial.set({dtr: value}, err => {if(err) reject(err); else resolve();}));
    }

    getInfo() {
        return {usbVendorId: this.usbVendorId, usbProductId: this.usbProductId};
    }

    static async getPorts() {
        const ports = await SerialPort.list();
        return ports.map(port => new SequentialSerial(port.path, port.vendorId, port.productId));
    }

    static isMatch(port, filters) {
        if(!filters || filters.length == 0) return true;
        for(const filter of filters) {
            if(filter.hasOwnProperty("usbProductId") && !filter.hasOwnProperty("usbVendorId")) {
                throw new TypeError("Filter must have usbVendorId if usbProductId is present");
            }
            if(filter.hasOwnProperty("usbVendorId")  && parseInt(port.vendorId, 16)  != filter.usbVendorId)  continue;
            if(filter.hasOwnProperty("usbProductId") && parseInt(port.productId, 16) != filter.usbProductId) continue;
            if(filter.hasOwnProperty("path")         && port.path                    != filter.path) continue;
            return true;
        }
        return false;
    }

    static async requestPort(filters) {
        const ports = await SerialPort.list();
        for(let port of ports) {
            if(SequentialSerial.isMatch(port, filters)) {
                return new SequentialSerial(port.path, port.vendorId, port.productId);
            }
        }
        throw new DOMException("No ports available");
    }
}

/************ Contents of "serial-tools/nodejs/SequentialSerial.mjs" ************/

window.SequentialSerial = SequentialSerial;
window.SerialTimeout = SerialTimeout;
window.SerialDisconnected = SerialDisconnected;
window.setPowerSaveEnabled = enabled => ipcRenderer.send('setPowerSaveEnabled', enabled);
window.setPrintInProgress = enabled => ipcRenderer.send('setPrintInProgress', enabled);
window.electronAppDownloadAndInstall = () => ipcRenderer.send('electronAppDownloadAndInstall');
window.isDesktop = true;

SequentialSerial.isWebSerial = false;