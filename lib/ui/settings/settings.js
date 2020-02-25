/**
 * Toolbox UI
 * Copyright (C) 2016 Marcio Teixeira
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
class SettingsUI {
    constructor(elementId) {
        this.ui            = document.getElementById(elementId);
        this.target_dom    = undefined;
        this.target_page   = undefined;
        $(this.ui).addClass("settings-ui");

        this.getters       = {};

        // Add the drop down menu
        this.menu          = document.createElement("select");
        this.menu.id       = "settingSelect";

        var that = this;
        this.menu.onchange = function() {
            that.gotoPage(that.menu.value);
        };

        this.ui.appendChild(this.menu);

        var el      = document.createElement("hr");
        this.ui.appendChild(el);
    }

    // private:

    static addTag(parent, type, attr_list) {
        var el = document.createElement(type);
        if(attr_list) {
            for (const attr in attr_list) {
                el[attr] = attr_list[attr];
            }
        }
        parent.appendChild(el);
        return el;
    }

    // privileged:

    page(id, menuText) {
        // Add a choice to the drop-down menu, unless menuText
        // is undefined, in which case this is a hidden page
        if(menuText) {
            SettingsUI.addTag(this.menu, "option", {innerHTML: menuText, value: id});
        }
        // Create the page itself and make it the target of future DOM insertions.
        this.target_page = SettingsUI.addTag(this.ui, "div", {id: id, className: "settings-panel"});
        this.target_dom  = this.target_page;
    }
    
    toggle(id, description, default_value) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI.addTag(container, "label",  {innerHTML: description, "for": id});
        var el = SettingsUI.addTag(container, "input", {id: id, type: "checkbox"});
        this.getters[id] = function() {return document.getElementById(id).value};
        return el;
    }

    number(id, description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI.addTag(container, "label",  {innerHTML: description, "for": id});
        var el = SettingsUI.addTag(container, "input", {id: id, type: "number"});
        this.getters[id] = function() {return parseFloat(document.getElementById(id).value);}
        if(attr && attr.hasOwnProperty("default_value"))
            el.value = attr.default_value.toString();
        if(attr && attr.hasOwnProperty("units")) {
            SettingsUI.addTag(container, "span", {innerHTML: attr.units, className: "units"});
            container.classList.add("has_units");
        }
        return el;
    }

    text(id, description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI.addTag(container, "label",  {innerHTML: description, "for": id});
        var el = SettingsUI.addTag(container, "input", {id: id, type: "text"});
        this.getters[id] = function() {return document.getElementById(id).value};
        if(attr && attr.hasOwnProperty("default_value"))
            el.value = attr.default_value;
        return el;
    }

    choice(id, description) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI.addTag(container, "label",  {innerHTML: description || "&nbsp;", "for": id});
        var el = SettingsUI.addTag(container, "select", {id: id});
        this.getters[id] = function() {return document.getElementById(id).value;}
        return {
            option: function(id, text) {
                var o = SettingsUI.addTag(el, "option", {innerHTML: text});
                o.value = id;
                return this;
            },
            element: el
        }
    }

    heading(text) {
        SettingsUI.addTag(this.target_dom, "h1", {innerHTML: text});
    }
    
    category(text) {
        if(text) {
            var details = SettingsUI.addTag(this.target_page, "details");
            var summary = SettingsUI.addTag(details, "summary");
            this.target_dom = summary;
            this.heading(text);
            this.target_dom = details;
        } else {
            this.target_dom = this.target_page;
        }
    }

    separator(type) {
        SettingsUI.addTag(this.target_dom, type || "hr");
    }

    button(func, label, attr_list) {
        var attr = Object.assign({innerHTML: label, onclick: func}, attr_list || {});
        return SettingsUI.addTag(this.target_dom, "button", attr);
    }

    buttonHelp(text) {
        SettingsUI.addTag(this.target_dom, "div", {innerHTML:text, className: "button-label"});
    }

    textarea(id) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        return SettingsUI.addTag(container, "textarea", {id: id});
    }

    div(id) {
        if(typeof id === 'string' || id instanceof String) {
            SettingsUI.addTag(this.target_dom, "div", {id: id});
        } else {
            this.target_dom.appendChild(id);
        }
    }

    element(idOrElement) {
        if(typeof idOrElement === 'string' || idOrElement instanceof String) {
            this.target_dom.appendChild(document.getElementById(idOrElement));
        } else {
            this.target_dom.appendChild(idOrElement);
        }
    }

    /**
     * Adds a file selection widget to the UI.
     *
     * Parameters:
     *   id     - Used as selector for getter
     *   attr   - Attribute collection
     *
     * Attributes:
     *   text           - Descriptive text
     *   binary         - True if file is binary
     *   callback(file) - Passed contents of file, or null when file selection is cleared.
     *
     * To retrive file contents, call:
     *   SettingsUI.get(id)
     *
     */
    file(id, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "drop-box empty"});

        // Choose file
        var el = SettingsUI.addTag(container, "input", {id: id});
        el.type = "file";

        // Drop area
        var da   = SettingsUI.addTag(container, "div", {className: "drop-area"});
        SettingsUI.addTag(da, "div", {innerHTML: (attr && attr.text) || "Drop file here"});

        // Selected file & reset button
        var sf = SettingsUI.addTag(container, "div", {className: "selected-file"});
        var selectedFile = SettingsUI.addTag(sf, "span");
        
        // Clear file selection button
        SettingsUI.addTag(sf, "span", {
            innerHTML: "&#x2716;",
            className: "reset",
            onclick:   function() {
                container.className = "drop-box empty";
                if (attr && attr.callback) {
                    attr.callback();
                }
            }
        });

        var progress = SettingsUI.addTag(da, "progress");

        var fileContents = null;

        this.getters[id] = function() {
            return fileContents;
        }

        function readSingleFile(evt) {
            evt.stopPropagation();
            evt.preventDefault();

            progress.style.visibility = "visible";

            var f = ('dataTransfer' in evt) ? (evt.dataTransfer.files[0]) : (evt.target.files[0]);
            if (f) {
                var r = new FileReader();
                r.onload = function(e) {
                    container.className = "drop-box full";
                    progress.style.visibility = "hidden";

                    selectedFile.innerHTML = f.name;
                    fileContents = e.target.result;
                    if (attr && attr.callback) {
                        attr.callback(fileContents);
                    }
                }
                r.onprogress = function(e) {
                    if (e.lengthComputable) {
                        progress.max   = e.total;
                        progress.value = e.loaded;
                    }
                }
                if(attr && attr.binary) {
                    r.readAsArrayBuffer(f);
                } else {
                    r.readAsText(f);
                }
            }
        }

        el.addEventListener('change', readSingleFile, false);

        function handleDragOver(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        }
        da.addEventListener('dragover', handleDragOver, false);
        da.addEventListener('drop',     readSingleFile, false);
    }

    done() {
        this.menu.onchange();
    }

    gotoPage(page) {
        $(".settings-panel").each(
            function() {
                var id = $(this).attr('id');
                if( id === page ) {
                    $("#"+id).show();
                } else {
                    $("#"+id).hide();
                }
            });
    }

    setAppendTarget(element) {
        this.target_dom = element;
    }

    get(option) {
        if(this.getters.hasOwnProperty(option)) {
            return this.getters[option]();
        } else {
            alert(option + "undefined");
            return null;
        }
    }

    exists(option) {
        return this.getters.hasOwnProperty(option);
    }
}
