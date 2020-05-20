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

class Updater {
    static onUpdateFound(reg) {
        console.log("New update installing");

        // Don't show the updating dialog box if we
        // don't already have a controller
        if (!navigator.serviceWorker.controller) return;

        $("#update-app-dialog").attr('data-state','downloading');
        // A wild service worker has appeared in reg.installing!
        newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
            if(newWorker.state == "installed") {
                // new update available
                console.log("New update ready");
                $("#update-app-dialog").attr('data-state','ready');
            }
        });
    }

    static onControllerChange() {
        console.log("New update loading");
        window.location.reload();
    }

    static getVersion(selector) {
        fetchJSON("version.json")
        .then(data  => $(selector).html("V" + data.version))
        .catch(error => console.warn(error));
    }

    static update() {
        newWorker.postMessage({cmd: 'skipWaiting'});
        Updater.okay();
    }

    static okay() {
        $("#update-app-dialog").removeAttr('data-state');
    }

    static showReleaseNotes() {
        $("#update-app-dialog").attr('data-state','show');
    }

    static firstTimeNotification() {
        if(navigator.serviceWorker.controller === null) {
            Updater.showReleaseNotes();
        }
    }
}

if ('serviceWorker' in navigator) {
    console.warn("About to register service worker");
    navigator.serviceWorker.register('service-worker.js').then(reg => {
        console.log("Service worker registered");
        reg.addEventListener('updatefound', () => Updater.onUpdateFound(reg));
    },
    reason => {
        console.warn("Failed to register service worker: ", reason)
    });
    navigator.serviceWorker.addEventListener('controllerchange', Updater.onControllerChange, {once: true});
} else {
    console.warn("Service workers not supported");
}