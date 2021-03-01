/**
 * GCode Sender
 *
 * This code is a JavaScript port of Python code originally in LulzBot
 * Cura LE
 *
 * @licstart
 *
 * Copyright (C) 2017 Aleph Objects, Inc.
 * Copyright (C) 2020 SynDaver Labs, Inc.
 *
 * The code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * @licend
 *
 * Marlin implements an error correcting scheme on the serial connection.
 * GCode commands are sent with a line number and a checksum. If Marlin
 * detects an error, it requests that the transmission resume from the
 * last known good line number.
 *
 * In addition to this resend mechanism, Marlin also implements flow
 * control. Sent commands are acknowleged by "ok" when complete.
 * However, to optimize path planning, Marlin contains a command
 * buffer and slicing software should send enough commands to keep
 * that buffer filled (minus a reserve capacity for emergency commands
 * such as an emergency STOP). It is thus necessary to send a certain
 * number prior the earlier ones being acknowleged and to track how
 * many commands have been sent but not yet acknowleged.
 *
 * The class MarlinSerialProtocol implements error correction and
 * flow control. Occasionally an "ok" from Marlin is garbled during
 * serial transmission. This class also implements a watchdog timer
 * to recover from such errors.
 *
 * Note: Marlin does not implement a well defined protocol, so there
 * is a lot of complexity here to deal with corner cases.
 *
 * The prototypical use case for this class is as follows:
 *
 *   for (line in enumerate(gcode)) {
 *     serial.sendCmdLine(line)
 *     while(!serial.clearToSend()) {
 *       serial.readline()
 *     }
 *   }
 *
 */

class time {
    static time() {
        const now = new Date()
        return Math.round(now.getTime() / 1000);
    }

    static sleep(seconds) {
        return new Promise((resolve, reject) => {setTimeout(resolve,seconds*1000);});
    }
}

export class GCodeHistory {
    /**
     * This class implements a history of GCode commands. Right now, we
     * keep the entire history, but this probably could be reduced to a
     * smaller range if memory use becomes an issue. This class keeps a
     * pointer to the position of the first unsent command, which typically
     * is the one just recently added, but after a resend request from
     * Marlin that position can rewound further back.
     */
    constructor() {
        this.clear();
    }

    clear() {
        this.list = [null]; // Pad so the first element is at index 1
        this.pos  = 1;
    }

    append(cmd) {
        this.list.push(cmd);
    }

    rewindTo(position) {
        this.pos = Math.max(1,Math.min(position, this.list.length));
    }

    getAppendPosition() {
        // Returns the position at which the next append will happen
        return this.list.length;
    }

    getNextCommand() {
        // Returns the next unsent command.
        if(!this.atEnd()) {
            let res = [this.pos, this.list[this.pos]]
            this.pos += 1;
            return res;
        }
    }

    atEnd() {
        return this.pos == this.list.length
    }

    linesLeft() {
        return this.list.length - this.pos;
    }

    position() {
        return this.pos;
    }

    lastLineSent() {
        return this.pos - 1;
    }
}

export class MarlinSerialProtocol {
    /**
     * This class implements the Marlin serial protocol, such
     * as adding a checksum to each line, replying to resend
     * requests and keeping the Marlin buffer full
     */
    async open(serial) {
        this.serial                 = serial;
        this.marlinBufSize          = 5;
        this.marlinReserve          = 1;
        this.marlinAvailBuffer      = this.marlinBufSize;
        this.marlinPendingCommands  = 0;
        this.history                = new GCodeHistory();
        this.asap                   = [];
        this.slowCommands           = /M109|M190|G28|G29|G425/;
        this.slowTimeout            = 300;
        this.fastTimeout            = 15;
        this.usingAdvancedOk        = false;
        this.watchdogTimeout        = time.time();
        this.resyncCount             = 0;
        this.encoder                = new TextEncoder();
        this.decoder                = new TextDecoder();
        await this.restart();
    }

    _stripCommentsAndWhitespace(str) {
        return str.split(';', 1)[0].trim();
    }

