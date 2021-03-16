/**
 * SerialTools
 * Copyright (C) 2020 SynDaver Labs, Inc.
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

if (!window.SequentialSerial && "serial" in navigator) {
    class SerialTimeout extends Error {}
    class SerialDisconnected extends Error {}

    class SequentialSerial {

        constructor(port) {
            this.serial = port;
        }

        /**
         * Returns a promise that resolves once the serial port is open and ready.
         * The timeout value specifies how long future calls to read() will wait
         * for data before throwing an exception
         */

        async open(baud, timeout = 5) {
            this.decoder = new TextDecoder();
            this.encoder = new TextEncoder();
            this.timeout = timeout;
            await this.serial.open({baudRate: baud, bufferSize: 65536});
            this.writer = this.serial.writable.getWriter();
            this.reader = this.serial.readable.getReader();
            this.readBytes = [];
            this.readIndex = 0;
        }

        async close() {
            if(this.reader) {
                await this.writer.releaseLock();
                await this.reader.releaseLock();
                await this.serial.close();
                this.reader = null;
                this.writer = null;
            }
        }

        /**
         * Returns a promise that resolves once all output data has been written
         */
        async flush() {
            if(this.reader) {
                await this.writer.ready;
                await this.writer.close();
                this.writer = this.serial.writable.getWriter();
            }
        }

        async discardBuffers() {
            this.readBytes = [];
            this.readIndex = 0;
            await this.reader.close();
            this.reader = this.serial.readable.getReader();
        }

        toUint8Array(data) {
            let type = Array.isArray(data) ? "array" : typeof data;
            switch(type) {
                case "array":  return Uint8Array.from(data);
                case "string": return this.encoder.encode(data);
                case "object": if(data instanceof Uint8Array) return data;
            }
            console.error("Tried to write unknown type to serial port:", typeof data, data);
        }

        /**
         * Returns a promise that resolves after some data has been written
         */
        write(data) {
            data = this.toUint8Array(data);
            return this.writer.write(data);
        }

        getTimeoutPromise() {
            if(this.timeout) {
                return new Promise(
                    (resolve, reject) =>
                        this.timeoutId = setTimeout(
                            () => reject(new SerialTimeout("Timeout expired while waiting for data")),
                            this.timeout * 1000
                        )
                );
            }
        }

        /**
         * Returns a promise which resolves when "len" bytes have been read.
         */
        async read(len) {
            const timeoutPromise = this.getTimeoutPromise();
            const dst = new Uint8Array(len);
            for(let i = 0; i < len;) {
                if(this.readIndex == this.readBytes.length) {
                    if(!this.readPromise) {
                        this.readPromise = this.reader.read();
                    }
                    const bothPromise = timeoutPromise ? Promise.race([this.readPromise, timeoutPromise]) : this.readPromise;
                    const { value, done } = await bothPromise;
                    this.readPromise = null;
                    if (done) {
                        // Allow the serial port to be closed later.
                        clearTimeout(this.timeoutId);
                        this.reader.releaseLock();
                        throw new SerialDisconnected("Serial port closed while waiting for data");
                    }
                    this.readBytes = value;
                    this.readIndex = 0;
                }
                dst[i++] = this.readBytes[this.readIndex++];
            }
            clearTimeout(this.timeoutId);
            return dst;
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
            return new Promise((resolve, reject) => setTimeout(resolve,ms));
        }

        setDTR(value) {
            return this.serial.setSignals({ dataTerminalReady: value });
        }

        getInfo() {
            return this.serial.getInfo();
        }

        /**
         * Returns a promise that resolves to a list of available ports.
         */
        static async getPorts() {
            const ports = await navigator.serial.getPorts();
            return ports.map(p => new SequentialSerial(p));
        }

        static async requestPort(filters) {
            const port = await navigator.serial.requestPort({filters});
            return new SequentialSerial(port);
        }
    }

    // Functionality for preventing machine sleep

    let wakeLock;
    let isPrinting;
    async function setPowerSaveEnabled(enable) {
        if('wakeLock' in navigator) {
            if(enable) {
                try {
                    wakeLock = await navigator.wakeLock.request();
                } catch (err) {
                    console.error(`${err.name}, ${err.message}`);
                }
            } else if(wakeLock) {
                wakeLock.release();
            }
        }
    };

    document.addEventListener('visibilitychange', async () => {
        if(document.visibilityState === 'visible') {
            if (wakeLock !== null) {
                await setPowerSaveEnabled(true);
            }
        }
    });

    window.SequentialSerial    = SequentialSerial;
    window.SerialTimeout       = SerialTimeout;
    window.SerialDisconnected  = SerialDisconnected;
    window.setPowerSaveEnabled = setPowerSaveEnabled;
    window.setPrintInProgress  = enabled => {isPrinting = enabled};

    SequentialSerial.isWebSerial = true;
}

var hasSerial = "SequentialSerial" in window;