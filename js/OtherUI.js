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

function showProgressBar() {
    clearConsole();
    $("#progress-dialog").show();
    $("#progress-dialog progress").attr("value",0);
    $("#downloadGcode").hide();
}

function setProgress(value) {
    $("#progress-dialog progress").attr("value",value);
}

function hideProgressBar() {
    $("#progress-dialog").hide();
}
    
function onShowLogClicked() {
    $("#log-dialog").show();
}

function onHideLogClicked() {
    $("#log-dialog").hide();
}
    
function showAbout() {
    document.getElementById("about").style.display = "block";
}
function hideAbout() {
    document.getElementById("about").style.display = "none";
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