/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
 * Copyright (C) 2020  SynDaver Labs, Inc.
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

var settings, gcode_blob, loaded_geometry;

class SettingsPanel {
    static init(id) {
        const s = settings = new SettingsUI(id);
        s.enableAutoTab();

        SelectProfilesPage.init(s);
        MaterialNotesPage.init(s);
        PlaceObjectsPage.init(s);
        ObjectTransformPage.init(s);
        SliceObjectsPage.init(s);
        PrintAndPreviewPage.init(s);
        MachineSettingsPage.init(s);
        StartAndEndGCodePage.init(s);
        ConfigWirelessPage.init(s);
        if(isDesktop) {
            MonitorWirelessPage.init(s);
        }
        UpdateFirmwarePage.init(s);
        AdvancedFeaturesPage.init(s);
        HelpAndInfoPage.init(s);

        s.done();

        s.onPageEnter = SettingsPanel.onPageEnter;
        s.onPageExit = SettingsPanel.onPageExit;

        PlaceObjectsPage.onDropModel();         // Disable buttons
        PlaceObjectsPage.onDropImage();         // Disable buttons
        PlaceObjectsPage.onLoadTypeChanged();

        // Set up the global drag and drop handler
        window.addEventListener("dragover", SettingsPanel.onDragOver, false);
        window.addEventListener("drop",     SettingsPanel.onWindowDrop);

        // Process any load requests.
        if(this.deferredFileLoad) {
            this.onWindowDrop(this.deferredFileLoad);
            settings.gotoPage("page_profiles");
        }
    }

    // onchange handler for enforcing the min and max values.
    static enforceMinMax(evt){
        const el = evt.target;
        if(el.value != ""){
            if(el.hasAttribute("min") && parseInt(el.value) < parseInt(el.min)){
                el.value = el.min;
            }
            if(el.hasAttribute("max") && parseInt(el.value) > parseInt(el.max)){
                el.value = el.max;
            }
        }
    }

    static onPageExit(page) {
        if(page == "page_print") {
            stage.hideToolpath();
        }
    }

    static onPageEnter(page) {
        if(page == "page_flash_fw") {
            UpdateFirmwarePage.onEntry();
        }
    }

    static getFilenameFromUrl(url) {
        const pathname = new URL(url, document.location).pathname;
        const index = pathname.lastIndexOf('/');
        return (-1 !== index) ? pathname.substring(index + 1) : pathname;
    }

    static async fetchFiles(urlList) {
        const files = [];
        for(const url of urlList) {
            console.log(url);
            const data = await fetch(url);
            const blob = await data.blob();
            const file = new File([blob], this.getFilenameFromUrl(url), {type: blob.type});
            files.push(file);
        }
        this.loadFiles(files);
    }

    static loadFiles(files) {
        // Create a synthetic onDrop event that will be dispatched
        // once Symple Slicer is initialized.
        const evt = {
            stopPropagation: () => {},
            preventDefault: () => {},
            dataTransfer: {
                files: files,
                getData: () => null
            }
        };
        if(settings) {
            this.onWindowDrop(evt);
            settings.gotoPage("page_profiles");
        } else {
            this.deferredFileLoad = evt;
        }
    }

    /**
     * If the user drops a file anywhere other than the drop boxes,
     * then try to dispatchEvent it to the correct handler.
     */
    static onWindowDrop(e) {
        e = e || event;
        const files = e.dataTransfer.files;
        // Process any drag-and-dropped files
        for (var i = 0; i < files.length; i++) {
            const extension = files[i].name.split('.').pop().toLowerCase();
            var id;
            switch (extension) {
                case 'stl':
                case 'obj':
                case '3mf':
                case 'gco':
                case 'gcode':
                    settings.gotoPage("page_place");
                    PlaceObjectsPage.onLoadTypeChanged("3d");
                    id = "model_file";
                    break;
                case 'toml':
                    SelectProfilesPage.setProfileSource('from-import');
                    settings.gotoPage("page_profiles");
                    id = "toml_file";
                    break;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'bmp':
                case 'gif':
                    settings.gotoPage("page_place");
                    PlaceObjectsPage.onLoadTypeChanged("2d");
                    id = "image_file";
                    break;
            }
            if(id) {
                settings.get(id).drophandler(e);
            }
        }
        // Process any drag-and-dropped commands
        const data = e.dataTransfer.getData("text/plain");
        if(data) {
            let cmd = data.split(/\s+/);
            switch(cmd[0]) {
                case "add_profile_url":
                    ProfileLibrary.addURL(cmd[1]);
                    alert("New profiles will be available upon reload");
                    break;
                case "clear_local_storage":
                    localStorage.clear();
                    alert("Local storage cleared");
                    break;
            }
        }
        e.preventDefault();
    }

    static onDragOver(e) {
        e = e || event;
        e.preventDefault();
    }
}

class SelectProfilesPage {
    static init(s) {
        let attr;

        s.page(       "Select Profiles",                             {id: "page_profiles"});

        attr = {name: "profile-source", onchange: SelectProfilesPage.onProfileSourceChanged};
        s.radio( "Load slicer settings for printer and material:",   {...attr, value: "from-profiles", checked: "checked"});
        s.radio( "Load slicer settings from saved file",             {...attr, value: "from-import"});
        s.radio( "Keep slicer settings from last session",           {...attr, value: "from-session"});

        s.div({id: "profile_choices", className: "load-profiles"});
        s.separator(                                                 {type: "br"});
        attr = {onchange: SelectProfilesPage.onDropDownChange};
        const manufacturer_menu = s.choice( "Manufacturer:",         {...attr, id: "machine_manufacturers"});
        const printer_menu = s.choice(      "Printer:",              {...attr, id: "machine_profiles"});
        const upgrades_menu = s.choice(     "Upgrades:",             {...attr, id: "machine_upgrades"});
        const toolhead_menu = s.choice(     "Toolhead:",             {...attr, id: "machine_toolheads"});
        const quality_menu = s.choice(      "Quality:",              {...attr, id: "print_quality"});
        const brand_menu = s.choice(        "Material Brand:",       {...attr, id: "material_brands"});
        const material_menu = s.choice(     "Material:",             {...attr, id: "print_profiles"});
        s.div();

        s.div({className: "import-settings"});
        s.separator(                                                 {type: "br"});
        s.file(       "Drag and drop settings<br><small>(.TOML)</small>", {id: "toml_file", onchange: SelectProfilesPage.onImportChanged, mode: 'text'});
        s.div();

        s.footer();

        s.div({className: "keep-settings"});
        s.button(     "Next",                                        {onclick: SelectProfilesPage.onNext});
        s.buttonHelp( "Click this button to proceed to placing objects.");
        s.div();

        s.div({className: "load-profiles"});
        s.button(     "Apply",                                       {onclick: SelectProfilesPage.onApplyPreset});
        s.buttonHelp( "Click this button to load profiles and proceed to placing objects.");
        s.div();

        s.div({className: "import-settings"});
        s.button(     "Apply",                                       {id: "import_settings", onclick: SelectProfilesPage.onImportClicked});
        s.buttonHelp( "Click this button to load slicer settings and proceed to placing objects.");
        s.div();

        const defaultSource = localStorage.getItem('profile-source') || 'from-profiles';
        this.setProfileSource(defaultSource);
        this.initProfiles({
            machine_manufacturers: manufacturer_menu,
            machine_profiles: printer_menu,
            machine_upgrades: upgrades_menu,
            machine_toolheads: toolhead_menu,
            print_quality: quality_menu,
            material_brands: brand_menu,
            print_profiles: material_menu
        });

        SelectProfilesPage.onImportChanged(false); // Disable buttons

        // Add a special style sheet to the body of the document
        this.styles = document.createElement("style");
        document.head.appendChild(this.styles);
    }

    static async initProfiles(menus) {
        try {
            await this.populateProfileMenus(menus);
            if(ProfileManager.loadStoredProfile()) {
                MachineSettingsPage.onPrinterSizeChanged();
                this.rememberProfileSelections(menus);
            } else {
                // If no startup profile is found, load first profile from the selection box
                this.loadPresets();
            }
            this.onDropDownChange();
        } catch(error) {
            alert(error);
            console.error(error);
        }
        window.onunload = ProfileManager.onUnloadHandler;
        onProfilesReady();
    }

    // Populate the pull down menus in the UI with a list of available profiles
    static async populateProfileMenus(menus) {
        for(const profile of await ProfileLibrary.fetch()) {
            if(menus.hasOwnProperty(profile.type)) {
                const menu = menus[profile.type];
                menu.option(
                    profile.name,
                    {value: profile.id}
                );
                // Any constraints are added as attributes to the option so we can
                // hide them using a dynamic style sheet.
                const opt = menu.element.lastElementChild;
                for(const s of ProfileLibrary.constraints) {
                    if(profile[s]) opt.setAttribute(s, profile[s]);
                }
            }
        }
    }

