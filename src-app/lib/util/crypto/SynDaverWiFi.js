/**
 * SynDaverWiFi.js
 * Copyright (C) 2020  SynDaver Labs, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Does an authenticated request to the SynDaver WiFi Module
 * by signing the request with an HMAC to prevent a malicious
 * user, who does not know the printer's password, from sending
 * files intended to damage the printer or cause fires.
 *
 * Prerequisites:
 *     sjcl/sjcl.min.js
 *     sjcl/codecArrayBuffer.js
 */
class AuthenticatedRequest {
    static async signAndSendRequest(options, method, payload) {
        const status = await this.getJSON(options.statusUrl);
        if(status.protocol && status.protocol >= 1) {
            // New protocol, use Authorization header with 128 bit HMAC
            const preamble = method + " " + this.cannonicalResource(options.methodUrl) + " " + status.nonce + "\n";
            const hmac = await this.sign(options.password, preamble, payload);
            if(options.onSignatureReady) {
                options.onSignatureReady(hmac);
            }
            this.validateUrl(options.methodUrl);
            return await this.fetchXHR(options.methodUrl, {
                method: method,
                body: payload,
                onProgress: options.onProgress,
                authorization: "SYN1-HMAC-SHA256 " + hmac.substring(0, 32) // Truncate HMAC to 128 bits
            });
        } else {
            // Legacy protocol, use hmac query parameter with 256 bit HMAC
            await this.signAndSendRequest_legacy(options, method, payload);
        }
    }

    /**
     * Generates an HMAC using the password, preamble and file's content
     */
    static async sign(passwd, preamble, arrayBuffer) {
        let msgBits = sjcl.codec.utf8String.toBits(preamble);
        if(arrayBuffer) {
            const arrayBits = sjcl.codec.arrayBuffer.toBits(arrayBuffer);
            arrayBuffer = null;
            msgBits = sjcl.bitArray.concat(msgBits, arrayBits);
        }
        const pwdBits = sjcl.codec.utf8String.toBits(passwd);
        const h = new sjcl.misc.hmac(pwdBits);
        const hmacBits = h.encrypt(msgBits);
        return sjcl.codec.hex.fromBits(hmacBits);
    }

    static cannonicalResource(url) {
        const parser = document.createElement('a');
        parser.href = url;
        return parser.pathname + parser.search;
    }

    // The ESP32 HTTPS library puts a limit on the length of the URL.
    static validateUrl(url) {
        const HTTPS_REQUEST_MAX_REQUEST_LENGTH = 128;
        const request = "OPTIONS " + this.cannonicalResource(url) + " HTTP/1.1";
        if(request.length > HTTPS_REQUEST_MAX_REQUEST_LENGTH) {
            throw Error("This request cannot be processed. The path is too long.");
        }
    }

    static async doUpload(options, method = "PUT") {
        const payload = options.file ? await this.fileToArrayBuffer(options.file) : null;
        await this.signAndSendRequest(options, method, payload);
    }

    static async doPut(options) {
        await this.doUpload(options, "PUT");
    }

    static async doPost(options) {
        await this.doUpload(options, "POST");
    }

    static async doDelete(options) {
        await this.signAndSendRequest(options, "DELETE", null);
    }

    static async doGet(options) {
        return await this.signAndSendRequest(options, "GET", null);
    }

    /**
     * This fetchXHR method wraps an XMLHttpRequest object in a promise and acts as a
     * replacement for the browser method fetch(). Unlike the native fetch(), this
     * allows an on progress method to be passed via data.onProgress
     */
    static fetchXHR(url, data) {
        return new Promise ((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const evtHandler = (data.method == "POST" || data.method == "PUT") ? xhr.upload : xhr;

            if(data && data.onProgress) {
                evtHandler.addEventListener("progress", evt => {
                    if (evt.lengthComputable) {
                        data.onProgress(evt.loaded, evt.total)
                    } else {
                        data.onProgress(evt.loaded)
                    }
                }, false);
                data.onProgress(0);
            }
            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else {
                    console.error("Error: ", xhr.status, xhr.statusText);
                    reject(xhr.statusText);
                }
                resolve();
            });
            xhr.addEventListener("error", () => {reject(xhr.statusText);});
            xhr.open((data && data.method) || "GET", url);
            if(data.authorization) {
                xhr.setRequestHeader("Authorization", data.authorization);
            }
            xhr.send(data.body);
        });
    }

    static async fetchWithTimeout (url, options, timeout = 3000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal  
        });
        clearTimeout(id);
        return response;
    }

    // Fetches JSON data from an URL, with a timeout
    static async getJSON(url) {
        const response = await AuthenticatedRequest.fetchWithTimeout(url);
        return await response.json();
    }

    // Returns a promise that reads a file into an ArrayBuffer
    static fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onloadend = evt => {
                    if (evt.target.readyState == FileReader.DONE && evt.target.result) {
                        resolve(evt.target.result);
                    } else {
                        reject(new Error("Unable to read file"));
                    }
                }
            }
            catch (e) {
                reject(e);
            }
        })
    }

    // Legacy protocol support, should be removed at some point

    static async signAndSendRequest_legacy(options, method, payload) {
        const status    = await this.getJSON(options.statusUrl);
        const hmac      = await this.sign_legacy(payload, options.password, status.nonce);
        if(options.onSignatureReady) {
            options.onSignatureReady(hmac);
        }
        const url = options.methodUrl + (options.methodUrl.indexOf('?') != -1 ? "&" : "?") + "hmac=" + hmac;
        this.validateUrl(url);
        await this.fetchXHR(url, {
            method: method,
            body: payload,
            onProgress: options.onProgress
        });
    }

    /**
     * Generates an HMAC using the file's content, password and optional
     * nonce value.
     */
    static async sign_legacy(arrayBuffer, passwd, nonce) {
        let msgBits = sjcl.codec.arrayBuffer.toBits(arrayBuffer);
        arrayBuffer = null;
        if(nonce) {
            const nonceBuffer = new ArrayBuffer(4);
            const nonceView = new Uint32Array(nonceBuffer);
            nonceView[0] = nonce;
            const nonceBits = sjcl.codec.arrayBuffer.toBits(nonceBuffer);
            msgBits = sjcl.bitArray.concat(msgBits, nonceBits);
        }
        const pwdBits = sjcl.codec.utf8String.toBits(passwd);
        const h = new sjcl.misc.hmac(pwdBits);
        const hmacBits = h.encrypt(msgBits);
        return sjcl.codec.hex.fromBits(hmacBits);
    }
}

