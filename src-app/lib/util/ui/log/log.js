/**
 *
 * @licstart
 *
 * Web Cura
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
 *
 * @licend
 *
 */

export class Log {
    static clear() {
        document.getElementById('console').innerHTML = '';
    }
    static show() {
        $("#log-dialog").show();
    }

    static hide() {
        $("#log-dialog").hide();
    }

    static writeArray(arr, style) {
        let el = document.getElementById('console');
        let atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 3;
        let pre = document.createElement('pre');
        if(style) pre.classList.add(style);
        pre.innerText = arr.join(' ');
        el.appendChild(pre);
        if(atBottom) {
            el.scrollTop = el.scrollHeight;
        }
    }

    static write(...str) {
        Log.writeArray(str);
    }

    static error(...str) {
        Log.writeArray(str, "error");
    }
}