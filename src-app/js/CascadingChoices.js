/**
 * WebSlicer
 * Copyright (C) 2022  SynDaver Labs, Inc.
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

export class CascadingChoices {
    constructor() {
        // Add a special style sheet to the body of the document
        this.styles = document.createElement("style");
        document.head.appendChild(this.styles);

        CascadingChoices.disableDropDownValidation = false;
    }

    static setConstraint(option, key, value) {
        option.setAttribute(key, value);
    }

    static isHidden(el) {
        return window.getComputedStyle(el).getPropertyValue('display') === 'none';
    }

    static hideIfNoChoices(el) {
        let opt = el.firstChild;
        let count = 0;
        while(opt) {
            if(!CascadingChoices.isHidden(opt)) count++;
            opt = opt.nextElementSibling;
        }
        if(count > 1) {
            el.closest(".parameter").classList.remove("onlyOneChoice");
        } else {
            el.closest(".parameter").classList.add("onlyOneChoice");
        }
    }

    static chooseOtherIfHidden(el) {
        let opt = el.firstChild;
        while(opt && !opt.selected) opt = opt.nextElementSibling;
        if(opt && CascadingChoices.isHidden(opt)) {
            opt = el.firstChild;
            while(opt && CascadingChoices.isHidden(opt)) opt = opt.nextElementSibling;
            if(opt) {
                el.value = opt.value;
                return true;
            } else {
                el.removeAttribute("value");
            }
        }
        return false;
    }

    static cssSelectNonMatchingOptions(key, value) {
        return value == "" ? false : '#page_profiles option[' + key + ']:not([' + key + '="' + value + '"])';
    }

    validate(menus) {
        if(this.disableDropDownValidation) return;

        do {
            // Hide elements based on criteria
            const css = menus.map(el => CascadingChoices.cssSelectNonMatchingOptions(el.id, el.value)).filter(e => e).join(",");
            this.styles.innerText = css + ", #page_profiles .onlyOneChoice {display: none}";

            // If a selected element is hidden, make another selection
        } while(menus.some(CascadingChoices.chooseOtherIfHidden));

        menus.forEach(CascadingChoices.hideIfNoChoices);
    }

    static disable() {
        CascadingChoices.disableDropDownValidation = true;
    }

    static enable() {
        CascadingChoices.disableDropDownValidation = false;
    }
}