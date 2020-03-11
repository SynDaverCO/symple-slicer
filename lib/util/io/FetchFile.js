/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
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

/* Fetches a file from an URL, then calls the function callback
 * when the file download is complete
 */
function fetchFile(url, callback, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onreadystatechange = function(e) {
        if (xhr.readyState == 4) {
            // continue only if HTTP status is "OK"
            if (xhr.status == 200) {
                callback(xhr.response);
            } else {
                onerror(xhr.status);
            }
        }
    };
    xhr.send();
}

/* Fetches a JSON file from an URL, then calls the function callback
 * when the file download is complete
 */
function fetchJSON(url, callback, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function(e) {
        if (xhr.readyState == 4) {
            // continue only if HTTP status is "OK"
            if (xhr.status == 200) {
                callback(JSON.parse(xhr.responseText));
            } else {
                onerror(xhr.status);
            }
        }
    };
    xhr.send();
}

/* Fetches a text file from an URL, then calls the function callback
 * when the file download is complete
 */
function fetchText(url, callback, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function(e) {
        if (xhr.readyState == 4) {
            // continue only if HTTP status is "OK"
            if (xhr.status == 200) {
                callback(xhr.responseText);
            } else {
                onerror(xhr.status);
            }
        }
    };
    xhr.send();
}