    _replaceEmptyLineWithM105(str) {
        // Marlin will not accept empty lines, so replace blanks with M115 (Get Extruder Temperature)
        return str == "" ? "M105" : str;
    }

    _computeChecksum(data) {
        // Computes the GCODE checksum, this is the XOR of all characters in the payload, including the position
        let checksum = 0;
        for(let i = 0; i < data.length; i++) {
                checksum ^= data.charCodeAt(i);
        }
        return checksum;
    }

    _addPositionAndChecksum(position, cmd) {
        // An GCODE with line number and checksum consists of N{position}{cmd}*{checksum}
        const payload = "N" + position + cmd;
        return payload + "*" + this._computeChecksum(payload);
    }

    async _sendImmediate(cmd) {
            this._adjustStallWatchdogTimer(cmd);
            await this.serial.write(this.encoder.encode(cmd + '\n'));
            await this.serial.flush();
            this.marlinPendingCommands += 1;
            this.marlinAvailBuffer     -= 1;
    }

    async _sendToMarlin() {
        /**
         * Sends as many commands as are available and to fill the Marlin buffer.
         * Commands are first read from the asap queue, then read from the
         * history. Generally only the most recently history command is sent;
         * but after a resend request, we may be further back in the history
         * than that
         */
        while(this.asap.length && this.marlinBufferCapacity() > 0) {
            let cmd = this.asap.shift();
            await this._sendImmediate(cmd);
        }
        while(!this.history.atEnd() && this.marlinBufferCapacity() > 0) {
            let [pos, cmd] = this.history.getNextCommand();
            await this._sendImmediate(cmd);
            if (this.marlinBufferCapacity() > 0) {
                // Slow down refill of Marlin buffer, as sending multiple commands
                // in a large burst can cause additional serial errors
                await time.sleep(0.01)
            }
        }
    }

    _isResendRequest(line) {
        // If the line is a resend command from Marlin, returns the line number. This
        // code was taken from Cura 1, I do not know why it is so convoluted.
        if (line.toLowerCase().indexOf("resend") != -1 || line.indexOf("rs") != -1) {
            try {
                return parseInt(line.replace("N:"," ").replace("N"," ").replace(":"," ").split(/\s+/).slice(-1)[0]);
            } catch(e) {
                if (line.indexOf("rs") != -1) {
                    try {
                        return parseInt(line.split(/\s+/)[1]);
                    } catch(e) {
                        return null;
                    }
                }
            }
        }
    }

    _isNoLineNumberErr(line) {
        // If Marlin encounters a checksum without a line number, it will request
        // a resend. This often happens at the start of a print, when a command is
        // sent prior to Marlin being ready to listen.
        if (line.startsWith("Error:No Line Number with checksum")) {
            let m = line.match("Last Line: (\d+)");
            if(m) {
                return parseInt(m[1]) + 1;
            }
        }
    }

    async _resetMarlinLineCounter() {
        // Sends a command requesting that Marlin reset its line counter to match
        // our own position

        let cmd = this._addPositionAndChecksum(this.history.lastLineSent(), "M110");
        await this._sendImmediate(cmd);
    }

    async _stallWatchdog(line) {
        // Watches for a stall in the print. This can happen if a number of
        // okays are lost in transmission. To recover, we send Marlin an invalid
        // command (no line number, with an asterisk). Once it requests a resend,
        // we will back into a known good state (hopefully!)
        if (this.marlinPendingCommands > 0) {
            if (time.time() > this.watchdogTimeout) {
                this.marlinAvailBuffer     = this.marlinReserve + 1;
                this.marlinPendingCommands = 0;
                await this._sendImmediate("\nM105*\n");
                this.sendNotification("Timeout. Forcing a re-sync.");
                this.resyncCount++;
                if(this.onResyncCallback) {
                    this.onResyncCallback(this.resyncCount);
                }
            } else if (line == "") {
                let timeoutIn = this.watchdogTimeout - time.time();
                if (timeoutIn != this.lastTimeoutMessage) {
                    this.lastTimeoutMessage = timeoutIn;
                    this.sendNotification("Timeout. Re-sync in " + timeoutIn + " seconds");
                }
            } else {
                this.resyncCount = 0;
            }
        }
    }

