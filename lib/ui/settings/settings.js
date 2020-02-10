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
        this.target_dom = SettingsUI.addTag(this.ui, "div", {id: id, className: "settings-panel"});
    }
    
    parameter(id, description, default_value) {
        if(typeof default_value === 'boolean') {
            return this.choice(id, description)
                .option("true", "yes")
                .option("false", "no");
        }
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI.addTag(container, "label",  {innerHTML: description});
        var el = SettingsUI.addTag(container, "input", {id: id});
        if(typeof default_value === "number") {
            el.type = "number";
            this.getters[id] = function() {return parseFloat(document.getElementById(id).value);}
        } else {
            el.type = "text";
            this.getters[id] = function() {return document.getElementById(id).value};
        }
        el.value = default_value.toString();
    }
    
    choice(id, description) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter"});
        SettingsUI.addTag(container, "label",  {innerHTML: description || "&nbsp;"});
        var el = SettingsUI.addTag(container, "select", {id: id});
        return {
            option: function(id, text) {
                var o = SettingsUI.addTag(el, "option", {innerHTML: text});
                o.value = id;
                return this;
            }
        }
        this.getters[id] = function() {return document.getElementById(id).value;}
    }
    
    heading(text) {
        SettingsUI.addTag(this.target_dom, "h1", {innerHTML: text});
    }
    
    separator(type) {
        SettingsUI.addTag(this.target_dom, type || "hr");
    }
    
    button(func, label, className) {
        SettingsUI.addTag(this.target_dom, "button", {innerHTML: label, className: className, onclick: func});
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
    
    file(id, binary) {
        var container = SettingsUI.addTag(this.target_dom, "div", {className: "parameter drop-box empty"});
        var el = SettingsUI.addTag(container, "input", {id: id});
        el.type = "file";
                
        // Drop area
        var da   = SettingsUI.addTag(container, "div", {className: "drop-area"});
        SettingsUI.addTag(da, "div", {innerHTML: "Drop file here"});
        
        // Selected file & reset button
        var sf = SettingsUI.addTag(container, "div", {className: "selected-file"});
        var selectedFile = SettingsUI.addTag(sf, "span");
        SettingsUI.addTag(sf, "div", {
            innerHTML: "&#x2716;",
            className: "reset",
            onclick:   function() {container.className = "parameter drop-box empty";}
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
                    container.className = "parameter drop-box full";
                    progress.style.visibility = "hidden";
                    
                    selectedFile.innerHTML = f.name;
                    fileContents = e.target.result;
                }
                r.onprogress = function(e) {
                    if (e.lengthComputable) {
                        progress.max   = e.total;
                        progress.value = e.loaded;
                    }
                }
                if(binary) {
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
