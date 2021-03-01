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


class WebWifiConnector {
    static postMessageToPopup(addr, message) {
        const url = "http://" + addr;
        const msg = "A web browser tab will be opened to your printer.\nIn the new tab, you will be asked to allow interaction to your printer; click OK to allow."
        if(confirm(msg)) {
            const target = window.open(url, "syndaver_wireless");
            if(target) {
                setTimeout(() => target.postMessage(message, url), 3000);
            } else {
                alert('Please make sure your popup blocker is disabled and try again.');
            }
        }
    }

    static postMessageAsEmbed(addr, message) {
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
        setTimeout(() => target.contentWindow.postMessage(message, url), 3000);
    }
}