    static async rememberProfileSelections(menus) {
        // Preselect the previously used profile
        const based_on = ProfileManager.getSection("based_on");
        if(based_on) {
            this.disableDropDownValidation = true;
            for(const [key, menu] of Object.entries(menus)) {
                if(based_on.hasOwnProperty(key)) {
                    menu.element.value = based_on[key];
                }
            }
            this.disableDropDownValidation = false;
        }
    }

    static onDropDownChange(e) {
        if(this.disableDropDownValidation) return;
        function hideNonMatchingOptions(key, value) {
            return '#profile_choices option[' + key + ']:not([' + key + '="' + value + '"]) {display: none}\n';
        }
        function isHidden(el) {
            return window.getComputedStyle(el).getPropertyValue('display') === 'none';
        }
        function chooseOtherIfHidden(id) {
            const el = document.getElementById(id);
            let opt = el.firstChild;
            while(opt && !opt.selected) opt = opt.nextElementSibling;
            if(opt && isHidden(opt)) {
                opt = el.firstChild;
                while(opt && isHidden(opt)) opt = opt.nextElementSibling;
                if(opt) {
                    el.value = opt.value;
                    return true;
                } else {
                    el.removeAttribute("value");
                }
            }
            return false;
        }
        function hideIfNoChoices(id) {
            const el = document.getElementById(id);
            let opt = el.firstChild;
            let count = 0;
            while(opt) {
                if(!isHidden(opt)) count++;
                opt = opt.nextElementSibling;
            }
            settings.setVisibility("#"+id, count > 1);
        }
        while(true) {
            SelectProfilesPage.styles.innerText =
                hideNonMatchingOptions('manufacturer', settings.get("machine_manufacturers")) +
                hideNonMatchingOptions('machine',      settings.get("machine_profiles")) +
                hideNonMatchingOptions('upgrade',      settings.get("machine_upgrades")) +
                hideNonMatchingOptions('toolhead',     settings.get("machine_toolheads")) +
                hideNonMatchingOptions('quality',      settings.get("print_quality")) +
                hideNonMatchingOptions('brand',        settings.get("material_brands"));
            if(chooseOtherIfHidden("machine_profiles")) continue;
            if(chooseOtherIfHidden("machine_upgrades")) continue;
            if(chooseOtherIfHidden("machine_toolheads")) continue;
            if(chooseOtherIfHidden("material_brands")) continue;
            if(chooseOtherIfHidden("print_profiles")) continue;
            break;
        }
        hideIfNoChoices("machine_manufacturers");
        hideIfNoChoices("machine_upgrades");
        hideIfNoChoices("machine_toolheads");
        hideIfNoChoices("print_quality");
        hideIfNoChoices("material_brands");
    }

    static async onApplyPreset() {
        try {
            await SelectProfilesPage.loadPresets();
            SelectProfilesPage.onNext();
        }
        catch(error) {
            alert(error);
            console.error(error);
        }
    }

    static async loadPresets() {
        try {
            ProgressBar.message("Loading profiles");
            await ProfileManager.applyPresets({
                machine:  settings.get("machine_profiles"),
                upgrade:  settings.get("machine_upgrades"),
                toolhead: settings.get("machine_toolheads"),
                quality:  settings.get("print_quality"),
                material: settings.get("print_profiles")
            });
            MachineSettingsPage.onPrinterSizeChanged();
        }  finally {
            ProgressBar.hide();
        }
    }

    static onImportChanged(file) {
        settings.enable("#import_settings", file);
    }

    static onImportClicked() {
        try {
            const el = settings.get("toml_file");
            ProfileManager.importConfiguration(el.data);
            el.clear();
            MachineSettingsPage.onPrinterSizeChanged();
            SelectProfilesPage.onImportChanged(false);
            SelectProfilesPage.onNext();
        } catch(e) {
            alert(["Error:", e.message, "Line:", e.line].join(" "));
        }
    }

    static onNext() {
        if(MaterialNotesPage.loadProfileNotes()) {
            settings.gotoPage("page_material_notes");
        } else {
            settings.gotoPage("page_place");
        }
    }

    static onProfileSourceChanged(e) {
        const source = e ? e.target.value : 'from-profiles';
        $(settings.ui).attr('data-profile-source', source);
        localStorage.setItem('profile-source', source);
    }

    static setProfileSource(source) {
        $('input[name="profile-source"]').prop('checked', false);
        $('input[name="profile-source"][value="' + source + '"]').prop('checked', true);
        $(settings.ui).attr('data-profile-source', source);
    }
}

class MaterialNotesPage {
    static init(s) {
        s.page(       "Material Notes",                              {id: "page_material_notes"});
        s.element({id: "material_notes"});
        s.footer();

        s.button(     "Next",                                        {onclick: MaterialNotesPage.onNext});
        s.buttonHelp( "Click this button to proceed to placing objects.");
    }

    static onNext() {
        settings.gotoPage("page_place");
    }

    static loadProfileNotes() {
        const metadata = ProfileManager.getSection("metadata");
        if(metadata && metadata.material_notes) {
            $("#material_notes").html(metadata.material_notes);
            return true;
        }
        $("#material_notes").empty();
        return false;
    }
}

class PlaceObjectsPage {
    static init(s) {
        s.page("Place Objects",                                      {id: "page_place"});

        let attr = {name: "load_source", onchange: PlaceObjectsPage.onLoadTypeChanged};
        s.radio( "Load 3D objects:",                                 {...attr, value: "3d", checked: "checked"});
        s.radio( "Load 2D images (as reliefs or lithophanes):",      {...attr, value: "2d"});
        s.separator();

        s.div({id: "load_models"});
        s.file("Drag and drop 3D objects<br><small>(STL, OBJ, 3MF or GCO)</small>",
                                                                     {id: "model_file", onchange: PlaceObjectsPage.onDropModel, mode: 'binary', multiple: 'multiple', accept: ".stl,.obj,.3mf,.gco,.gcode"});

        s.category("Place More");
        s.number(     "How many more to place?",                     {id: "place_quantity", value: "1", min: "1", max: "50", onchange: SettingsPanel.enforceMinMax});
        s.button(     "Place more",                                  {className: "place_more", onclick: PlaceObjectsPage.onAddToPlatform});
        s.div();

        s.div({id: "load_images"});
        s.file("Drag and drop 2D images<br><small>(JPG, PNG, BMP or GIF)</small>",
                                                                     {id: "image_file", onchange: PlaceObjectsPage.onDropImage, mode: 'file', 'accept': "image/*"});

        s.separator(                                                 {type: "br"});
        s.button(     "Create",                                      {id: "add_litho", onclick: PlaceObjectsPage.onAddLitho});
        s.div();

        s.footer();
        s.button(     "Next",                                        {className: "requires_objects", onclick: PlaceObjectsPage.onGotoSliceClicked});
        s.buttonHelp( "Click this button to proceed to slicing.");

        s.enable(".requires_objects", false);
    }

    static onObjectCountChanged(count) {
        settings.enable(".requires_objects", count > 0);
    }

    static onLoadTypeChanged(e) {
        let mode = e ? (typeof e == "string" ? e : e.target.value) : '3d';
        switch(mode) {
            case '3d': $("#load_models").show(); $("#load_images").hide(); break;
            case '2d': $("#load_models").hide(); $("#load_images").show(); break;
        }
        if(typeof e == "string") {
            $('[name="load_source"]').prop('checked', false);
            $("input[name=load_source][value=" + mode + "]").prop('checked', true);
        }
    }

    static onDropModel(data, filename) {
        // Check for pre-sliced gcode files
        if(filename) {
            const extension = filename.split('.').pop();
            if(extension == "gco" || extension == "gcode") {
                if(confirm("Loading pre-sliced G-code will clear any existing objects.\nAny printer, material or slicing choices you have made will be ignored.\nPrinting incompatible G-code could damage your printer.")) {
                    stage.removeAll();
                    PrintAndPreviewPage.setOutputGcodeName(filename);
                    PrintAndPreviewPage.readyToDownload(data);
                }
                return;
            }
        }
        // Handle regular model files
        if(data) {
            PrintAndPreviewPage.setOutputGcodeName(filename);
            ProgressBar.message("Preparing model");
            geoLoader.load(filename, data);
        } else {
            PlaceObjectsPage.onGeometryLoaded(null);
        }
    }

    static onDropImage(data, filename) {
        if(data) {
            PrintAndPreviewPage.setOutputGcodeName(filename);
        } else {
            PlaceObjectsPage.onGeometryLoaded(null);
        }
        settings.enable("#add_litho", data !== undefined);
    }

