/**
 * EditableSelect.js
 * Copyright (C) 2021  SynDaver Labs, Inc.
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

/**
* Editable select box based on the ideas here
* https://stackoverflow.com/questions/264640/how-can-i-create-an-editable-dropdownlist-in-html
*/

(function() {
    const template = document.createElement('template');

    template.innerHTML = `
        <style>
            :host {
                display:block;
                position: relative;
                border: 1px solid  black;
                padding: 0 !important;
            }
            :host select {
                width: 100%;
                border:none;
                outline:none;
                font-family:inherit;
                font-size: inherit;
                background:inherit;
                visibility:hidden;
            }
            :host select.has_choices {
                visibility:visible;
            }
            :host select option:first-child {
                display: none;
            }
            :host > * {
                box-sizing: border-box;
            }
            :host input {
                position: absolute;
                width: 100%;
                border:none;
                font-family:inherit;
                font-size: inherit;
                background:inherit;
            }
            :host input.has_choices {
                width: calc(100% - 20px);
            }
        </style>
        <input type="text">
        <select>
            <option></option>
        </select>
    `;

    class EditableSelect extends HTMLElement {
        constructor() {
            super();
            this._onSelectChange  = this._onSelectChange.bind(this);
            this._onTextboxChange = this._onTextboxChange.bind(this);
            this._onTextboxInput  = this._onTextboxInput.bind(this);
            this.attachShadow({mode: 'open'});
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            this._select  = this.shadowRoot.querySelector('select');
            this._textbox = this.shadowRoot.querySelector('input');
        }

        connectedCallback() {
            this._select.addEventListener("change", this._onSelectChange);
            this._textbox.addEventListener("change", this._onTextboxChange);
            this._textbox.addEventListener("input", this._onTextboxInput);
            if (!this.hasAttribute('value')) {
                this.setAttribute('value', "");
            }
        }

        _onSelectChange() {
            const newValue = this._select.value;
            this._textbox.value = newValue;
            this._textbox.focus();
            this._select.selectedIndex = 0;
            this.setAttribute('value', newValue);
            this._onTextboxChange();
        }

        _onTextboxChange() {
            const event = new Event('change');
            this.setAttribute('value', this._textbox.value);
            this.dispatchEvent(event);
        }

        _onTextboxInput() {
            const event = new Event('input');
            this.setAttribute('value', this._textbox.value);
            this.dispatchEvent(event);
        }

        disconnectedCallback() {
            this._select.removeEventListener("change", this._onSelectChange);
        }

        static get observedAttributes() {
            return ["value"];
        }

        set value(newValue) {
            this.setAttribute('value', newValue);
        }

        get value() {
            return this.getAttribute('value');
        }

        attributeChangedCallback(name, oldValue, newValue) {
            switch(name) {
                case "value":
                    this._textbox[name] = newValue;
                    break;
            }
        }

        setChoices(choices) {
            this._select.options.length = 1;
            for(const choice of choices) {
                const option = document.createElement("option");
                option.textContent = choice;
                this._select.appendChild(option);

            }
            if(choices.length) {
                this._select.classList.add("has_choices");
                this._textbox.classList.add("has_choices");
            } else {
                this._select.classList.remove("has_choices");
                this._textbox.classList.remove("has_choices");
            }
        }
    }
    window.customElements.define('editable-select', EditableSelect);
})();