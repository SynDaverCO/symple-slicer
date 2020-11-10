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
        if(isDesktop) {
            WirelessPrintingPage.init(s);
            UpdateFirmwarePage.init(s);
        }
        AdvancedFeaturesPage.init(s);
        HelpAndInfoPage.init(s);

        s.done();

        s.onPageExit = SettingsPanel.onPageExit;

        PlaceObjectsPage.onDropModel();         // Disable buttons
        PlaceObjectsPage.onDropImage();         // Disable buttons
        AdvancedFeaturesPage.onImportChanged(); // Disable buttons
        PlaceObjectsPage.onLoadTypeChanged();

        // Set up the global drag and drop handler
        window.addEventListener("dragover", SettingsPanel.onDragOver, false);
        window.addEventListener("drop",     SettingsPanel.onWindowDrop);
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

    static async initProfiles(printer_menu, material_menu) {
        try {
            await ProfileManager.populateProfileMenus(printer_menu, material_menu);

            SelectProfilesPage.setUseLastSettings(ProfileManager.hasStoredProfile());

            if(ProfileManager.loadStoredProfile()) {
                MachineSettingsPage.onPrinterSizeChanged();
            } else {
                // If no startup profile is found, load first profile from the selection box
                SelectProfilesPage.onApplyPreset(true);
            }
        } catch(error) {
            alert(error);
            console.error(error);
        }

        window.onunload = ProfileManager.onUnloadHandler;
    }

    static onPageExit(page) {
        if(page == "page_print") {
            stage.hideToolpath();
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
                    settings.gotoPage("page_advanced");
                    settings.expand("import_settings");
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
                    ProfileManager.addProfileUrl(cmd[1]);
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
        s.page(       "Select Profiles",                             {id: "page_profiles"});

        const attr = {name: "keep_settings", onchange: SelectProfilesPage.onKeepSettingsChanged};
        s.radio( "Use slicer settings from last session",            {...attr, value: "yes", checked: "checked"});
        s.radio( "Load new slicer settings from profiles:",          {...attr, value: "no"});

        s.div({className: "load-profiles"});
        s.separator(                                                 {type: "br"});
        const printer_menu = s.choice( "Printer:",                   {id: "preset_select"});
        const material_menu = s.choice( "Material:",                 {id: "material_select"});
        s.div();

        s.footer();

        s.div({className: "keep-settings"});
        s.button(     "Next",                                        {onclick: SelectProfilesPage.onNext});
        s.buttonHelp( "Click this button to proceed to placing objects.");
        s.div();

        s.div({className: "load-profiles"});
        s.button(     "Apply",                                       {onclick: SelectProfilesPage.onApplyPreset});
        s.buttonHelp( "Click this button to apply selections and proceed to placing objects.");
        s.div();

        this.setUseLastSettings(true);
        SettingsPanel.initProfiles(printer_menu, material_menu);
    }

    static async onApplyPreset(atStartup) {
        const printer  = settings.get("preset_select");
        const material = settings.get("material_select");

        try {
            ProgressBar.message("Loading profiles");
            await ProfileManager.applyPresets(printer, material);
            MachineSettingsPage.onPrinterSizeChanged();
            if(!atStartup) {
                alert("The new presets have been applied.");
            }
        } catch(error) {
            alert(error);
            console.error(error);
        } finally {
            ProgressBar.hide();
        }

        SelectProfilesPage.setUseLastSettings(true);
        SelectProfilesPage.onNext();
    }

    static onNext() {
        if(MaterialNotesPage.loadProfileNotes()) {
            settings.gotoPage("page_material_notes");
        } else {
            settings.gotoPage("page_place");
        }
    }

    static onKeepSettingsChanged(e) {
        $(settings.ui).attr('data-keep-settings', e ? e.target.value : 'yes');
    }

    static setUseLastSettings(useLastSettings) {
        $('input[name="keep_settings"]').prop('checked', false);
        if(useLastSettings) {
            $('input[name="keep_settings"][value="yes"]').prop('checked', true);
            $(settings.ui).attr('data-keep-settings', 'yes');
        } else {
            $('input[name="keep_settings"][value="no"]').prop('checked', true);
            $(settings.ui).attr('data-keep-settings', 'no');
        }
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
        if(ProfileManager.hasOwnProperty("metadata") && ProfileManager.metadata.hasOwnProperty("material_notes")) {
            $("#material_notes").html(ProfileManager.metadata.material_notes);
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

        s.category(   "Print Strength");
        s.fromSlicer(       "infill_sparse_density");
        s.fromSlicer(       "infill_pattern");

        s.category(   "Print Speed");
        s.fromSlicer(       "layer_height");
        s.fromSlicer(       "layer_height_0");
        s.fromSlicer(       "speed_print");
        s.fromSlicer(       "speed_layer_0");
        //s.fromSlicer(       "speed_infill");
        //s.fromSlicer(       "speed_wall");
        s.fromSlicer(       "speed_support");
        s.fromSlicer(       "speed_travel");
        //s.fromSlicer(       "speed_travel_layer_0");

        s.category(   "Shell");
        s.fromSlicer(       "wall_thickness");
        s.fromSlicer(       "top_layers");
        s.fromSlicer(       "bottom_layers");
        s.fromSlicer(       "initial_bottom_layers");
        s.fromSlicer(       "top_bottom_pattern");
        s.fromSlicer(       "top_bottom_pattern_0");
        s.fromSlicer(       "z_seam_type");
        s.fromSlicer(       "z_seam_position");
        s.fromSlicer(       "z_seam_x");
        s.fromSlicer(       "z_seam_y");
        s.fromSlicer(       "infill_before_walls");
        s.fromSlicer(       "ironing_enabled");

        s.category(   "Retraction");
        s.fromSlicer(       "retraction_enable");
        s.fromSlicer(       "retraction_amount");
        s.fromSlicer(       "retraction_speed");
        s.fromSlicer(       "retraction_combing");

        s.category(   "Temperatures");
        s.fromSlicer(       "material_print_temperature");
        s.fromSlicer(       "material_print_temperature_layer_0");
        s.fromSlicer(       "material_bed_temperature");
        s.fromSlicer(       "material_bed_temperature_layer_0");
        s.fromSlicer(       "material_probe_temperature");
        s.fromSlicer(       "material_soften_temperature");
        s.fromSlicer(       "material_wipe_temperature");
        s.fromSlicer(       "material_part_removal_temperature");
        s.fromSlicer(       "material_keep_part_removal_temperature");

        s.category(   "Cooling");
        s.fromSlicer(       "cool_fan_enabled");
        s.fromSlicer(       "cool_fan_speed_min");
        s.fromSlicer(       "cool_fan_speed_max");
        s.fromSlicer(       "cool_min_layer_time_fan_speed_max");
        s.fromSlicer(       "cool_min_layer_time");
        s.fromSlicer(       "cool_min_speed");

        s.category(   "Support &amp; Adhesion");
        s.fromSlicer(       "support_enable");
        s.fromSlicer(       "support_type");
        s.fromSlicer(       "support_pattern");
        s.fromSlicer(       "support_infill_rate");
        s.fromSlicer(       "support_angle");
        s.fromSlicer(       "support_z_distance");
        s.fromSlicer(       "support_xy_distance");
        s.fromSlicer(       "support_xy_distance_overhang");
        s.fromSlicer(       "support_interface_skip_height");
        s.fromSlicer(       "adhesion_type");
        s.fromSlicer(       "brim_width");
        s.fromSlicer(       "brim_gap");
        s.fromSlicer(       "raft_airgap");
        s.fromSlicer(       "raft_surface_layers");
        s.fromSlicer(       "skirt_line_count");
        s.fromSlicer(       "support_brim_enable");
        s.fromSlicer(       "support_interface_enable");

        s.category(   "Filament");
        s.fromSlicer(       "material_diameter");
        s.fromSlicer(       "material_flow");

        s.category(   "Special Modes");
        s.fromSlicer(       "magic_spiralize");
        s.fromSlicer(       "magic_fuzzy_skin_enabled");

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
                    el = s.textarea(label, attr);
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
}

class PrintAndPreviewPage {
    static init(s) {
        s.page(       "Print and Preview",                           {id: "page_print"});

        s.category(   "Print Statistics",                            {open: "open"});
        s.text(           "Print time",                              {id: "print_time"});
        s.number(         "Filament used",                           {id: "print_filament", units: "m"});

        s.category(   "Preview Options",                             {open: "open"});
        s.toggle(         "Show shell",                              {id: "show_shell", onclick: PrintAndPreviewPage.onUpdatePreview, checked: 'checked'});
        s.toggle(         "Show infill",                             {id: "show_infill", onclick: PrintAndPreviewPage.onUpdatePreview});
        s.toggle(         "Show supports",                           {id: "show_support", onclick: PrintAndPreviewPage.onUpdatePreview});
        s.toggle(         "Show travel",                             {id: "show_travel", onclick: PrintAndPreviewPage.onUpdatePreview});
        s.slider(         "Show layer",                              {id: "preview_layer", oninput: PrintAndPreviewPage.onUpdateLayer});
        s.number(         "Top layer",                               {id: "current_layer"});

        s.category(   "Print Options",                               {open: "open"});
        const attr = {name: "print_destination", onchange: PrintAndPreviewPage.onOutputChanged};
        s.radio( "Save a G-code file for printing:",                   {...attr, value: "file", checked: "checked"});
        s.radio( "Send to printer using a USB cable:",               {...attr, value: "printer"});
        s.radio( "Send to printer wirelessly:",                      {...attr, value: "wifi"});

        /* Choices for saving to file */
        s.text(           "Save as:",                                {id: "gcode_filename", value: "output.gcode", className: "save-to-file webapp-only"});
        s.category();

        s.element(                                                   {id: "gcode-out-of-bounds"});

        s.footer();
        s.div({className: "save-to-file"});
        s.button(     "Save",                                        {onclick: PrintAndPreviewPage.onDownloadClicked});
        s.buttonHelp( "Click this button to save a G-code file for your 3D printer.");
        s.div();

        s.div({className: "save-to-printer"});
        s.button(     "Print",                                       {onclick: PrintAndPreviewPage.onPrintClicked});
        s.buttonHelp( "Click this button to print to a USB attached printer");
        s.div();

        s.div({className: "save-to-wifi"});
        s.button(     "Print",                                       {onclick: PrintAndPreviewPage.onUploadClicked, id: "upload_btn"});
        s.buttonHelp( "Click this button to print to a SynDaver WiFi printer");
        s.div();

        if(!isDesktop) {
            $("input[value='file']").parent().hide();
            $("input[value='printer']").parent().hide();
            $("input[value='wifi']").parent().hide();
        }

        const defaultOutput = localStorage.getItem('data-output') || 'file';
        PrintAndPreviewPage.setOutput(defaultOutput);
    }

    static setOutput(what) {
        $('input[name="print_destination"]').prop('checked', false);
        $('input[name="print_destination"][value="' + what + '"]').prop('checked', true);
        this.onOutputChanged(what)
    }

    static onOutputChanged(e) {
        const dataOutput = e.target ? e.target.value : e;
        $(settings.ui       ).attr('data-output', dataOutput);
        $('#help-post-print').attr('data-output', dataOutput);
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
        const bounds = {
            min: {x: getField("MINX"), y: getField("MINY"), z: getField("MINZ")},
            max: {x: getField("MAXX"), y: getField("MAXY"), z: getField("MAXZ")}
        };
        const time = getField("TIME");
        const time_hms = new Date(time * 1000).toISOString().substr(11, 8);
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

    static onDownloadClicked() {
        if(!gcode_blob) {
            alert("There is nothing to print")
            return
        }
        let fileName = settings.get("gcode_filename");
        saveAs(gcode_blob, fileName);
    }

    static async onPrintClicked() {
        if(!gcode_blob) {
            alert("There is nothing to print")
            return
        }
        if(featureRequiresDesktopVersion("Printing via USB")) {
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
    }

    static async onUploadClicked() {
        if(!gcode_blob) {
            alert("There is nothing to print")
            return
        }
        const file = WirelessPrintingPage.fileFromBlob("printjob.gco", gcode_blob);
        try {
            await WirelessPrintingPage.uploadFiles([file]);
            WirelessPrintingPage.showMonitor();
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
        const extension = filename.split('.').pop();
        document.getElementById("gcode_filename").value = filename.replace(extension, "gcode");
    }
}

class MachineSettingsPage {
    static init(s) {
        s.page(       "Machine Settings",                            {id: "page_machine"});

        s.category(   "Hot End");
        s.fromSlicer(     "machine_nozzle_size");

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

        s.category(   "Slicer Output");
        s.button(     "Show",                                        {onclick: Log.show});
        s.buttonHelp( "Click this button to show slicing engine logs.");

        s.category(   "Export Settings");
        s.toggle(         "Show units and choices as comments",      {id: "export_with_choices"});
        s.toggle(         "Show units descriptions as comments",     {id: "export_with_descriptions"});
        s.toggle(         "Show implicit values as comments",        {id: "export_with_unchanged",
           tooltip: "Include all values, including those absent in profiles and unchanged by the user. This provides documentation for values that may have been implicitly computed from other settings."});
        s.separator(                                                 {type: "br"});
        s.text(       "Save as:",                                    {id: "export_filename", value: "config.toml", className: "webapp-only"});
        s.separator(                                                 {type: "br"});
        s.button(     "Export",                                      {onclick: AdvancedFeaturesPage.onExportClicked});
        s.buttonHelp( "Click this button to save current settings to a file on your computer.");

        s.category(   "Import Settings",                             {id: "import_settings"});
        s.file(       "Drag and drop settings<br><small>(.TOML)</small>", {id: "toml_file", onchange: AdvancedFeaturesPage.onImportChanged, mode: 'text'});
        s.separator(                                                 {type: "br"});
        s.button(     "Apply",                                       {id: "import_settings", onclick: AdvancedFeaturesPage.onImportClicked});
        s.buttonHelp( "Importing settings from a file will override all printer &amp; material presets.");
    }

    static onImportChanged(file) {
        settings.enable("#import_settings", file);
    }

    static onImportClicked() {
        try {
            const el = settings.get("toml_file");
            ProfileManager.importConfiguration(el.data);
            MachineSettingsPage.onPrinterSizeChanged();
            alert("The new settings have been applied.");
            el.clear();
        } catch(e) {
            alert(["Error:", e.message, "Line:", e.line].join(" "));
        }
    }

    static onExportClicked() {
        var config = ProfileManager.exportConfiguration({
            descriptions: settings.get("export_with_descriptions"),
            unchanged:    settings.get("export_with_unchanged"),
            choices:      settings.get("export_with_choices")
        });
        var blob = new Blob([config], {type: "text/plain;charset=utf-8"});
        var filename = settings.get("export_filename");
        saveAs(blob, filename);
    }
}

class WirelessPrintingPage {
    static init(s) {
        s.page(       "Wireless Printing",                           {id: "page_wifi_printing"});
        
        s.category( "Configure Wireless Printing",                   {id: "config_wifi"});
        s.heading("Network Configuration:",                          {open: "open"});

        const no_save = {oninput: WirelessPrintingPage.onInput};
        const to_save = {oninput: WirelessPrintingPage.onInput, onchange: WirelessPrintingPage.onChange};
        s.text(           "Network Name (SSID):",                    {...to_save, id: "wifi_ssid",    placeholder: "Required",
                                                                         tooltip: "Type in the name of the wireless access point you want your printer to connect to"});
        s.text(           "Network Password:",                       {...no_save, id: "wifi_pass",    placeholder: "Required",
                                                                         tooltip: "Type in the password of the wireless access point you want your printer to connect to"});
        s.heading(   "Printer Configuration:");
        s.text(           "Set Upload Password:",                    {...to_save, id: "printer_pass", placeholder: "Required",
                                                                         tooltip: "Choose a password to prevent unauthorized use of your printer"});
        s.text(           "IP Address:",                             {...to_save, id: "printer_addr", placeholder: "Optional",
                                                                          tooltip: "Leave this blank now to allow the printer to select an address via DHCP; but once the printer is connected it will show you an address to type in here"});
        s.button(     "Save",                                        {onclick: WirelessPrintingPage.onSaveClicked, id: "save_config_btn"});
        s.buttonHelp( "Click this button to save WiFi configuration G-code to run on your printer");

        s.category( "Monitor Wireless Printing",                     {id: "monitor_wifi"});
        s.progress( "Print progress:",                               {id: "wifi_progress", value: 0});
        s.text(     "Printer status:",                               {id: "wifi_status"});
        s.number(   "Signal strength:",                              {id: "wifi_strength", units: "dBm"});
        s.button(   "Stop",                                          {id: "wifi_stop", onclick: WirelessPrintingPage.stopPrint, disabled: "disabled"});
        s.button(   "Pause",                                         {id: "wifi_pause_resume", onclick: WirelessPrintingPage.pauseResumePrint, disabled: "disabled"});

        let loadFromStorage = id => document.getElementById(id).value = localStorage.getItem(id) || "";

        // Load settings from local storage
        loadFromStorage("wifi_ssid");
        loadFromStorage("printer_pass");
        loadFromStorage("printer_addr");

        WirelessPrintingPage.onInput();

        setInterval(this.onTimer, 5000);
    }

    static onSaveClicked() {
        const wifi_ssid = settings.get("wifi_ssid");
        const wifi_pass = settings.get("wifi_pass");
        let   printer_addr = settings.get("printer_addr");
        const printer_pass = settings.get("printer_pass");
        if(!printer_addr) {
            printer_addr = "dhcp";
        }
        const config =
            "M118 P0 wifi_ssid: " + wifi_ssid + "\n" +
            "M118 P0 wifi_pass: " + wifi_pass + "\n" +
            "M118 P0 wifi_addr: " + printer_addr + "\n" +
            "M118 P0 post_pass: " + printer_pass + "\n" +
            "M118 P0 wifi_save_config\n" +
            "M118 P0 wifi_restart\n";
        const blob = new Blob([config], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "wifi_config.gco");
        if(printer_addr == "dhcp") {
            alert("After running the G-code on the printer, please type the address displayed by the printer in the \"IP Address\" field.");
            document.getElementById("printer_addr").placeholder = "Enter here";
        }
    }

    static onInput() {
        // Enable the save button when all required fields are filled in
        const wifi_ssid = settings.get("wifi_ssid");
        const wifi_pass = settings.get("wifi_pass");
        const printer_pass = settings.get("printer_pass");
        const printer_addr = settings.get("printer_addr");
        const save_enabled = wifi_ssid.length && wifi_pass.length && printer_pass.length;
        settings.enable("#save_config_btn", save_enabled);
        const fw_enabled = printer_addr.length && printer_pass.length;
        settings.enable("#upgrade_wifi_btn", fw_enabled);
    }

    static onChange() {
        // Save all changed elements to local storage
        localStorage.setItem(event.currentTarget.id,event.currentTarget.value);
    }

    // Uploads files to the wireless module
    static async uploadFiles(files) {
        const printer_pass = settings.get("printer_pass");
        const printer_addr = settings.get("printer_addr");
        if(printer_pass.length == 0 || printer_addr.length == 0) {
            alert("Please configure the wireless module using the \"Configure Wireless\" from the \"Tasks\" menu")
            return
        }
        try {
            let totalBytes = 0;
            let completedBytes = 0;
            for(const file of files) {
                totalBytes += file.size;
            }
            for(const file of files) {
                ProgressBar.message("Uploading \"" + file.name + "\"");
                await AuthenticatedRequest.doPost({
                    statusUrl:        'http://' + printer_addr + "/status",
                    methodUrl:        'http://' + printer_addr + "/" + file.name,
                    password:         printer_pass,
                    file:             file,
                    onProgress:       bytes => ProgressBar.progress((completedBytes + bytes)/totalBytes)
                });
                completedBytes += file.size;
            }
        } finally {
            ProgressBar.hide();
        }
    }

    static async sendCommand(cmd) {
        const printer_pass = settings.get("printer_pass");
        const printer_addr = settings.get("printer_addr");
        if(printer_pass.length == 0 || printer_addr.length == 0) {
            alert("Please configure the wireless module using the \"Configure Wireless\" from the \"Tasks\" menu")
            return
        }
        try {
            console.log(cmd);
            await AuthenticatedRequest.doGet({
                statusUrl:        'http://' + printer_addr + "/status",
                methodUrl:        'http://' + printer_addr + "/" + cmd,
                password:         printer_pass
            });
        } catch (e) {
            console.error(e);
            alert(e);
        }
    }

    static fileFromBlob(fileName, blob) {
        blob.lastModifiedDate = new Date();
        blob.name = fileName;
        return blob;
    }

    static fileFromStr(fileName, str) {
        let blob = new Blob([str], {type : 'text/plain'});
        blob.lastModifiedDate = new Date();
        blob.name = fileName;
        return blob;
    }

    static async fileFromUrl(fileName, url) {
        let fw = await fetch(url);
        let blob = await fw.blob();
        return WirelessPrintingPage.fileFromBlob(fileName, blob);
    }

    static async onTimer() {
        let progress = document.getElementById('wifi_progress');
        let strength = document.getElementById('wifi_strength');
        let status   = document.getElementById('wifi_status');

        function isHidden(el) {
            return (el.offsetParent === null);
        }

        /* Since updating the status requires network traffic, only do it
         * if the user is watching.
         */
        if(!isHidden(progress)) {
            const printer_addr = settings.get("printer_addr");
            if(printer_addr.length == 0) return;
            let json = await fetchJSON('http://' + printer_addr + "/status");
            progress.value = json.progress;
            strength.value = json.wifiRSSI;
            status.value   = json.status;
            const printing = json.status == "printing" || json.status == "paused";
            settings.enable('#wifi_stop', printing);
            settings.enable('#wifi_pause_resume', printing);
            document.getElementById("wifi_pause_resume").innerHTML = json.status == "printing" ? "Pause" : "Resume";
        }
    }

    static async stopPrint() {
        if(confirm("Are you sure you want to stop the print? Press OK to stop the print, Cancel otherwise.")) {
            WirelessPrintingPage.sendCommand("stop");
        }
    }

    static async pauseResumePrint() {
        let status = document.getElementById('wifi_status');
        if(status.value == "printing") await WirelessPrintingPage.sendCommand("pause");
        if(status.value == "paused")   await WirelessPrintingPage.sendCommand("resume");
    }

    static showMonitor() {
        settings.gotoPage("page_wifi_printing");
        settings.expand("configure_wifi", false);
        settings.expand("monitor_wifi", true);
    }
}

class UpdateFirmwarePage {
    static init(s) {
        s.page(       "Update Firmware",                             {id: "page_flash_fw"});
        s.category("Update Printer Firmware");
        s.button(     "Update",                                      {onclick: UpdateFirmwarePage.onFlashPrinterClicked});
        s.buttonHelp( "Click this button to update the firmware on an USB connected printer");

        s.category("Update Wireless Firmware");
        s.button(     "Update",                                      {onclick: UpdateFirmwarePage.onFlashWirelessClicked, id: "upgrade_wifi_btn"});
        s.buttonHelp( "Click this button to update the firmware on the wireless module wirelessly");
    }

    static async onFlashPrinterClicked() {
        if(featureRequiresDesktopVersion("Updating firmware")) {
            try {
                await flashFirmware();
            } catch(err) {
                console.error(err);
                alert(err);
            }
        }
    }

    static async onFlashWirelessClicked() {
        if(featureRequiresDesktopVersion("Updating firmware")) {
            // An upgrade set includes the various print scripts as well as the firmware file.
            let files = [];
            if(ProfileManager.scripts) {
                files.push(WirelessPrintingPage.fileFromStr("pause.gco",    ProfileManager.scripts.pause_print_gcode  || ""));
                files.push(WirelessPrintingPage.fileFromStr("cancel.gco",   ProfileManager.scripts.stop_print_gcode   || ""));
                files.push(WirelessPrintingPage.fileFromStr("resume.gco",   ProfileManager.scripts.resume_print_gcode || ""));
                files.push(WirelessPrintingPage.fileFromStr("badprobe.gco", ProfileManager.scripts.probe_fail_gcode   || ""));
            }
            files.push(await WirelessPrintingPage.fileFromUrl("firmware.bin", 'config/syndaver/machine_firmware/SynDaver_WiFi.bin'));
            // Upload everything.
            try {
                await WirelessPrintingPage.uploadFiles(files);
                alert("The wireless module has been upgraded.");
            } catch (e) {
                console.error(e);
                alert(e);
            }
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