    static onAddLitho() {
        const filename = settings.get("image_file").filename;
        const data     = settings.get("image_file").data;
        ProgressBar.message("Preparing model");
        geoLoader.load(filename, data);
    }

    static onAddToPlatform() {
        const howMany = parseInt(settings.get("place_quantity"))
        for(var i = 0; i < howMany; i++) {
            stage.addGeometry(loaded_geometry);
        }
    }

    static onGeometryLoaded(geometry) {
        if(geometry) {
            loaded_geometry = geometry;
            settings.enable('.place_more', true);
            PlaceObjectsPage.onAddToPlatform(); // Place the first object automatically
        } else {
            settings.enable('.place_more', false);
            loaded_geometry = false;
        }
        ProgressBar.hide();
    }

    static onGotoSliceClicked() {
        settings.gotoPage("page_slice");
    }
}

class ObjectTransformPage {
    static init(s) {
        s.page(       "",                                            {id: "page_transform"});

        s.category(   "Position",                                    {id: "xform_position"});
        s.number(         "X",                                       {id: "xform_position_x", className: "axis_r", units: "mm", onchange: ObjectTransformPage.onEditPosition});
        s.number(         "Y",                                       {id: "xform_position_y", className: "axis_b", units: "mm", onchange: ObjectTransformPage.onEditPosition});
        s.number(         "Z",                                       {id: "xform_position_z", className: "axis_g", units: "mm", onchange: ObjectTransformPage.onEditPosition});

        s.category(   "Scale",                                       {id: "xform_scale"});
        s.number(         "X",                                       {id: "xform_scale_x_pct", className: "axis_r", units: "%", onchange: evt => ObjectTransformPage.onEditScalePct("X")});
        s.number(         "Y",                                       {id: "xform_scale_y_pct", className: "axis_g", units: "%", onchange: evt => ObjectTransformPage.onEditScalePct("Y")});
        s.number(         "Z",                                       {id: "xform_scale_z_pct", className: "axis_b", units: "%", onchange: evt => ObjectTransformPage.onEditScalePct("Z")});
        s.separator(                                                 {type: "br"});
        s.number(         "X",                                       {id: "xform_scale_x_abs", className: "axis_r", units: "mm", onchange: evt => ObjectTransformPage.onEditScaleAbs("X")});
        s.number(         "Y",                                       {id: "xform_scale_y_abs", className: "axis_g", units: "mm", onchange: evt => ObjectTransformPage.onEditScaleAbs("Y")});
        s.number(         "Z",                                       {id: "xform_scale_z_abs", className: "axis_b", units: "mm", onchange: evt => ObjectTransformPage.onEditScaleAbs("Z")});
        s.separator(                                                 {type: "br"});
        s.toggle(     "Uniform Scaling",                             {id: "xform_scale_uniform", checked: "checked"});

        s.category(   "Mirror",                                      {id: "xform_mirror"});
        s.button(     "X Axis",                                      {className: "axis_r", onclick: evt => ObjectTransformPage.onMirrorAxis("X")});
        s.button(     "Y Axis",                                      {className: "axis_g", onclick: evt => ObjectTransformPage.onMirrorAxis("Y")});
        s.button(     "Z Axis",                                      {className: "axis_b", onclick: evt => ObjectTransformPage.onMirrorAxis("Z")});

        s.category(   "Rotation",                                    {id: "xform_rotate"});
        s.number(         "X",                                       {id: "xform_rotation_x", className: "axis_r", units: "°", onchange: ObjectTransformPage.onEditRotation});
        s.number(         "Y",                                       {id: "xform_rotation_y", className: "axis_b", units: "°", onchange: ObjectTransformPage.onEditRotation});
        s.number(         "Z",                                       {id: "xform_rotation_z", className: "axis_g", units: "°", onchange: ObjectTransformPage.onEditRotation});
        s.category();

        s.element(                                                   {id: "object-out-of-bounds"});
        s.footer();
        s.button(     "Close",                                       {onclick: ObjectTransformPage.onTransformDismissed});
    }

    static onSelectionChanged() {
        ObjectTransformPage.onTransformChange("translate");
        ObjectTransformPage.onTransformChange("rotate");
        ObjectTransformPage.onTransformChange("scale");
    }

    static onToolChanged(mode) {
        settings.expand("xform_position",  mode == "move");
        settings.expand("xform_rotate",    mode == "rotate");
        settings.expand("xform_scale",     mode == "scale");
        settings.expand("xform_mirror",    mode == "mirror");
        settings.gotoPage("page_transform");
    }

    static onObjectUnselected() {
        $('#xform_position_x').val("");
        $('#xform_position_y').val("");
        $('#xform_position_z').val("");
        $('#xform_rotation_x').val("");
        $('#xform_rotation_y').val("");
        $('#xform_rotation_z').val("");
        $('#xform_scale_x_pct').val("");
        $('#xform_scale_y_pct').val("");
        $('#xform_scale_z_pct').val("");
        settings.dismissModal();
    }

    static setAxisScale(axis, value) {
        switch(axis) {
            case "X": $('#xform_scale_x_abs').val(value.toFixed(2)); break;
            case "Y": $('#xform_scale_y_abs').val(value.toFixed(2)); break;
            case "Z": $('#xform_scale_z_abs').val(value.toFixed(2)); break;
            case "X%": $('#xform_scale_x_pct').val((value * 100).toFixed(2)); break;
            case "Y%": $('#xform_scale_y_pct').val((value * 100).toFixed(2)); break;
            case "Z%": $('#xform_scale_z_pct').val((value * 100).toFixed(2)); break;
        }
    }

    static setAxisRotation(axis, value) {
        const toDeg = rad => (rad * 180 / Math.PI).toFixed(0);
        switch(axis) {
            case "X": $('#xform_rotation_x').val(toDeg(value)); break;
            case "Y": $('#xform_rotation_y').val(toDeg(value)); break;
            case "Z": $('#xform_rotation_z').val(toDeg(value)); break;
        }
    }

    static setAxisPosition(axis, value) {
        switch(axis) {
            case "X": $('#xform_position_x').val( value.toFixed(2)); break;
            case "Y": $('#xform_position_y').val( value.toFixed(2)); break;
            case "Z": $('#xform_position_z').val((value - stage.selectionHeightAdjustment).toFixed(2)); break;
        }
    }

    static onTransformDismissed() {
        settings.dismissModal();
        stage.onTransformDismissed();
    }

    static onEditPosition() {
        stage.selection.position.x = settings.get("xform_position_x");
        stage.selection.position.y = settings.get("xform_position_y");
        stage.selection.position.z = settings.get("xform_position_z") + stage.selectionHeightAdjustment;
        stage.onTransformEdit(false);
    }

    static onEditScaleAbs(axis) {
        var dim = stage.getSelectionDimensions(false);
        switch(axis) {
            case "X": ObjectTransformPage.setAxisScale("X%", settings.get("xform_scale_x_abs") / dim.x); ObjectTransformPage.onEditScalePct("X"); break;
            case "Y": ObjectTransformPage.setAxisScale("Y%", settings.get("xform_scale_y_abs") / dim.y); ObjectTransformPage.onEditScalePct("Y"); break;
            case "Z": ObjectTransformPage.setAxisScale("Z%", settings.get("xform_scale_z_abs") / dim.z); ObjectTransformPage.onEditScalePct("Z"); break;
        }
    }

    static onEditScalePct(axis) {
        var x_percent = settings.get("xform_scale_x_pct") / 100;
        var y_percent = settings.get("xform_scale_y_pct") / 100;
        var z_percent = settings.get("xform_scale_z_pct") / 100;
        const uniform = settings.get("xform_scale_uniform");
        if(uniform) {
            switch(axis) {
                case "X": y_percent = z_percent = x_percent; break;
                case "Y": x_percent = z_percent = y_percent; break;
                case "Z": x_percent = y_percent = z_percent; break;
            }
        }
        stage.selection.scale.x = x_percent;
        stage.selection.scale.y = y_percent;
        stage.selection.scale.z = z_percent;
        ObjectTransformPage.onTransformChange("scale");
        stage.onTransformEdit();
    }

    static onMirrorAxis(axis) {
        switch(axis) {
            case "X": stage.selection.scale.x *= -1; break;
            case "Y": stage.selection.scale.y *= -1; break;
            case "Z": stage.selection.scale.z *= -1; break;
        }
        stage.onTransformEdit();
    }

    static onEditRotation() {
        const toRad = deg => deg * Math.PI / 180;
        stage.selection.rotation.x = toRad(settings.get("xform_rotation_x"));
        stage.selection.rotation.y = toRad(settings.get("xform_rotation_y"));
        stage.selection.rotation.z = toRad(settings.get("xform_rotation_z"));
        stage.onTransformEdit();
    }