    _adjustStallWatchdogTimer(cmd) {
        // Adjusts the stallWatchdogTimer based on the command which is being sent
        let estimated_duration = this.slowCommands.test(cmd) ? this.slowTimeout : this.fastTimeout;
        this.watchdogTimeout = Math.max(this.watchdogTimeout, time.time() + estimated_duration);
    }

    _resendFrom(position) {
        // If Marlin requests a resend, we need to backtrack.
        this.history.rewindTo(position);
        this.marlinPendingCommands = 0;
        if (!this.usingAdvancedOk) {
            // When not using ADVANCED_OK, we have no way of knowing
            // for sure how much buffer space is available, but since
            // Marlin requested a resent, assume the buffer was cleared
            this.marlinAvailBuffer = this.marlinBufSize;
        } else {
            // When using ADVANCED_OK, assume only one slot is free
            // for the next resent command. As soon as that command is
            // acknowleged, we will be informed of how many buffer slots
            // are actually free.
            this.marlinAvailBuffer = this.marlinReserve + 1;
        }
        if(this.onResendCallback) {
            this.onResendCallback(position);
        }
    }

    async _flushReadBuffer() {
        try {
            while(await this.serial.readline() != "") {
                // Skip
            }
        } catch {
            console.log("Timeout in flush");
        }
    }

    sendCmdReliable(line) {
        let cmd;

        // Adds command line (can contain comments or blanks) to the queue for reliable
        // transmission. Queued commands will be processed during calls to readLine() or
        // clearToSend(). A checksum will be added for reliable transmission and Marlin
        // will be allowed to request a resend of commands that are incorrectly received.
        line = this._stripCommentsAndWhitespace(line);
        cmd = this._replaceEmptyLineWithM105(line);
        cmd = this._addPositionAndChecksum(this.history.getAppendPosition(), cmd);
        this.history.append(cmd);
    }

    sendCmdUnreliable(line) {
        // Sends a command (can contain comments or blanks) prior to any other
        // history commands. Commands will be processed during calls to
        // readLine() or clearToSend(). These commands are sent without a
        // checksum, so Marlin will not request resends if the command is
        // corrupted. Unreliable transmission is appropriate for manual
        // interactive commands from an UI that is not part of a print.
        let cmd = this._stripCommentsAndWhitespace(line);
        if (cmd) {
            this.asap.push(cmd);
        }
    }

    async sendCmdEmergency(line) {
        // Sends an command (can contain comments or blanks) without regards for Marlin buffer.
        // This assumes there are reserved locations in the Marlin buffer for such commands.
        let cmd = this._stripCommentsAndWhitespace(line);
        if (cmd) {
            await this._sendImmediate(cmd);
        }
    }

    sendNotification(msg) {
        if (this.onDebugMsgCallback) {
            this.onDebugMsgCallback(msg);
        }
    }

    _gotOkay(line) {
        let m = line.match(/ok N(\d+) P(\d+) B(\d+)/);
        if (m) {
            // If ADVANCED_OK is enabled in Marlin, we can use that
            // info to correct our estimate of many free slots are
            // available in the Marlin command buffer.
            let lastLineSeen  = parseInt(m[1]);
            let buffAvailable = parseInt(m[3]);
            this.marlinPendingCommands = Math.max(0, this.history.lastLineSent() - lastLineSeen);
            this.marlinAvailBuffer     = Math.min(this.marlinBufSize, buffAvailable) - this.marlinPendingCommands;
            if (!this.usingAdvancedOk) {
                this.usingAdvancedOk = true;
                this.sendNotification("Marlin supports ADVANCED_OK");
            }
        } else {
            // Otherwise, assume each "ok" frees up a single spot in
            // the Marlin buffer.
            this.marlinAvailBuffer     += 1;
            this.marlinPendingCommands -= 1;
        }
    }

