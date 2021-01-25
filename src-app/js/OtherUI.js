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
    document.getElementById("about").style.display = "block";
    document.getElementById("no-splash").checked = localStorage.getItem('no-splash') == "true";
}

function hideAbout() {
    if(event.target.tagName == "A" || event.target.tagName == "INPUT") {
        return;
    }
    document.getElementById("about").style.display = "none";
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