    static onTransformChange(mode) {
        const toDeg = rad => (rad * 180 / Math.PI).toFixed(0);
        switch(mode) {
            case "translate":
                const pos = stage.selection.position;
                ObjectTransformPage.setAxisPosition("X", pos.x);
                ObjectTransformPage.setAxisPosition("Y", pos.y);
                ObjectTransformPage.setAxisPosition("Z", pos.z);
                break;
            case "rotate":
                ObjectTransformPage.setAxisRotation("X", stage.selection.rotation.x);
                ObjectTransformPage.setAxisRotation("Y", stage.selection.rotation.y);
                ObjectTransformPage.setAxisRotation("Z", stage.selection.rotation.z);
                break;
            case "scale":
                ObjectTransformPage.setAxisScale("X%", stage.selection.scale.x);
                ObjectTransformPage.setAxisScale("Y%", stage.selection.scale.y);
                ObjectTransformPage.setAxisScale("Z%", stage.selection.scale.z);
                var dim = stage.getSelectionDimensions();
                ObjectTransformPage.setAxisScale("X", dim.x);
                ObjectTransformPage.setAxisScale("Y", dim.y);
                ObjectTransformPage.setAxisScale("Z", dim.z);
                break;
        }
    }

    static set transformOutOfBoundsError(isOutside) {
        if(isOutside) {
            $("#object-out-of-bounds").show();
        } else {
            $("#object-out-of-bounds").hide();
        }
    }
}

class SliceObjectsPage {
    static init(s) {
        SliceObjectsPage.initSlicerHelpers(s);

        s.page(       "Slice Objects",                               {id: "page_slice", className: "scrollable"});

        for(const item of SliceObjectsPage.slicerSettings) {
            if(item.endsWith(":")) {
                s.category(item.slice(0,-1));
            } else if(!item.startsWith("#")){
                s.fromSlicer(item);
            }
        }

        s.category(   "Save Settings to File");
        s.text(       "Save as:",                                    {id: "save_filename", value: "slicer_settings.toml", className: "webapp-only filename"});
        s.separator(                                                 {type: "br"});
        s.button(     "Save",                                        {onclick: SliceObjectsPage.onExportClicked});
        s.buttonHelp( "Click this button to save the slicer settings to a file on your computer.");

        s.footer();
        s.button(     "Slice",                                       {onclick: SliceObjectsPage.onSliceClicked});
        s.buttonHelp( "Click this button to generate a G-code file for printing.");
    }

    /**
     * Helper function for obtaining UI parameters from the slicer engine
     */
    static initSlicerHelpers(s) {
        var valueSetter = {};

        s.fromSlicer = function(key, attr) {
            var sd = slicer.getOptionDescriptor(key);
            var label = sd.hasOwnProperty("label") ? sd.label : key;
            var el;
            var attr = {
                ...attr,
                units:   sd.unit,
                tooltip: sd.description,
                id:      key
            };
            switch(sd.type) {
                case 'float':
                case 'int':
                    el = s.number(label, {...attr, step: sd.type == 'int' ? 1 : 0.01});
                    valueSetter[key] = (key, val) => {el.value = val;}
                    el.addEventListener('change', (event) => slicer.setOption(key, parseFloat(event.target.value)));
                    break;
                case 'str':
                    el = s.textarea(label + ":", attr);
                    valueSetter[key] = (key, val) => {el.value = val;}
                    el.addEventListener('change', (event) => slicer.setOption(key, event.target.value));
                    break;
                case 'bool':
                    el = s.toggle(label, attr);
                    valueSetter[key] = (key, val) => {el.checked = val;}
                    el.addEventListener('change', (event) => slicer.setOption(key,el.checked));
                    break;
                case 'enum':
                    var o = s.choice(label, attr);
                    for(const [value, label] of Object.entries(sd.options)) {
                        o.option(label, {value: value});
                    }
                    valueSetter[key] = (key, val) => {o.element.value = val;}
                    o.element.addEventListener('change', (event) => slicer.setOption(key, event.target.value));
                    break;
            }
        }

        slicer.onOptionChanged =    (name, val)  => {if(valueSetter.hasOwnProperty(name)) valueSetter[name](name, val);};
        slicer.onAttributeChanged = (name, attr) => {s.setVisibility("#" + name, attr.enabled);};
    }

    static onSliceClicked() {
        var geometries = stage.getAllGeometry();
        if(geometries.length) {
            var geometries = stage.getAllGeometry();
            var filenames  = geometries.map((geo,i) => {
                var filename = 'input_' + i + '.stl';
                slicer.loadFromGeometry(geo, filename);
                return filename;
            });
            Log.clear();
            ProgressBar.message("Slicing...");
            ProgressBar.progress(0);
            slicer.slice(filenames);
        }
    }

     static onExportClicked() {
        const options = {unchanged: false};
        const filename = settings.get("save_filename");
        AdvancedFeaturesPage.exportConfiguration(filename, options);
    }
}

class PrintAndPreviewPage {
    static init(s) {
        s.page(       "Print and Preview",                           {id: "page_print"});

        s.category(   "Print Statistics",                            {open: "open"});
        s.text(           "Print time",                              {id: "print_time", className: "readonly"});
        s.number(         "Filament used",                           {id: "print_filament", units: "m", className: "readonly"});

        s.category(   "Preview Options",                             {open: "open"});
        s.toggle(         "Show shell",                              {id: "show_shell", onclick: PrintAndPreviewPage.onUpdatePreview, checked: 'checked'});
        s.toggle(         "Show infill",                             {id: "show_infill", onclick: PrintAndPreviewPage.onUpdatePreview});
        s.toggle(         "Show supports",                           {id: "show_support", onclick: PrintAndPreviewPage.onUpdatePreview});
        s.toggle(         "Show travel",                             {id: "show_travel", onclick: PrintAndPreviewPage.onUpdatePreview});
        s.slider(         "Show layer",                              {id: "preview_layer", oninput: PrintAndPreviewPage.onUpdateLayer});
        s.number(         "Top layer",                               {id: "current_layer", className: "readonly"});

        s.category(   "Print Options",                               {open: "open"});
        const attr = {name: "print_destination", onchange: PrintAndPreviewPage.onOutputChanged};
        s.radio( "Print through a USB cable:",                       {...attr, value: "print-to-usb"});
        s.radio( "Print to printer wirelessly:",                     {...attr, value: "print-to-wifi"});
        s.radio( "Save G-code to printer wirelessly:",               {...attr, value: "save-to-wifi"});
        s.radio( "Save G-code to file for printing:",                {...attr, value: "save-to-file", checked: "checked"});

        /* Choices for wireless and saving to file */
        s.text(           "Save as:",                                {id: "gcode_filename",  className: "gcode_filename filename", value: "output.gcode"});
        s.choice(         "Wireless capable printer:",               {id: "printer_choices", className: "printer_choices"});
        s.category();

        s.element(                                                   {id: "gcode-out-of-bounds"});

        s.footer();

        s.div({className: "print-to-usb"});
        s.button(     "Print",                                       {onclick: PrintAndPreviewPage.onPrintClicked});
        s.buttonHelp( "Click this button to print to your printer via a USB cable.");
        s.div();

        s.div({className: "print-to-wifi"});
        s.button(     "Print",                                       {onclick: PrintAndPreviewPage.onPrintToWiFi});
        s.buttonHelp( "Click this button to print to your printer wirelessly.");
        s.div();

        s.div({className: "save-to-wifi"});
        s.button(     "Save",                                        {onclick: PrintAndPreviewPage.onUploadToWiFi});
        s.buttonHelp( "Click this button to save G-code to your printer wirelessly (without printing).");
        s.div();

        s.div({className: "save-to-file"});
        s.button(     "Save",                                        {onclick: PrintAndPreviewPage.onDownloadClicked});
        s.buttonHelp( "Click this button to save G-code for your printer to a file.");
        s.div();

        const defaultOutput = localStorage.getItem('data-output') || 'file';
        PrintAndPreviewPage.setOutput(defaultOutput);

        ConfigWirelessPage.manageWirelessMenu("printer_choices");
    }

    static updateOutputChoices() {
        const selectedChoice = settings.get("print_destination");
        let selectedChoiceHidden = false;

        function showOrHide(id, show) {
            if(show) {
                $("input[value='" + id + "']").parent().show();
            } else {
                $("input[value='" + id + "']").parent().hide();
                if(selectedChoice == id) selectedChoiceHidden = true;
            }
        }

        const hasWireless = ConfigWirelessPage.savedProfileCount() > 0;
        showOrHide("print-to-usb",  hasSerial);
        showOrHide("print-to-wifi", hasWireless);
        showOrHide("save-to-wifi",  hasWireless);

        if(selectedChoiceHidden) {
            PrintAndPreviewPage.setOutput("save-to-file");
        }
    }