    async _readline(blocking) {
        // Reads input from Marlin
        let line;
        if(blocking || this.serial.in_waiting) {
            try {
                line = await this.serial.readline();
                line = this.decoder.decode(line).trim();
            } catch (e) {
                if(e instanceof SerialTimeout) {
                    line = "";
                    console.log("Timeout in readline");
                } else {
                    throw e;
                }
            }
        } else {
            line = "";
        }

        if (line.indexOf("busy: processing") != -1) {
            this._adjustStallWatchdogTimer("busy");
        }

        if (line.startsWith("ok")) {
            this._gotOkay(line);
        }

        // Sometimes Marlin replies with an "Error:", but not an "ok".
        // So if we got an error, followed by a timeout, stop waiting
        // for an "ok" as it probably ain't coming
        if (line.startsWith("ok")) {
            this.gotError = false;
        }
        else if (line.startsWith("Error:")) {
            this.gotError = true;
        } else if (line == "" && this.gotError) {
            this.gotError = false;
            this._gotOkay(line);
        }

        return line;
    }

    async readline(blocking = true) {
        // This reads data from Marlin. If no data is available '' will be returned.
        // Unlike _readline, this function will take care of resend requests from Marlin.

        await this._sendToMarlin();

        let line = await this._readline(blocking);
        line = line.trim();

        // Watch for and attempt to recover from complete stalls.
        this._stallWatchdog(line);

        // Handle resend requests from Marlin. This happens when Marlin
        // detects a command with a checksum or line number error.
        let resendPos = this._isResendRequest(line) || this._isNoLineNumberErr(line);
        if (resendPos) {
            // If we got a resend requests, purge lines until input buffer is empty
            // or timeout, but watch for any subsequent resend requests (we must
            // only act on the last).
            while (line != "") {
                line = await this._readline(false);
                resendPos = this._isResendRequest(line) || this._isNoLineNumberErr(line) || resendPos;
            }
            // Process the last received resend request:
            if (resendPos > this.history.position()) {
                // If Marlin is asking us to step forward in time, reset its counter.
                await this._resetMarlinLineCounter();
            }
            else {
                // Otherwise rewind to where Marlin wants us to resend from.
                await this._resendFrom(resendPos);
            }
            // Report a timeout to the calling code.
            line = "";
        }

        return line;
    }

    async clearToSend() {
        // Returns true if there is any space available for new commands, once previously
        // queued commands are sent"""
        await this._sendToMarlin();
        return this.marlinBufferCapacity() > 0;
    }

    marlinBufferCapacity() {
        // Returns how many buffer positions are open in Marlin, excluding reserved locations.
        return this.marlinAvailBuffer - this.marlinReserve;
    }

    isPrinting() {
        return this.asap.length > 0 || !this.history.atEnd();
    }

    async sendScriptUnreliable(gcode) {
        if(gcode) {
            for(const line of gcode.split(/\r?\n/)) {
                await this.sendCmdUnreliable(line);
            }
        }
    }

    async abortPrint(gcode) {
        this.history.clear();
        await this.sendScriptUnreliable(gcode);
        await this.waitUntilQueueEmpty();
    }

    // Call this after all commands have been sent, but
    // before closing the serial port, to allow queued
    // commands to be sent.
    async finishPrint() {
        await this.waitUntilQueueEmpty();
    }

    async waitUntilQueueEmpty() {
        while(this.isPrinting()) {
            await this.readline();
        }
    }

    async restart() {
        // Clears all buffers and issues a M110 to Marlin. Call this at the start of every print.
        this.history.clear();
        this.stallCountdown        = this.fastTimeout;
        this.gotError              = false;
        this.marlinPendingCommands = 0;
        this.marlinAvailBuffer     = this.marlinBufSize;
        await this.serial.write('\n');
        await this.serial.flush();
        await this._flushReadBuffer();
        await this._resetMarlinLineCounter();
    }

    async close() {
        await this.serial.close();
    }

    // Event handlers (may be overriden by users):
    onResendCallback()         {}
    onDebugMsgCallback(msg)    {}
    onResyncCallback(count)    {}
}