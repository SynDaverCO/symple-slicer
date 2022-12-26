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

export class ProgressBar {
    static show() {
        if(!$("#progress-dialog progress").is(":visible")) {
            $("#progress-dialog progress").attr("value",0);
            $("#progress-dialog").show();
        }
    }

    // Updates the progress bar using a value from 0 to 1
    static progress(value) {
        $("#progress-dialog progress").attr("value",value);
        ProgressBar.show();
    }

    static message(message) {
        $("#progress-dialog label").html(message);
        ProgressBar.show();
    }

    static hide() {
        $("#progress-dialog").hide()
                             .removeClass("paused")
                             .removeClass("hasSuspend")
                             .removeClass("hasAbort");
        $("#progress-dialog .stop").prop('disabled', false);
    }

    // Assigns an abort callback and shows an abort button.
    static onAbort(callback, tooltip) {
        $("#progress-dialog").addClass("hasAbort");
        $("#progress-dialog .stop").off("click");
        $("#progress-dialog .stop").on(
            "click", () => {
                $("#progress-dialog .stop").prop('disabled', true);
                if(!callback()) {
                    $("#progress-dialog .stop").prop('disabled', false);
                }
        });
        if(tooltip) $("#progress-dialog .stop").prop('title', tooltip);
    }

    // Assigns a pause/resume callback and shows a pause button.
    static onPause(callback) {
        $("#progress-dialog").addClass("hasSuspend");
        $("#progress-dialog .pause").off("click");
        $("#progress-dialog .pause").on(
            "click", () => {
                ProgressBar.setPauseState(true);
                callback(true);
        });
        $("#progress-dialog .resume").on(
            "click", () => {
                ProgressBar.setPauseState(false);
                callback(false);
        });
    }

    static setPauseState(state) {
        if(state) {
            $("#progress-dialog").addClass("paused");
        } else {
            $("#progress-dialog").removeClass("paused");
        }
    }
}