    static setOutput(what) {
        $('input[name="print_destination"]').prop('checked', false);
        $('input[name="print_destination"][value="' + what + '"]').prop('checked', true);
        this.onOutputChanged(what)
    }

    static onOutputChanged(e) {
        const dataOutput = e.target ? e.target.value : e;
        $(settings.ui).attr('data-output', dataOutput);
        localStorage.setItem('data-output', dataOutput);
    }

    static onUpdatePreview() {
        stage.showGcodePath("TRAVEL",            settings.get("show_travel"));
        stage.showGcodePath("SKIN",              settings.get("show_shell"));
        stage.showGcodePath("DEFAULT",           settings.get("show_shell"));
        stage.showGcodePath("WALL-OUTER",        settings.get("show_shell"));
        stage.showGcodePath("WALL-INNER",        settings.get("show_shell"));
        stage.showGcodePath("FILL",              settings.get("show_infill"));
        stage.showGcodePath("SKIRT",             settings.get("show_support"));
        stage.showGcodePath("SUPPORT",           settings.get("show_support"));
        stage.showGcodePath("SUPPORT-INTERFACE", settings.get("show_support"));
        settings.enable("#preview_layer", stage.isToolpathVisible);
    }

    static onUpdateLayer() {
        const layer = Math.trunc(settings.get("preview_layer"));
        stage.setGcodeLayer(layer);
        $('#current_layer').val(layer);
    }

    static readyToDownload(data) {
        ProgressBar.hide();
        settings.gotoPage("page_print");
        var decoder = new TextDecoder();
        this.loadSlicedGcode(decoder.decode(data));
    }

    static extractDataFromGcodeHeader(gcode) {
        function getField(str) {
            const r = new RegExp('^;' + str + ':\\s*([-0-9.]+)','m');
            const m = gcode.match(r);
            return m ? parseFloat(m[1]) : 0;
        }
        function toHMS(time) {
            const hrs = Math.floor(time / 3600);
            const min = Math.floor((time % 3600) / 60);
            const sec = Math.floor(time % 60);
            return hrs.toString().padStart(2, '0') + "h " +
                   min.toString().padStart(2, '0') + "m " +
                   sec.toString().padStart(2, '0') + "s";
        }
        const bounds = {
            min: {x: getField("MINX"), y: getField("MINY"), z: getField("MINZ")},
            max: {x: getField("MAXX"), y: getField("MAXY"), z: getField("MAXZ")}
        };
        const time_hms = toHMS(getField("TIME"));
        const filament = getField("Filament used");
        PrintAndPreviewPage.setPrintBounds(bounds);
        PrintAndPreviewPage.setPrintTime(time_hms);
        PrintAndPreviewPage.setPrintFilament(filament.toFixed(2));
    }

    static loadSlicedGcode(str) {
        gcode_blob = new Blob([str], {type: "text/plain"});
        var path = new GCodeParser(str);
        stage.setGcodePath(path);
        const max = Math.max(0, stage.getGcodeLayers() - 1);
        $("#preview_layer").attr("max", max).val(max);
        $('#preview_layer').val(max);
        $('#current_layer').val(max);
        PrintAndPreviewPage.extractDataFromGcodeHeader(str);
        PrintAndPreviewPage.onUpdatePreview();
    }

    static nothingToPrint() {
        if(!gcode_blob) {
            alert("There is nothing to print")
            return true;
        }
        return false;
    }

    static onDownloadClicked() {
        if(PrintAndPreviewPage.nothingToPrint()) return;
        const name = settings.get("gcode_filename");
        saveAs(gcode_blob, name);
    }

    static async onPrintClicked() {
        if(PrintAndPreviewPage.nothingToPrint()) return;
        try {
            await stream_gcode(await gcode_blob.text());
        } catch(err) {
            if(!(err instanceof PrintAborted)) {
                // Report all errors except for user initiated abort
                console.error(err);
                alert(err);
            }
        }
    }

    static async onPrintToWiFi() {
        if(PrintAndPreviewPage.nothingToPrint()) return;
        const file = SynDaverWiFi.fileFromBlob("printjob.gco", gcode_blob);
        try {
            await ConfigWirelessPage.queueFile(file);
            if(isDesktop) {
                settings.gotoPage("page_monitor_wifi");
            }
        } catch (e) {
            console.error(e);
            alert(e);
        }
    }

    static async onUploadToWiFi() {
        if(PrintAndPreviewPage.nothingToPrint()) return;
        const name = settings.get("gcode_filename");
        const file = SynDaverWiFi.fileFromBlob(name, gcode_blob);
        alert('The file will be saved to your printer for printing later.\n\nYou may start a print through the web management interface by selecting "Wireless Printing" from the menu and then clicking "Manage..."')
        try {
            await ConfigWirelessPage.uploadFiles([file]);
        } catch (e) {
            console.error(e);
            alert(e);
        }
    }

    static setPrintTime(value) {
        $("#print_time").attr("value",value);
    }

    static setPrintFilament(value) {
        $("#print_filament").attr("value",value);
    }

    static setPrintBounds(bounds) {
        if( bounds.min.x < 0 ||
            bounds.min.y < 0 ||
            bounds.min.z < 0 ||
            bounds.max.x > $('#machine_width').val() ||
            bounds.max.y > $('#machine_depth').val() ||
            bounds.max.y > $('#machine_height').val()) {
            $("#gcode-out-of-bounds").show();
            console.warn("The print will fall outside the printer's printable area");
        } else {
            $("#gcode-out-of-bounds").hide();
        }
    }

    static setOutputGcodeName(filename) {
        const filepart = x => x.substr(0, x.lastIndexOf('.')) || x;
        document.getElementById("gcode_filename").value = filepart(filename) + ".gco";
    }
}

class MachineSettingsPage {
    static init(s) {
        s.page(       "Machine Settings",                            {id: "page_machine"});

        s.category(   "Printhead Settings");
        s.fromSlicer(     "machine_nozzle_size");
        s.fromSlicer(     "machine_head_with_fans_x_min");
        s.fromSlicer(     "machine_head_with_fans_y_min");
        s.fromSlicer(     "machine_head_with_fans_x_max");
        s.fromSlicer(     "machine_head_with_fans_y_max");
        s.fromSlicer(     "gantry_height");

        s.category(   "Auto Leveling");
        s.fromSlicer(     "machine_probe_type");

        s.category(   "Build Volume");
        s.fromSlicer(     "machine_shape");
        s.fromSlicer(     "machine_width",                           {className: "axis_r"});
        s.fromSlicer(     "machine_depth",                           {className: "axis_g"});
        s.fromSlicer(     "machine_height",                          {className: "axis_b"});
        s.fromSlicer(     "machine_center_is_zero");
        s.fromSlicer(     "machine_heated_bed");
        s.button(     "Save Changes",                                {onclick: MachineSettingsPage.onPrinterSizeChanged});

        s.category(   "Start &amp; End G-code");
        s.buttonHelp( "Template to edit:");
        s.button(         "Start",                                   {onclick: MachineSettingsPage.onEditStartGcode});
        s.button(         "End",                                     {onclick: MachineSettingsPage.onEditEndGcode});
    }

    static onPrinterSizeChanged() {
        stage.setPrinterCharacteristics({
            circular:          settings.get("machine_shape") == "elliptic",
            origin_at_center:  settings.get("machine_center_is_zero"),
            x_width:           settings.get("machine_width"),
            y_depth:           settings.get("machine_depth"),
            z_height:          settings.get("machine_height")
        });
        stage.arrangeObjectsOnPlatform();
        renderLoop.setView("front");
    }

    static onEditStartGcode() {
        settings.gotoPage("page_start_gcode");
    }

    static onEditEndGcode() {
        settings.gotoPage("page_end_gcode");
    }
}

class StartAndEndGCodePage {
    static init(s) {
        s.page(       "",                                            {id: "page_start_gcode"});
        s.fromSlicer(     "machine_start_gcode");
        s.button(         "Done",                                    {onclick: StartAndEndGCodePage.doneEditingGcode});

        s.page(       "",                                            {id: "page_end_gcode"});
        s.fromSlicer(     "machine_end_gcode");
        s.button(         "Done",                                    {onclick: StartAndEndGCodePage.doneEditingGcode});
    }

    static doneEditingGcode() {
        settings.gotoPage("page_machine");
    }
}

