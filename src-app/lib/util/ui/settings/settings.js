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
        $(this.ui).addClass("settings-ui");

        this.getters       = {};

        this.header        = SettingsUI.addTag(this.ui, "div");

        // Add the drop down menu
        this.menu          = document.createElement("select");
        this.menu.id       = "settingSelect";

        this.currentPage   = null;

        const that = this;
        this.menu.onchange = function() {
            that.gotoPage(that.menu.value);
        };

        this.header.appendChild(this.menu);

        const el      = document.createElement("hr");
        this.header.appendChild(el);

        this.onPageExit  = function(page) {};
        this.onPageEnter = function(page) {};
    }

    // private:

    static addTag(parent, type, attr_list) {
        const el = document.createElement(type);
        if(attr_list) {
            for (const attr in attr_list) {
                if(typeof attr_list[attr] !== 'undefined') {
                    el[attr] = attr_list[attr];
                    if(typeof attr_list[attr] !== 'function') {
                        // Set the attribute for everything except event handlers.
                        el.setAttribute(attr, attr_list[attr]);
                    }
                }
            }
        }
        parent.appendChild(el);
        return el;
    }

    // privileged:

    static _param(container, attr, tabbable) {
        container = SettingsUI.addTag(container, "div", SettingsUI._copyAttr({}, attr, ["className"]));
        if(tabbable) {
            container.classList.add("tabbable-param");
        }
        return SettingsUI.addTag(container, "span", {className: "parameter"});
    }

    static _label(container, description, attr) {
        SettingsUI.addTag(container, "label", {innerHTML: description || "&nbsp;", "for": attr.id, title: attr.tooltip});
    }

    static _copyAttr(dst, src, allowed) {
        for(const p of allowed) {
            if(src && src.hasOwnProperty(p)) {
                dst[p] = src[p];
            }
        }
        return dst;
    }

    static _input(container, type, attr) {
        return SettingsUI.addTag(container, "input",
            SettingsUI._copyAttr(
                {type: type, autocomplete: "off"},
                attr,
                ["id", "onclick", "oninput", "onchange", "min", "max", "step", "checked", "value", "name", "placeholder", "spellcheck", "className"]
            ));
    }

    page(menuText, attr) {
        // Add a choice to the drop-down menu, unless menuText
        // is undefined, in which case this is a hidden page
        if(menuText) {
            SettingsUI.addTag(this.menu, "option", {innerHTML: menuText, value: attr.id});
        }
        // Create the page itself and make it the target of future DOM insertions.
        const el = SettingsUI.addTag(this.ui, "div", attr);
        el.classList.add("settings-panel");
        el.classList.add(attr.id);
        this.page_id = attr.id;
        this.target_dom = el;
        return el;
    }

    footer(attr) {
        this.category();
        const el = this.page(null, {id: this.page_id, className: "footer settings-panel"});
        this.separator();
        if(attr && attr.hasOwnProperty("className")) {
            el.classList.add(attr.className);
        }
    }

    toggle(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, false);
        SettingsUI._label(container, description, attr);
        const el = SettingsUI._input(container, "checkbox", attr);
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).checked};
        }
        return el;
    }

    radio(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, false);
        SettingsUI._label(container, description, attr);
        const el = SettingsUI._input(container, "radio", attr);
        if(attr && attr.name) {
            this.getters[attr.name] = function() {
                const el = document.querySelector('input[name="'+attr.name+'"]:checked');
                return el ? el.value : "";
            };
        }
        return el;
    }

    number(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, true);
        SettingsUI._label(container, description, attr);
        const el = SettingsUI._input(container, "number", attr);
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

    color(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, true);
        SettingsUI._label(container, description, attr);
        const el = SettingsUI._input(container, "color", attr);
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).value};
        }
        return el;
    }

    slider(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, false);
        SettingsUI._label(container, description, attr);
        const el = SettingsUI._input(container, "range", attr);
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return parseFloat(document.getElementById(attr.id).value);}
        }
        return el;
    }

    text(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, true);
        SettingsUI._label(container, description, attr);
        const el = attr.dropdown ? SettingsUI.addTag(container, "editable-select", attr) : SettingsUI._input(container, "text", attr);
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).value};
        }
        return el;
    }

    choice(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, false);
        SettingsUI._label(container, description, attr);
        const el = SettingsUI.addTag(container, "select", SettingsUI._copyAttr({}, attr, ["id", "multiple","onchange"]));
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).value;}
        }
        return {
            option: function(text, op_attr) {
                SettingsUI.addTag(el, "option", SettingsUI._copyAttr({innerHTML: text}, op_attr, ["value", "style"]));
                return this;
            },
            element: el
        }
    }

    progress(description, attr) {
        const container = SettingsUI._param(this.target_dom, attr, false);
        SettingsUI._label(container, description, attr);
        return SettingsUI.addTag(container, "progress", SettingsUI._copyAttr({}, attr, ["id", "value", "max"]));
    }

    heading(text) {
        SettingsUI.addTag(this.target_dom, "h1", {innerHTML: text});
    }

    category(text, attr) {
        if(this.target_dom.tagName == "DETAILS") {
            this.target_dom = this.target_dom.parentElement;
        }
        if(text) {
            const details = SettingsUI.addTag(this.target_dom, "details", attr);
            const summary = SettingsUI.addTag(details, "summary");
            this.target_dom = summary;
            this.heading(text);
            this.target_dom = details;
        }
    }

    separator(attr) {
        SettingsUI.addTag(this.target_dom, (attr && attr.type) || "hr");
    }

    /**
     * A button group is a div that contains buttons and buttonHelp elements.
     * If one already exists, it will be used, otherwise a new one will be created
     */
    _lastButtonGroup(closeGroup) {
        let group = this.target_dom.lastChild;
        if (!(group && group.classList.contains("incomplete-button-group"))) {
            group = SettingsUI.addTag(this.target_dom, "div", {className: "incomplete-button-group"})
        }
        if(closeGroup) {
            group.classList.remove("incomplete-button-group");
            group.classList.add("button-group");
        }
        return group;
    }

    button(label, attr_list) {
        const attr = Object.assign({innerHTML: label}, attr_list || {});
        return SettingsUI.addTag(this._lastButtonGroup(), "button", attr);
    }

    buttonHelp(text) {
        SettingsUI.addTag(this._lastButtonGroup(true), "div", {innerHTML:text, className: "button-label"});
    }

    textarea(description, attr) {
        SettingsUI._label(this.target_dom, description, attr);
        const container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        const el = SettingsUI.addTag(container, "textarea", SettingsUI._copyAttr({}, attr, ["id", "spellcheck"]));
        if(attr && attr.id) {
            this.getters[attr.id] = function() {return document.getElementById(attr.id).value};
        }
        return el;
    }

    div(attr) {
        this.category(); // Close category
        if(attr) {
            this.target_dom = SettingsUI.addTag(this.target_dom, "div", attr);
        } else {
            this.target_dom = this.target_dom.parentElement;
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

    html(html) {
        $(this.target_dom).append(html);
    }

    setVisibility(id, visible) {
        if(visible) {
            $(id).parent(".parameter").show();
        } else {
            $(id).parent(".parameter").hide();
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
            $(id).removeAttr('disabled');
        } else {
            $(id).attr('disabled','disabled');
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
     *   mode           - 'text' (string), 'binary' (ArrayBuffer) or 'file' (File)
     *   onchange(file) - Passed contents of file, or null when file selection is cleared.
     *
     * To retrive file contents, call:
     *   SettingsUI.get(attr.id).data
     *
     * To retrive file name, call:
     *   SettingsUI.get(attr.id).filename
     *
     * To retrive drop handler, call:
     *   SettingsUI.get(attr.id).drophandler(evt);
     *
     * To clear, call:
     *   SettingsUI.get(attr.id).clear();
     *
     */
    file(description, attr) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "drop-box empty"});

        // Choose file
        var el = SettingsUI.addTag(container, "input", SettingsUI._copyAttr(
            {type: "file"}, attr, ["id", "multiple", "accept"]));

        // Drop area
        var da   = SettingsUI.addTag(container, "div", {className: "drop-area"});
        SettingsUI.addTag(da, "div", {innerHTML: description});

        // Selected file & reset button
        var sf = SettingsUI.addTag(container, "div", {className: "selected-file"});
        var selectedFile = SettingsUI.addTag(sf, "span");

        // Clear file selection button
        function populateFileSelection(filename, contents) {
            container.className = "drop-box full";
            ProgressBar.hide();
            selectedFile.innerHTML = filename;
            fileContents = contents;
            if (attr && attr.onchange) {
                attr.onchange(fileContents, filename);
            }
        }

        function clearFileSelection() {
                container.className = "drop-box empty";
                if (attr && attr.onchange) {
                    attr.onchange();
                    el.value = "";
                    selectedFile.innerHTML = "";
                }
        }

        SettingsUI.addTag(sf, "span", {
            innerHTML: "&#x2716;",
            className: "reset",
            onclick: clearFileSelection
        });

        var fileContents = null;

        this.getters[attr.id] = () => {
            return {
                data:        fileContents,
                filename:    selectedFile.innerHTML,
                drophandler: readSingleFile,
                clear:       clearFileSelection
            }
        }

        function readSingleFile(evt) {
            evt.stopPropagation();
            evt.preventDefault();

            ProgressBar.message("Loading file");
            ProgressBar.progress(0);

            const files = ('dataTransfer' in evt ? evt.dataTransfer : evt.target).files;
            for(var i = 0; i < files.length; i++) {
                const f = files[i];
                const mode = (attr && attr.mode) || "text";
                switch(mode) {
                    case "text":
                    case "binary":
                        const r = new FileReader();
                        r.onload = e => {
                            populateFileSelection(f.name, e.target.result);
                        }
                        r.onprogress = e => {
                            if (e.lengthComputable) {
                                ProgressBar.progress(e.loaded/e.total);
                            }
                        }
                        if(mode == 'binary') {
                            r.readAsArrayBuffer(f);
                        } else {
                            r.readAsText(f);
                        }
                        break;
                    case "file":
                        populateFileSelection(f.name, f);
                        break;
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
            $(".settings-panel").hide();
            $("." + page).show();
            $("#settingSelect").val(page);
            this.lastPage = this.currentPage;
            this.currentPage = page;
            if(this.isModal()) {
                $(this.header).hide();
            } else {
                $(this.header).show();
            }
            this.onPageEnter(page);
        }
    }

    /**
     * A modal dialog box does not have an item in the pull down menu
     * and can only be shown via "gotoPage"
     */
    isModal() {
        return $( "#settingSelect option:selected" ).text() === "";
    }

    dismissModal() {
        if(this.isModal()) {
            this.goBack();
        }
    }

    goBack() {
        this.gotoPage(this.lastPage);
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

    enableAutoTab() {
        this.ui.onkeydown = e => {
            if(e.keyCode == 13) {
                $(e.target).parents(".tabbable-param").next(".tabbable-param").find("input").focus().select();
        }};
    }
}
