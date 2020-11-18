/**
 * AuthenticatedRequest
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

class AuthenticatedRequest {
    /**
     * Does an authenticated request to the SynDaver WiFi Module.
     * The protocol is meant to provide authentication, not
     * confidentiality. The goal is to ensure that a print can
     * only be started if the user knows the printer's password
     * to prevent a malicious user from sending files intended to
     * damage the printer or cause fires.
     *
     * The protocol is thought to be resistant to impersonation,
     * man-in-the-middle and replay attacks. It consists of the
     * following process:
     *
     *  - The client does a GET request to "http://baseUrl/status"
     *  - The host generates a random 32-bit number and returns it
     *    in the "nonce" attribute of a JSON response
     *  - The host will use the ESP32 hardware random number generator
     *    for the nonce.
     *  - The client generates a preamble that consists of the HTTP
     *    method, the cannonical URL path, the nonce as a decimal and
     *    newline, i.e: "PUT /file.gco 1118992010\n"
     *  - The client concatenates the preamble and request body and
     *    generates a SHA256 HMAC over the data using the end-user
     *    entered password
     *  - The client submits the file using PUT or POST with an
     *    Authorization header of type "SYN1-HMAC-SHA256" and the
     *    first 32 characters of the hexadecimal HMAC.
     *  - The host saves the file to the local SD card and then
     *    generates an HMAC over the file contents and the nonce
     *    using the password saved on the printer.
     *  - If the generated HMAC matches the HMAC uploaded by the
     *    client, the authentication succeeds and the print starts.
     *  - Immediately, a new nonce is generated for the next upload.
     *  - If the generated HMAC does not match, the file is
     *    discarded. This can be caused by an incorrect password,
     *    a corrupted upload or the use of an outdated nonce by
     *    the client.
     *  - In the case of authentication failure, the nonce remains
     *    unchanged.
     *
     * The HTTP methods GET and DELETE are similar, except that no
     * file data is transmitted and the HMAC is computed only over
     * the nonce.
     */

    static async signAndSendRequest(options, method, payload) {
        let status = await this.getJSON(options.statusUrl);
        if(status.protocol && status.protocol >= 1) {
            // New protocol, use Authorization header with 128 bit HMAC
            let preamble = method + " " + this.cannonicalResource(options.methodUrl) + " " + status.nonce + "\n";
            let hmac = await this.sign(options.password, preamble, payload);
            if(options.onSignatureReady) {
                options.onSignatureReady(hmac);
            }
            this.validateUrl(options.methodUrl);
            await this.fetchXHR(options.methodUrl, {
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

    static async doPut(options) {
        let payload = options.file ? await this.fileToArrayBuffer(options.file) : null;
        await this.signAndSendRequest(options, "PUT", payload);
    }

    static async doPost(options) {
        let payload = options.file ? await this.fileToArrayBuffer(options.file) : null;
        await this.signAndSendRequest(options, "POST", payload);
    }

    static async doDelete(options) {
        await this.signAndSendRequest(options, "DELETE", null);
    }

    static async doGet(options) {
        await this.signAndSendRequest(options, "GET", null);
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
                    if(data && data.onProgress) {
                       data.onProgress(100);
                    }
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

    static fetchWithTimeout (url, options, timeout = 3000) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), timeout)
            )
        ]);
    }

    // Fetches JSON data from an URL
    static async getJSON(url) {
        let response = await this.fetchWithTimeout(url);
        return await response.json();
    }

    // Returns a promise that reads a file into an ArrayBuffer
    static fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            try {
                let reader = new FileReader();
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
        let status    = await this.getJSON(options.statusUrl);
        let hmac      = await this.sign_legacy(payload, options.password, status.nonce);
        if(options.onSignatureReady) {
            options.onSignatureReady(hmac);
        }
        let url = options.methodUrl + (options.methodUrl.indexOf('?') != -1 ? "&" : "?") + "hmac=" + hmac;
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