class AdvancedFeaturesPage {
    static init(s) {
        s.page(       "Advanced Features",                           {id: "page_advanced"});

        s.category(   "User Interface");
        s.choice(         "Theme:",                                  {id: "ui-theme"})
         .option(             "SynDaver 3D",                         {value: "syndaver-3d"})
         .option(             "Classic",                             {value: "classic"})
         .option(             "Darkness",                            {value: "darkness"})
         .option(             "Sporty",                              {value: "sporty"});
        s.color(          "Accent Color:",                           {id: "ui-accent"});
        s.button(         "Apply",                                   {onclick: AdvancedFeaturesPage.onApplyTheme})

        s.category(   "Slicer Output");
        s.button(     "Show",                                        {onclick: Log.show});
        s.buttonHelp( "Click this button to show slicing engine logs.");

        s.category(   "Save Settings with Comments");
        s.toggle(         "Save units and choices",                  {id: "export_with_choices"});
        s.toggle(         "Save description",                        {id: "export_with_descriptions"});
        s.toggle(         "Save implicit values",                    {id: "export_with_unchanged",
           tooltip: "Include all values, including those absent in profiles and unchanged by the user. This provides documentation for values that may have been implicitly computed from other settings."});
        s.separator(                                                 {type: "br"});
        s.text(       "Save as:",                                    {id: "export_filename", value: "slicer_settings.toml", className: "webapp-only filename"});
        s.separator(                                                 {type: "br"});
        s.button(     "Save",                                        {onclick: AdvancedFeaturesPage.onExportClicked});
        s.buttonHelp( "Click this button to save current settings to a file on your computer.");

        s.category(   "Data Sources");
        s.html('<div id="profile_sources_warn">These options are for advanced users and are not supported by SynDaver. Use at your own risk.</div><br>');
        s.textarea("Profile URLs:",                                  {id: "profile_sources", spellcheck: "false",
            tooltip: "Network URLs to \"profile_list.toml\" files for profiles (one per line)."});
        s.button(     "Save",                                        {onclick: AdvancedFeaturesPage.onSaveProfileSources});

        AdvancedFeaturesPage.refreshDataSources();
        AdvancedFeaturesPage.verifyThemeSelection();
    }

    static onApplyTheme() {
        localStorage.setItem("ui-theme",  settings.get("ui-theme"));
        localStorage.setItem("ui-accent", settings.get("ui-accent"));
        location.reload();
    }

    static verifyThemeSelection() {
        const dropdown = document.getElementById('ui-theme');
        const accent   = document.getElementById('ui-accent');
        const theme    = localStorage.getItem("ui-theme");
        accent.value   = localStorage.getItem("ui-accent") || "#fafad2";
        dropdown.value = theme;
        if (dropdown.value !== theme) {
            dropdown.selectedIndex = 0;
            this.onApplyTheme();
        }
    }

    static cssAccentColorRule(color) {
        const rgb = parseHexColor(color);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return ":root {" +
            "--accent-rgb: " + color + ";" +
            "--accent-inv: " + formatHexColor(255-rgb.r,255-rgb.g,255-rgb.b) + ";" +
            "--accent-h: " + hsl.h + ";" +
            "--accent-s: " + hsl.s + "%;" +
            "--accent-l: " + hsl.l + "%;" +
            "};"
    }

    static linkThemeStyleSheet() {
        const theme = localStorage.getItem("ui-theme") || "classic";
        // Apply the stylesheet
        const link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "css/themes/" + theme + ".css";
        link.onload = function () {
            PrintableObject.applyStyleSheetColors();
            PrinterRepresentation.applyStyleSheetColors();
            Stage.applyStyleSheetColors();
            renderLoop.applyStyleSheetColors();
            onStyleSheetReady();
        };
        document.head.appendChild(link);
        // Add a special entry for the accent color
        if(!this.styles) {
            this.styles = document.createElement("style");
            document.head.appendChild(this.styles);
        }
        this.styles.innerText = this.cssAccentColorRule(localStorage.getItem("ui-accent") || "#fafad2");
    }

    static refreshDataSources() {
        document.getElementById("profile_sources").value = ProfileLibrary.getURLs();
    }

    static onSaveProfileSources() {
        ProfileLibrary.setURLs(settings.get("profile_sources"));
        alert("These changes will take into effect when you next start Symple Slicer");
    }

    static onExportClicked() {
        const options = {
            descriptions: settings.get("export_with_descriptions"),
            unchanged:    settings.get("export_with_unchanged"),
            choices:      settings.get("export_with_choices")
        };
        const filename = settings.get("export_filename");
        AdvancedFeaturesPage.exportConfiguration(filename, options);
    }
    
    static exportConfiguration(filename, options) {
        const config = ProfileManager.exportConfiguration(options);
        const blob = new Blob([config], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
    }
}

class ConfigWirelessPage {
    static init(s) {
        s.page(       "Wireless Printing",                           {id: "page_config_wifi"});

        const no_save = {oninput: ConfigWirelessPage.onInput};
        const to_save = {oninput: ConfigWirelessPage.onInput, onchange: ConfigWirelessPage.onChange};
        s.heading(   "Printer Configuration:");
        s.text(           "Choose Printer Name:",                    {...to_save, id: "printer_name", placeholder: "Required",
                                                                         tooltip: "Choose a name for this printer", dropdown: true});
        s.text(           "Set Printer Password:",                   {...to_save, id: "printer_pass", placeholder: "Required",
                                                                         tooltip: "Set a password to prevent unauthorized use of your printer"});
        s.text(           "IP Address:",                             {...to_save, id: "printer_addr", placeholder: "Use DHCP if blank",
                                                                          tooltip: "Leave this blank to allow the printer to select an address via DHCP; once the printer connects it will show you an address to type in here"});

        s.heading("Network Configuration:");
        s.text(           "Network Name (SSID):",                    {...to_save, id: "wifi_ssid",    placeholder: "Required",
                                                                         tooltip: "Type in the name of the wireless access point you want your printer to connect to"});
        s.text(           "Network Password:",                       {...no_save, id: "wifi_pass",    placeholder: "Required",
                                                                         tooltip: "Type in the password of the wireless access point you want your printer to connect to"});

        s.button(     "Remember",                                    {onclick: ConfigWirelessPage.onRememberClicked, id: "remember_wifi_btn"});
        s.button(     "Forget",                                      {onclick: ConfigWirelessPage.onForgetClicked,   id: "forget_wifi_btn"});
        if(isDesktop) {
            s.button( "Monitor",                                     {onclick: ConfigWirelessPage.onMonitorClicked,  className: "canUpload"});
        }
        s.button(     "Manage\u2026",                                {onclick: ConfigWirelessPage.onManageClicked,   className: "canUpload"});
        s.separator();
        s.button(     "Export",                                      {onclick: ConfigWirelessPage.onExportClicked, id: "export_config_btn"});
        s.buttonHelp( "Click to export configuration G-code for a wireless-capable SynDaver printer");

        ConfigWirelessPage.loadSettings();
        ConfigWirelessPage.onInput();
        ConfigWirelessPage.updateWirelessMenu();
        PrintAndPreviewPage.updateOutputChoices();

        document.getElementById("printer_name").addEventListener("change", ConfigWirelessPage.onNameChange);
    }

    static loadSettings() {
        let loadFromStorage = id => document.getElementById(id).value = localStorage.getItem(id) || "";

        loadFromStorage("wifi_ssid");
        loadFromStorage("printer_name");
        loadFromStorage("printer_pass");
        loadFromStorage("printer_addr");
    }

    static onNameChange() {
        ConfigWirelessPage.loadWirelessProfile(event.currentTarget.value);
    }

    static onChange() {
        // Save all changed elements to local storage
        localStorage.setItem(event.currentTarget.id,event.currentTarget.value);
    }

    static onExportClicked() {
        const wifi_ssid    = settings.get("wifi_ssid");
        const wifi_pass    = settings.get("wifi_pass");
        let   printer_addr = settings.get("printer_addr");
        const printer_pass = settings.get("printer_pass");
        const printer_name = settings.get("printer_name");
        if(!printer_addr) {
            printer_addr = "dhcp";
        }
        const config =
            "M118 P0 wifi_mode: sta\n" +
            "M118 P0 wifi_ssid: " + wifi_ssid + "\n" +
            "M118 P0 wifi_pass: " + wifi_pass + "\n" +
            "M118 P0 printer_addr: " + printer_addr + "\n" +
            "M118 P0 printer_pass: " + printer_pass + "\n" +
            "M118 P0 printer_name: " + printer_name + "\n" +
            "M118 P0 wifi_save_config\n" +
            "M118 P0 wifi_restart\n";
        const blob = new Blob([config], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "wifi_config.gco");
        if(printer_addr == "dhcp") {
            alert("After running the G-code on the printer, please type the address displayed by the printer in the \"IP Address\" field (example: 192.168.0.10) and then click \"Remember\"");
            document.getElementById("printer_addr").placeholder = "Enter printer's IP here";
        }
    }

