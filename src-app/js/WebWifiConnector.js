/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
 * Copyright (C) 2020  SynDaver Labs, Inc.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

// This class allows sending jobs to the wireless module via postMessage,
// when otherwise a direct connection would be a forbidden CORS request.

class WebWifiConnector {
    static postMessageToTab(addr, message) {
        const url = "http://" + addr;
        const target = window.open(url, "syndaver_wireless");
        if(target) {
            this.postMessageAndExpectReply(target, url, message);
        } else {
            alert('Please make sure your popup blocker is disabled and try again.');
        }
    }

    static postMessageAsEmbed(addr, message) {
        if(location.protocol != "http:") {
            // If we are served as HTTPS, we cannot open an iframe
            // to an HTTP resource, so open a tab instead.
            return this.postMessageToTab(addr, message);
        }
        const url = "http://" + addr;
        let target = document.querySelector('iframe[src="' + url + '"]');
        if(!target) { 
            target = document.createElement("iframe");
            target.src = url;
            target.style.display = "none";
            document.body.appendChild(target);
            console.log("Creating new iframe to interact with printer");
        } else {
            console.log("Using existing iframe to interact with printer");
        }
        this.postMessageAndExpectReply(target.contentWindow, url, message, () => target.remove());
    }

    static postMessageAndExpectReply(dest, url, message, timeoutCallback) {
        function replyTimeout() {
            ProgressBar.hide();
            alert('No reply from printer. Please verify the network settings under "Wireless Printing" and then click "Manage..." to test connectivity.');
            if(timeoutCallback) timeoutCallback();
        }
        setTimeout(() => dest.postMessage(message, url), 3000);
        this.timeoutId = setTimeout(replyTimeout, 10000);
    }

    static gotReply() {
        clearTimeout(this.timeoutId);
    }
}