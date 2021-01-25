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

class UpdateDialog {
    static showReleaseNotes() {
        $("#update-app-dialog").attr('data-state','show');
    }

    static showDownloading() {
        $("#update-app-dialog progress").hide();
        $("#update-app-dialog").attr('data-state','downloading');
    }

    // Updates the progress bar using a value from 0 to 1
    static setProgress(value) {
        $("#update-app-dialog progress").attr("value", value);
        $("#update-app-dialog progress").show();
    }

    static showUpdateAvailable() {
        $("#update-app-dialog").attr('data-state','available');
    }

    static showUpdateReady() {
        $("#update-app-dialog").attr('data-state','ready');
    }

    static dismiss() {
        $("#update-app-dialog").removeAttr('data-state');
    }
}

class Updater extends UpdateDialog {
    // If a service worker is available, it will Wikify content
    // for us, otherwise we have to do it here.
    static wikifyChangeLog(id) {
        if('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
            const iframe = document.getElementById(id);
            fetchText(iframe.src.replace(".md.html", ".md")).then(str => {
                iframe.srcdoc = wikify(str, {css: "css/markdown.css"});
            })
        }
    }

    // Retrieve the version of the application.
    static async getVersion() {
        try {
            let data = await fetchJSON("package.json");
            return data.version;
        } catch(error) {
            console.error(error);
        }
    }

    static firstTimeNotification() {
        if('serviceWorker' in navigator && navigator.serviceWorker.controller === null) {
            UpdateDialog.showReleaseNotes();
        }
    }

    // When running as an Electron app, the main process handles the updating.
    // These methods are used by the Electron app to allow the user to request
    // to download and install the update.

    static onElectronAppUpdateAvailable(version) {
        UpdateDialog.showUpdateAvailable();
    }

    static onElectronAppDownloadProgress(percent) {
        console.log("Download percent:", percent);
        UpdateDialog.setProgress(percent/100);
    }

    static downloadAndInstall() {
        electronAppDownloadAndInstall();
        UpdateDialog.showDownloading();
    }

    // When running as a Web app, the update process is performed by
    // the service worker. These methods handle the service worker
    // updating process.

    static registerServiceWorker() {
        console.warn("About to register service worker");
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => {
                console.log("Service worker registered");
                reg.addEventListener('updatefound', () => Updater.onUpdateFound(reg));
            })
            .catch(reason => {
                console.warn("Failed to register service worker: ", reason)
            });
        navigator.serviceWorker.addEventListener('controllerchange', Updater.onControllerChange, {once: true});
    }

    static onUpdateFound(reg) {
        console.log("New update installing");
        UpdateDialog.showDownloading();
        // A wild service worker has appeared in reg.installing!
        Updater.newWorker = reg.installing;
        Updater.newWorker.addEventListener('statechange', () => {
            console.log("Service worker state changed to", Updater.newWorker.state);
            switch(Updater.newWorker.state) {
                case "installed":
                    console.log("New update ready");
                    UpdateDialog.showUpdateReady();
                    break;
                case "redundant":
                    alert("Failed to download update. Please try again later.");
                    UpdateDialog.dismiss();
                    break;
            }
        });
    }

    static update() {
        if (!navigator.serviceWorker.controller) {
            window.location.reload();
        } else {
            Updater.newWorker.postMessage({cmd: 'skipWaiting'});
            UpdateDialog.dismiss();
        }
    }

    static onControllerChange() {
        console.log("New update loading");
        window.location.reload();
    }
}

if ('serviceWorker' in navigator && location.protocol != 'file:') {
    Updater.registerServiceWorker();
    Updater.isAvailable = true;
} else {
    console.warn("Service workers not supported");
    Updater.isAvailable = false;
}
