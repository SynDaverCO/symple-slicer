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

/************ Contents of "serial-tools/nodejs/SequentialSerial.mjs" ************/

class SequentialSerial {

    constructor() {
        this.decoder = new TextDecoder();
        this.encoder = new TextEncoder();
    }

    /**
     * Returns a promise that resolves once the serial port is open and ready.
     * The timeout value specifies how long future calls to read() will wait
     * for data before throwing an exception
     */

    open(port, baud, timeout = 1) {
        this.timeout = timeout;
        return new Promise((resolve, reject) => {
            this.serial = new SerialPort(port, {baudRate: baud});
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
            } else {
                if(Date.now() - this.readStart > this.timeout * 1000) {
                    reject("SerialTimeout");
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

    /**
     * Returns a promise that resolves to a list of available ports.
     */
    static getPorts(filter) {
        return SerialPort.list();
    }

    static async matchPorts(filter) {
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
}

/************ Contents of "serial-tools/nodejs/SequentialSerial.mjs" ************/

window.SequentialSerial = SequentialSerial;