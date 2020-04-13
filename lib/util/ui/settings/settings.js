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

        this.currentPage   = null;

        var that = this;
        this.menu.onchange = function() {
            that.gotoPage(that.menu.value);
        };

        this.ui.appendChild(this.menu);

        var el      = document.createElement("hr");
        this.ui.appendChild(el);

        this.onPageExit  = function(page) {};
        this.onPageEnter = function(page) {};
    }

    // private:

    static addTag(parent, type, attr_list) {
        var el = document.createElement(type);
        if(attr_list) {
            for (const attr in attr_list) {
                if(typeof attr_list[attr] !== 'undefined') {
                    el[attr] = attr_list[attr];
                }
            }
        }
        parent.appendChild(el);
        return el;
    }

    // privileged:

    static _label(container, description, attr) {
        var lbl_attr = {innerHTML: description || "&nbsp;", "for": attr.id};
        if(attr && attr.tooltip) lbl_attr.title = attr.tooltip;
        SettingsUI.addTag(container, "label", lbl_attr);
    }

    static _input(container, type, attr) {
        var input_attr = {type: type};
        for(const p of ["id", "onclick", "oninput", "onchange", "min", "max", "step", "checked", "value"]) {
            if(attr && attr.hasOwnProperty(p)) {
                input_attr[p] = attr[p];
            }
        }
        return SettingsUI.addTag(container, "input", input_attr);
    }

    page(menuText, attr) {
        // Add a choice to the drop-down menu, unless menuText
        // is undefined, in which case this is a hidden page
        if(menuText) {
            SettingsUI.addTag(this.menu, "option", {innerHTML: menuText, value: attr.id});
        }
        // Create the page itself and make it the target of future DOM insertions.
        this.target_page = SettingsUI.addTag(this.ui, "div", {id: attr.id, className: "settings-panel"});
        this.target_dom  = this.target_page;
    }

    toggle(description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI._label(container, description, attr);
        var el = SettingsUI._input(container, "checkbox", attr);
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).checked};
        }
        return el;
    }

    number(description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI._label(container, description, attr);
        var el = SettingsUI._input(container, "number", attr);
        if(attr) {
            if(attr.id) {
                this.getters[attr.id] = function() {return parseFloat(document.getElementById(attr.id).value);}
            }
            if(attr.units) {
                SettingsUI.addTag(container, "span", {innerHTML: attr.units, className: "units"});
                container.classList.add("has_units");
            }
        }
        return el;
    }

    slider(description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI._label(container, description, attr);
        var el = SettingsUI._input(container, "range", attr);
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return parseFloat(document.getElementById(attr.id).value);}
        }
        return el;
    }

    text(description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI._label(container, description, attr);
        var el = SettingsUI._input(container, "text", attr);
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).value};
        }
        return el;
    }

    choice(description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI._label(container, description, attr);
        var el = SettingsUI.addTag(container, "select", {id: attr.id});
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).value;}
        }
        return {
            option: function(text, op_attr) {
                SettingsUI.addTag(el, "option", {innerHTML: text, value: op_attr.id});
                return this;
            },
            element: el
        }
    }

    heading(text) {
        SettingsUI.addTag(this.target_dom, "h1", {innerHTML: text});
    }

    category(text, attr) {
        if(text) {
            var details = SettingsUI.addTag(this.target_page, "details", attr);
            var summary = SettingsUI.addTag(details, "summary");
            this.target_dom = summary;
            this.heading(text);
            this.target_dom = details;
        } else {
            this.target_dom = this.target_page;
        }
    }

    separator(attr) {
        SettingsUI.addTag(this.target_dom, (attr && attr.type) || "hr");
    }

    button(label, attr_list) {
        var attr = Object.assign({innerHTML: label}, attr_list || {});
        return SettingsUI.addTag(this.target_dom, "button", attr);
    }

    buttonHelp(text) {
        SettingsUI.addTag(this.target_dom, "div", {innerHTML:text, className: "button-label"});
    }

    textarea(label, attr) {
        this.heading(label);
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        return SettingsUI.addTag(container, "textarea", {id: attr.id});
    }

    div(id) {
        if(typeof id === 'string' || id instanceof String) {
            SettingsUI.addTag(this.target_dom, "div", {id: id});
        } else {
            this.target_dom.appendChild(id);
        }
    }

    element(attr) {
        if(attr.hasOwnProperty("id")) {
            this.target_dom.appendChild(document.getElementById(attr.id));
        }
        if(attr.hasOwnProperty("element")) {
            this.target_dom.appendChild(attr.element);
        }
    }

    setVisibility(id, visible) {
        if(visible) {
            $("#" + id).parent(".parameter").show();
        } else {
            $("#" + id).parent(".parameter").hide();
        }
    }

    expand(category, isExpanded = true) {
        if(isExpanded) {
            $('#' + category).attr("open","open");
        } else {
            $('#' + category).removeAttr("open");
        }
    }
    
    enable(id, isEnabled = true) {
        if(isEnabled) {
            $('#' + id).removeAttr('disabled');
        } else {
            $('#' + id).attr('disabled','disabled');
        }
    }

    /**
     * Adds a file selection widget to the UI.
     *
     * Parameters:
     *   description    - Descriptive text
     *   attr           - Attribute collection
     *
     * Attributes:
     *   id             - ID used for the getters
     *   binary         - True if file is binary
     *   onchange(file) - Passed contents of file, or null when file selection is cleared.
     *
     * To retrive file contents, call:
     *   SettingsUI.get(attr.id)
     *
     * To retrive file name, call:
     *   SettingsUI.get(attr.id + "_name")
     *
     */
    file(description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "drop-box empty"});

        // Choose file
        var el = SettingsUI.addTag(container, "input", {id: attr.id});
        el.type = "file";

        // Drop area
        var da   = SettingsUI.addTag(container, "div", {className: "drop-area"});
        SettingsUI.addTag(da, "div", {innerHTML: description});

        // Selected file & reset button
        var sf = SettingsUI.addTag(container, "div", {className: "selected-file"});
        var selectedFile = SettingsUI.addTag(sf, "span");

        // Clear file selection button
        SettingsUI.addTag(sf, "span", {
            innerHTML: "&#x2716;",
            className: "reset",
            onclick:   function() {
                container.className = "drop-box empty";
                if (attr && attr.onchange) {
                    attr.onchange();
                    el.value = "";
                }
            }
        });

        var progress = SettingsUI.addTag(da, "progress");

        var fileContents = null;

        this.getters[attr.id] = function() {
            return fileContents
        }
        this.getters[attr.id + "_filename"] = function() {
            return selectedFile.innerHTML
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
                    if (attr && attr.onchange) {
                        attr.onchange(fileContents);
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
        if(page != this.currentPage) {
            this.onPageExit(this.currentPage);
            $(".settings-panel").each(
                function() {
                    var id = $(this).attr('id');
                    if( id === page ) {
                        $("#"+id).show();
                    } else {
                        $("#"+id).hide();
                    }
                });
            $("#settingSelect").val(page);
            this.currentPage = page;
            this.onPageEnter(page);
        }
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