    static onRememberClicked() {
        ConfigWirelessPage.saveWirelessProfile();
        ConfigWirelessPage.updateWirelessMenu();
        PrintAndPreviewPage.updateOutputChoices();
        ConfigWirelessPage.onInput(); // Change disabled state of "Forget" button
        alert("The settings have been saved");
    }

    static onForgetClicked() {
        if(confirm("You are about to remove this printer from Symple Slicer. Press OK to proceed.")) {
            ConfigWirelessPage.forgetWirelessProfile();
            ConfigWirelessPage.updateWirelessMenu();
            PrintAndPreviewPage.updateOutputChoices();
            ConfigWirelessPage.onInput(); // Change the state of the "Forget" button
        }
    }

    static onManageClicked() {
        const printer_addr = settings.get("printer_addr");
        const printer_pass = settings.get("printer_pass");
        WebWifiConnector.postMessageToTab(printer_addr, {password: printer_pass});
    }

    static onMonitorClicked() {
        settings.gotoPage("page_monitor_wifi");
    }

    static profileContains(fields) {
        for (const field of fields) {
            if(!settings.get(field).length) return false;
        }
        return true;
    }

    static setHostnameAndPassword() {
        if(!ConfigWirelessPage.profileContains(["printer_pass","printer_addr"])) {
            throw Error("Please configure wireless printing using the \"Configure Wireless\" from the \"Tasks\" menu");
        }
        const printer_addr = settings.get("printer_addr");
        const printer_pass = settings.get("printer_pass");
        SynDaverWiFi.setHostname('http://' + printer_addr);
        SynDaverWiFi.setPassword(printer_pass);
    }

    static onInput() {
        settings.enable(".canUpload",          ConfigWirelessPage.profileContains(["printer_addr", "printer_pass"]));
        settings.enable("#export_config_btn",  ConfigWirelessPage.profileContains(["printer_name", "printer_pass", "wifi_ssid", "wifi_pass"]));
        settings.enable("#remember_wifi_btn",  ConfigWirelessPage.profileContains(["printer_name", "printer_pass", "wifi_ssid", "printer_addr"]));
        settings.enable("#forget_wifi_btn",    ConfigWirelessPage.isWirelessProfileSaved());
    }

    // Uploads files to the wireless module
    static async uploadFiles(files) {
        ProgressBar.message("Sending to printer");
        if(isDesktop) {
            ConfigWirelessPage.setHostnameAndPassword();
            SynDaverWiFi.onProgress((bytes, totalBytes) => ProgressBar.progress(bytes/totalBytes));
            try {
                await SynDaverWiFi.uploadFiles(files);
            } finally {
                ProgressBar.hide();
            }
        } else {
            // When running on the web, it is necessary to post a message to
            // the wifi module rather than sending files directly.
            const printer_addr = settings.get("printer_addr");
            const printer_pass = settings.get("printer_pass");
            WebWifiConnector.postMessageAsEmbed(printer_addr, {password: printer_pass, files: files});
        }
    }

    // Queue a file for printing on the wireless module, send separator if printer is busy
    static async queueFile(file) {
        if(await MonitorWirelessPage.isPrinterBusy()) {
            if(confirm("The printer is busy. Click OK to queue the file for printing next.")) {
                const scripts = ProfileManager.getSection("scripts");
                files.unshift(SynDaverWiFi.fileFromStr("printjob.gco", scripts.next_print_gcode || ""));
            } else {
                return;
            }
        }
        await ConfigWirelessPage.uploadFiles([file]);
    }

    /* The current wireless print profile is always stored in the elements of this page. However, to allow
     * a user to have multiple printers, a drop down (in the PrintAndPreviewPage) lets the user select
     * profiles by name. When a profile is selected, the current settings are saved to local storage and
     * a new set of settings is read in.
     */

    static manageWirelessMenu(id) {
        ConfigWirelessPage.dropdown = document.getElementById(id);
    }

    static updateWirelessMenu() {
        if(ConfigWirelessPage.dropdown) {
            const el = ConfigWirelessPage.dropdown;
            const selectedProfile   = settings.get("printer_name");
            const availableProfiles = Object.keys(ConfigWirelessPage.loadWirelessProfileList());
            el.options.length = 0;
            for(const k of availableProfiles) {
                el.add(new Option(k, k, false, k == selectedProfile));
            }
            el.onchange = ConfigWirelessPage.onProfileChanged;
            if(!availableProfiles.includes(selectedProfile)) {
                el.selectedIndex = -1;
            }
            document.getElementById("printer_name").setChoices(availableProfiles);
        }
    }

    static savedProfileCount() {
        if(ConfigWirelessPage.dropdown) {
            const el = ConfigWirelessPage.dropdown;
            return el.options.length;
        }
        return 0;
    }

    static async onProfileChanged(event) {
        ConfigWirelessPage.changeWirelessProfile(event.target.value);
        await MonitorWirelessPage.checkIfPrinterIdle();
    }

    static loadWirelessProfileList() {
       // Retreive the saved profile list
        const value = localStorage.getItem("wifi_profiles");
        return (value && JSON.parse(value)) || {};
    }

    static saveWirelessProfileList(profiles) {
        localStorage.setItem("wifi_profiles", JSON.stringify(profiles));
    }

    static saveWirelessProfile() {
        if(ConfigWirelessPage.profileContains(["printer_name", "printer_addr", "printer_pass", "wifi_ssid"])) {
            const profiles = ConfigWirelessPage.loadWirelessProfileList();
            profiles[settings.get("printer_name")] = {
                printer_name: settings.get("printer_name"),
                printer_addr: settings.get("printer_addr"),
                printer_pass: settings.get("printer_pass"),
                wifi_ssid:    settings.get("wifi_ssid")
            }
            ConfigWirelessPage.saveWirelessProfileList(profiles);
        }
    }

    static isWirelessProfileSaved() {
        if(settings.get("printer_name").length) {
            const profiles = ConfigWirelessPage.loadWirelessProfileList();
            return profiles.hasOwnProperty(settings.get("printer_name"));
        } else {
            return false;
        }
    }

    static forgetWirelessProfile() {
        const profiles = ConfigWirelessPage.loadWirelessProfileList();
        delete profiles[settings.get("printer_name")];
        let clearFromStorage = id => {document.getElementById(id).value = ""; localStorage.removeItem(id)};
        clearFromStorage("printer_name");
        clearFromStorage("printer_pass");
        clearFromStorage("printer_addr");
        clearFromStorage("wifi_ssid");
        clearFromStorage("wifi_pass");
        document.getElementById("printer_addr").placeholder = "Use DHCP if blank";
        ConfigWirelessPage.saveWirelessProfileList(profiles);
    }

    static loadWirelessProfile(profileName) {
        const profiles = ConfigWirelessPage.loadWirelessProfileList();
        if(profiles.hasOwnProperty(profileName)) {
            let loadFromProfile = id => {
                const value = profiles[profileName][id] || "";
                document.getElementById(id).value = value;
                localStorage.setItem(id,value);
            }
            loadFromProfile("printer_name");
            loadFromProfile("printer_pass");
            loadFromProfile("printer_addr");
            loadFromProfile("wifi_ssid");
        }
        ConfigWirelessPage.saveWirelessProfileList(profiles);
    }

    static changeWirelessProfile(profileName) {
        ConfigWirelessPage.saveWirelessProfile();
        ConfigWirelessPage.loadWirelessProfile(profileName);
        ConfigWirelessPage.onInput(); // Change the state of the "Forget" button
    }
}

class MonitorWirelessPage {
    static init(s) {
        s.page(     null,                                            {id: "page_monitor_wifi"});
        s.text(     "Printer state:",                                {id: "wifi_state", className: "readonly"});
        s.number(   "Signal strength:",                              {id: "wifi_strength", units: "dBm", className: "readonly"});
        s.separator(                                                 {type: "br"});
        s.progress( "Print progress:",                               {id: "wifi_progress", value: 0});
        s.button(   "Stop",                                          {id: "wifi_stop", onclick: MonitorWirelessPage.stopPrint, disabled: "disabled"});
        s.button(   "Pause",                                         {id: "wifi_pause_resume", onclick: MonitorWirelessPage.pauseResumePrint, disabled: "disabled"});
        s.footer();
        s.button(   "Close",                                         {onclick: MonitorWirelessPage.onClose});

        setInterval(this.onTimer, 5000);
    }

    static onClose() {
        settings.dismissModal();
    }

    static async catchErrors(callback) {
        try {
            ConfigWirelessPage.setHostnameAndPassword();
            return await callback();
        } catch (e) {
            console.error(e);
            alert(e);
        }
    }

