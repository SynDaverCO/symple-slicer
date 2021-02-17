/**
 * WebSlicer
 * Copyright (C) 2020 Marcio Teixeira
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

function splashScreen() {
    if(localStorage.getItem('no-splash') != "true") {
        showAbout();
    }
}

function showAbout() {
    document.getElementById("about").classList.remove("hidden");
    document.getElementById("no-splash").checked = localStorage.getItem('no-splash') == "true";
}

function hideAbout() {
    if(event.target.tagName == "A" || event.target.tagName == "INPUT") {
        return;
    }
    document.getElementById("about").classList.add("hidden");
    localStorage.setItem('no-splash', document.getElementById("no-splash").checked);
}

function enterFullscreen() {
    var el = document.getElementsByTagName("BODY")[0];
    if (el.requestFullscreen) {
        el.requestFullscreen();
    } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
    }
}

// Call this function before running operations that require the
// desktop version. It will give the user the option to  go to the
// download page if they are running from the web version.
function featureRequiresDesktopVersion(what = "This feature") {
    if(isDesktop) {
        return true;
    }
    if (confirm(what + " requires the desktop edition of Symple Slicer.\n\nClick OK to visit the download page and abandon your work.\nClick CANCEL to continue working with the web edition.")) {
        redirectToDesktopDownload()
    }
    return false;
}

function redirectToDesktopDownload() {
    let url = "https://syndaverco.github.io/slicer-desktop";
    if(isDesktop) {
        window.open(url);
    } else {
        window.location.href = url;
    }
}

function showUserGuide() {
    let win = window.open('guide/symple_slicer_users_guide.md.txt', '', 'menubar=no');
    if(isDesktop) {
        // When running as a desktop app there is no service worker
        // to wikify the contents, so we need to do it ourselves.
        win.addEventListener('load', wikifyOnLoad, false);
    }
}

// Allow Symple Slicer to receive messages via postMessage
function onMessage(e) {
    switch(e.data.cmd) {
        case "clear":
            stage.removeAll();
            break;
        case "place":
            if(e.data.files) {
                SettingsPanel.loadFiles(e.data.files);
            }
            if(e.data.urls) {
                SettingsPanel.fetchFiles(e.data.urls);
            }
            break;
    }
}

// The electron app calls this when the user selects Open... from the File menu

function onFileOpen() {
    document.getElementById('model_file').click();
}