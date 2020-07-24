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

class Dialog {
    static show() {
        console.log("Show dialog", $("#custom-dialog").length);
        $("#custom-dialog").show();
        if($("#custom-dialog span button").length == 0) {
            Dialog.addButton("OK", () => Dialog.hide());
        }
    }

    static message(str) {
        $("#custom-dialog p").html(str);
    }

    static addButton(str, callback) {
        let el = document.createElement("button");
        el.innerText = str;
        $("#custom-dialog span").append(el);
        if(callback) {
            el.addEventListener("click", callback);
        }
    }

    static removeButtons() {
        $("#custom-dialog span").empty();
    }

    static hide() {
        $("#custom-dialog").hide();
    }

}