    // If desktop, checks whether the printer is busy.
    // If web, always returns false.
    static async isPrinterBusy() {
        if(!isDesktop) return false;
        const printer_addr = settings.get("printer_addr");
        if(printer_addr.length == 0) return false;
        const result = await fetchJSON('http://' + printer_addr + "/status");
        return result.state == "printing" ||  result.state == "paused";
    }

    // If desktop, checks whether the printer is idle
    // If web, always returns true.
    static async checkIfPrinterIdle() {
        if(!await MonitorWirelessPage.isPrinterBusy()) return true;
        if(confirm("The selected printer is busy. Click OK to monitor the print in progress.")) {
            settings.gotoPage("page_monitor_wifi");
        }
        return false;
    }

    static async pauseResumePrint() {
        let state = document.getElementById('wifi_state');
        if(state.value == "printing") await MonitorWirelessPage.catchErrors(() => SynDaverWiFi.pausePrint());
        if(state.value == "paused")   await MonitorWirelessPage.catchErrors(() => SynDaverWiFi.resumePrint());
    }

    static async stopPrint() {
        if(confirm("Are you sure you want to stop the print? Press OK to stop the print, Cancel otherwise.")) {
            await MonitorWirelessPage.catchErrors(() => SynDaverWiFi.stopPrint());
        }
    }

    static async onTimer() {
        let progress = document.getElementById('wifi_progress');
        let strength = document.getElementById('wifi_strength');
        let state   = document.getElementById('wifi_state');

        function isHidden(el) {
            return (el.offsetParent === null);
        }

        /* Since updating the status requires network traffic, only do it
         * if the user is watching.
         */
        if(!isHidden(progress)) {
            const printer_addr = settings.get("printer_addr");
            if(printer_addr.length == 0) return;
            try {
                let json = await fetchJSON('http://' + printer_addr + "/status");
                progress.value = json.progress;
                strength.value = json.wifiRSSI;
                state.value   = json.state;
                const printing = json.state == "printing" || json.state == "paused";
                settings.enable('#wifi_stop', printing);
                settings.enable('#wifi_pause_resume', printing);
                document.getElementById("wifi_pause_resume").innerHTML = json.state == "printing" ? "Pause" : "Resume";
            } catch(e) {
                progress.value = 0;
                strength.value = 0;
                state.value   = "unavailable";
                settings.enable('#wifi_stop',         false);
                settings.enable('#wifi_pause_resume', false);
            }
        }
    }
}

class UpdateFirmwarePage {
    static init(s) {
        s.page(       "Update Firmware",                {id: "page_flash_fw"});
        s.category(   "Update Printer Firmware");
        s.text(       "Firmware:",                      {id: "printer_fw_filename", className: "filename readonly"});
        s.separator(                                    {type: "br"});
        s.button(     "Update",                         {onclick: UpdateFirmwarePage.onFlashPrinterClicked});
        s.buttonHelp( "Click this button to update the firmware on a USB connected printer");

        s.category(   "Update Wireless Firmware");
        s.text(       "Firmware:",                      {id: "wireless_fw_version", className: "filename readonly"});
        s.separator(                                    {type: "br"});
        s.button(     "Update",                         {onclick: UpdateFirmwarePage.onFlashWirelessClicked, className: "canUpload"});
        s.buttonHelp( "Click this button to update the firmware on the wireless module wirelessly");
    }

    static onEntry() {
        if(!hasSerial) {
            alert("This browser is does not support serial capabilities. You will be taken to a page with additional information.");
            window.open("https://syndaverco.github.io/firmware/");
            settings.goBack();
        } else {
            const usb = ProfileManager.getSection("usb");
            const wireless = ProfileManager.getSection("wireless");
            document.getElementById("printer_fw_filename").value = usb      && usb.firmware      ?      usb.firmware.split('/').pop() : "None available";
            document.getElementById("wireless_fw_version").value = wireless && wireless.firmware ? wireless.firmware.split('/').pop() : "None available";
            if(usb && usb.firmware_confirmation && !confirm(usb.firmware_confirmation)) {
                alert("Please select a profile corresponding to your printer and try again.");
                settings.gotoPage("page_profiles");
            }
        }
    }

    static async onFlashPrinterClicked() {
        try {
            await flashFirmware();
        } catch(err) {
            console.error(err);
            alert(err);
        }
    }

    static async onFlashWirelessClicked() {
        const wireless = ProfileManager.getSection("wireless");
        if(!wireless) {
            alert("The selected printer does not have wireless capabilities");
            return;
        }
        // An upgrade set includes the various print scripts as well as the firmware files.
        let files = [];
        const scripts = ProfileManager.getSection("scripts");
        if(scripts) {
            files.push(SynDaverWiFi.fileFromStr("scripts/pause.gco",    scripts.pause_print_gcode  || ""));
            files.push(SynDaverWiFi.fileFromStr("scripts/cancel.gco",   scripts.stop_print_gcode   || ""));
            files.push(SynDaverWiFi.fileFromStr("scripts/resume.gco",   scripts.resume_print_gcode || ""));
            files.push(SynDaverWiFi.fileFromStr("scripts/badprobe.gco", scripts.probe_fail_gcode   || ""));
        }
        if(wireless.uploads) {
            for(const pair of wireless.uploads) {
                files.push(await SynDaverWiFi.fileFromUrl(pair[0], pair[1]));
            }
        }
        if(wireless.length == 0) {
            alert("Nothing to upload. The wireless configuration in the profile may be incomplete.");
            return;
        }
        // Upload everything.
        try {
            if(!await MonitorWirelessPage.checkIfPrinterIdle()) return;
            await ConfigWirelessPage.uploadFiles(files);
            if(isDesktop) {
                alert("The wireless module has been upgraded.");
            }
        } catch (e) {
            console.error(e);
            alert(e);
        }
    }
}

class HelpAndInfoPage {
    static init(s) {
        s.page(       "Help & Information",                          {id: "page_help"});

        s.heading(    "Help & Information:");
        s.button(     "About",                                       {onclick: showAbout});
        s.button(     "User Guide",                                  {onclick: showUserGuide});
        s.button(     "Change Log",                                  {onclick: Updater.showReleaseNotes});

        //s.heading(    "Symple Slicer Desktop Edition:");
        //s.button(     "Download Desktop Edition",                    {onclick: redirectToDesktopDownload});

        s.heading(    "View Controls:");
        s.element(                                                   {id: "help-viewport"});

        s.footer();
        s.button(     "Back",                                        {onclick: HelpAndInfoPage.onHelpDismissed});
    }

    static onHelpDismissed() {
        settings.goBack();
    }

    static show() {
        settings.gotoPage("page_help");
    }
}

SliceObjectsPage.slicerSettings = [
    "Print Strength:",
        "infill_sparse_density",
        "infill_pattern",

    "Print Speed:",
        "layer_height",
        "layer_height_0",
        "speed_print",
        "speed_layer_0",
        "#speed_infill",
        "#speed_wall",
        "speed_support",
        "speed_travel",
        "#speed_travel_layer_0",

    "Shell:",
        "wall_thickness",
        "top_layers",
        "bottom_layers",
        "initial_bottom_layers",
        "top_bottom_pattern",
        "top_bottom_pattern_0",
        "z_seam_type",
        "z_seam_position",
        "z_seam_x",
        "z_seam_y",
        "infill_before_walls",
        "ironing_enabled",

    "Retraction:",
        "retraction_enable",
        "retraction_amount",
        "retraction_speed",
        "retraction_combing",

    "Temperatures:",
        "material_print_temperature",
        "material_print_temperature_layer_0",
        "material_bed_temperature",
        "material_bed_temperature_layer_0",
        "material_probe_temperature",
        "material_soften_temperature",
        "material_wipe_temperature",
        "material_part_removal_temperature",
        "material_keep_part_removal_temperature",

    "Cooling:",
        "cool_fan_enabled",
        "cool_fan_speed_min",
        "cool_fan_speed_max",
        "cool_min_layer_time_fan_speed_max",
        "cool_min_layer_time",
        "cool_min_speed",

    "Support &amp; Adhesion:",
        "support_enable",
        "support_type",
        "support_pattern",
        "support_infill_rate",
        "support_angle",
        "support_z_distance",
        "support_xy_distance",
        "support_xy_distance_overhang",
        "support_interface_skip_height",
        "adhesion_type",
        "brim_width",
        "brim_gap",
        "raft_airgap",
        "raft_surface_layers",
        "skirt_line_count",
        "support_brim_enable",
        "support_interface_enable",

    "Filament:",
        "material_diameter",
        "material_flow",

    "Special Modes:",
        "print_sequence",
        "magic_spiralize",
        "magic_fuzzy_skin_enabled"
];