// Implements the specific requests implemented by "SynDaver WiFi.ino"
class SynDaverWiFi {
    static setHostname(host) {
        SynDaverWiFi.host = host;
    }

    static setPassword(pass) {
        SynDaverWiFi.pass = pass;
    }

    static onProgress(callback) {
        SynDaverWiFi.prog = callback;
    }

    static getAbsoluteUrl(url) {
        return SynDaverWiFi.host + url;
    }

    static async status() {
        return await AuthenticatedRequest.getJSON(SynDaverWiFi.host + "/status");
    }

    static async listFiles(path) {
        const url = SynDaverWiFi.host + path + "?list";
        const response = await AuthenticatedRequest.fetchWithTimeout(url);
        if (!response.ok || response.headers.get("Content-Type") != "text/json") return;
        return await response.json();
    }

    static async isPrinting(status) {
        const json = status || await SynDaverWiFi.status();
        return json.state == "printing" || json.state == "paused";
    }

    static async numberOfJobs(status) {
        const json = status || await SynDaverWiFi.status();
        return json.jobsWaiting + ((json.state == "printing" || json.state == "paused") ? 1 : 0);
    }

    static async getFile(path) {
        return await AuthenticatedRequest.doGet({
            statusUrl:        SynDaverWiFi.host + "/status",
            methodUrl:        SynDaverWiFi.host + "/" + path,
            password:         SynDaverWiFi.pass
        });
    }

    static async printFile(path) {
        await AuthenticatedRequest.doGet({
            statusUrl:        SynDaverWiFi.host + "/status",
            methodUrl:        SynDaverWiFi.host + "/print?path=" + path,
            password:         SynDaverWiFi.pass
        });
    }

    static async uploadFile(file, path, method = "POST") {
        await AuthenticatedRequest.doUpload({
            statusUrl:        SynDaverWiFi.host + "/status",
            methodUrl:        SynDaverWiFi.host + path,
            password:         SynDaverWiFi.pass,
            onProgress:       bytes => SynDaverWiFi.prog(bytes, file.size),
            file:             file
        }, method);
    }
    
    static async uploadFiles(files, method = "POST") {
        let totalBytes = 0;
        let completedBytes = 0;
        for(const file of files) {
            totalBytes += file.size;
        }
        for(const file of files) {
            await AuthenticatedRequest.doUpload({
                statusUrl:        SynDaverWiFi.host + "/status",
                methodUrl:        SynDaverWiFi.host + "/" + file.name,
                password:         SynDaverWiFi.pass,
                onProgress:       bytes => SynDaverWiFi.prog(completedBytes + bytes, totalBytes),
                file:             file
            }, method);
            completedBytes += file.size;
        }
    }

    static async deleteFile(path) {
        await AuthenticatedRequest.doDelete({
            statusUrl:        SynDaverWiFi.host + "/status",
            methodUrl:        SynDaverWiFi.host + path,
            password:         SynDaverWiFi.pass
        });
    }

    static async makeDirectory(path) {
        await AuthenticatedRequest.doPut({
            statusUrl:        SynDaverWiFi.host + "/status",
            methodUrl:        SynDaverWiFi.host + path + "/",
            password:         SynDaverWiFi.pass
        });
    }

    static async reboot() {
        await SynDaverWiFi.getFile("reboot");
    }

    static async pausePrint() {
        await SynDaverWiFi.getFile("pause");
    }

    static async stopPrint() {
        await SynDaverWiFi.getFile("stop");
    }

    static async resumePrint() {
        await SynDaverWiFi.getFile("resume");
    }

    static async webSocketAllowControl() {
        await SynDaverWiFi.getFile("ws_config?allow_control=1");
    }

    // Helper methods for creating file objects for uploading

    static fileFromFile(fileName, file) {
        const blob = file.slice(0, file.size, file.type);
        return SynDaverWiFi.fileFromBlob(fileName, blob);
    }

    static fileFromBlob(fileName, blob) {
        return new File([blob], fileName, {type: blob.type});
    }

    static fileFromStr(fileName, str) {
        return new File([str], fileName, {type: "text/plain"});
    }

    static async fileFromUrl(fileName, url) {
        let fw = await fetch(url);
        let blob = await fw.blob();
        return SynDaverWiFi.fileFromBlob(fileName, blob);
    }
}