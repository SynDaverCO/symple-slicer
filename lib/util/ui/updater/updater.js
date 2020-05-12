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

let newWorker;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
        if (!navigator.serviceWorker.controller) return;

        reg.addEventListener('updatefound', () => {
            $("#update-app-dialog").show();
            // A wild service worker has appeared in reg.installing!
            newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                // Has network.state changed?
                if(newWorker.state == "installed") {
                    // new update available
                    $("#update-app-dialog").addClass('ready');
                }
            });
        });
    });

    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
}

function getWebAppVersion(selector) {
    fetchJSON("version.json")
    .then(data  => $(selector).html("V" + data.version))
    .catch(error => console.warn(error));
}

function refreshWebApp() {
    newWorker.postMessage({cmd: 'skipWaiting'});
}