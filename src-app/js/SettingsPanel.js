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
        var s = new SettingsUI(id);
        s.enableAutoTab();

        // onchange handler for enforcing the min and max values.
        function enforceMinMax(evt){
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

        /**
         * Helper function for obtaining UI parameters from the slicer engine
         */
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

        s.page(       "Select Profiles",                             {id: "page_profiles"});

        var printer_menu = s.choice( "Printer:",                     {id: "preset_select"});
        var material_menu = s.choice( "Material:",                   {id: "material_select"});
        s.footer();
        s.button(     "Apply",                                       {onclick: SettingsPanel.onApplyPreset});
        s.buttonHelp( "Click this button to apply selections and proceed to placing objects.");

        s.page("Place Objects",                                      {id: "page_place"});

        let attr = {name: "load_source", onchange: SettingsPanel.onLoadTypeChanged};
        s.radio( "Load 3D objects:",                                 {...attr, value: "3d", checked: "checked"});
        s.radio( "Load 2D images (as reliefs or lithophanes):",      {...attr, value: "2d"});
        s.separator();

        s.div({id: "load_models"});
        s.file("Drag and drop 3D objects<br><small>(STL, OBJ or 3MF)</small>",
                                                                     {id: "model_file", onchange: SettingsPanel.onDropModel, mode: 'binary', multiple: 'multiple', accept: ".stl,.obj,.3mf"});

        s.category("Place More");
        s.number(     "How many more to place?",                     {id: "place_quantity", value: "1", min: "1", max: "50", onchange: enforceMinMax});
        s.button(     "Place more",                                  {className: "place_more", onclick: SettingsPanel.onAddToPlatform});
        s.div();

        s.div({id: "load_images"});
        s.file("Drag and drop 2D images<br><small>(JPG, PNG, BMP or GIF)</small>",
                                                                     {id: "image_file", onchange: SettingsPanel.onDropImage, mode: 'file', 'accept': "image/*"});

        s.separator(                                                 {type: "br"});
        s.button(     "Create",                                      {id: "add_litho", onclick: SettingsPanel.onAddLitho});
        s.div();

        s.footer();
        s.button(     "Next",                                        {className: "requires_objects", onclick: SettingsPanel.onGotoSliceClicked});
        s.buttonHelp( "Click this button to proceed to slicing.");



        s.page(       "",                                            {id: "page_transform"});

        s.category(   "Position",                                    {id: "xform_position"});
        s.number(         "X",                                       {id: "xform_position_x", className: "axis_r", units: "mm", onchange: SettingsPanel.onEditPosition});
        s.number(         "Y",                                       {id: "xform_position_y", className: "axis_b", units: "mm", onchange: SettingsPanel.onEditPosition});
        s.number(         "Z",                                       {id: "xform_position_z", className: "axis_g", units: "mm", onchange: SettingsPanel.onEditPosition});

        s.category(   "Scale",                                       {id: "xform_scale"});
        s.number(         "X",                                       {id: "xform_scale_x_pct", className: "axis_r", units: "%", onchange: evt => SettingsPanel.onEditScalePct("X")});
        s.number(         "Y",                                       {id: "xform_scale_y_pct", className: "axis_g", units: "%", onchange: evt => SettingsPanel.onEditScalePct("Y")});
        s.number(         "Z",                                       {id: "xform_scale_z_pct", className: "axis_b", units: "%", onchange: evt => SettingsPanel.onEditScalePct("Z")});
        s.separator(                                                 {type: "br"});
        s.number(         "X",                                       {id: "xform_scale_x_abs", className: "axis_r", units: "mm", onchange: evt => SettingsPanel.onEditScaleAbs("X")});
        s.number(         "Y",                                       {id: "xform_scale_y_abs", className: "axis_g", units: "mm", onchange: evt => SettingsPanel.onEditScaleAbs("Y")});
        s.number(         "Z",                                       {id: "xform_scale_z_abs", className: "axis_b", units: "mm", onchange: evt => SettingsPanel.onEditScaleAbs("Z")});
        s.separator(                                                 {type: "br"});
        s.toggle(     "Uniform Scaling",                             {id: "xform_scale_uniform", checked: "checked"});

        s.category(   "Mirror",                                      {id: "xform_mirror"});
        s.button(     "X Axis",                                      {className: "axis_r", onclick: evt => SettingsPanel.onMirrorAxis("X")});
        s.button(     "Y Axis",                                      {className: "axis_g", onclick: evt => SettingsPanel.onMirrorAxis("Y")});
        s.button(     "Z Axis",                                      {className: "axis_b", onclick: evt => SettingsPanel.onMirrorAxis("Z")});

        s.category(   "Rotation",                                    {id: "xform_rotate"});
        s.number(         "X",                                       {id: "xform_rotation_x", className: "axis_r", units: "°", onchange: SettingsPanel.onEditRotation});
        s.number(         "Y",                                       {id: "xform_rotation_y", className: "axis_b", units: "°", onchange: SettingsPanel.onEditRotation});
        s.number(         "Z",                                       {id: "xform_rotation_z", className: "axis_g", units: "°", onchange: SettingsPanel.onEditRotation});
        s.category();

        s.element(                                                   {id: "object-out-of-bounds"});
        s.footer();
        s.button(     "Close",                                       {onclick: SettingsPanel.onTransformDismissed});

        s.page(       "Slice Objects",                               {id: "page_slice", className: "scrollable"});

        s.category(   "Print Strength");
        s.fromSlicer(       "infill_sparse_density");
        s.fromSlicer(       "infill_pattern");

        s.category(   "Print Speed");
        s.fromSlicer(       "layer_height");
        s.fromSlicer(       "layer_height_0");
        s.fromSlicer(       "speed_print");
        //s.fromSlicer(       "speed_layer_0");
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
        s.fromSlicer(       "infill_before_walls");
        s.fromSlicer(       "ironing_enabled");

        s.category(   "Retraction");
        s.fromSlicer(       "retraction_enable");
        s.fromSlicer(       "retraction_amount");
        s.fromSlicer(       "retraction_speed");
        s.fromSlicer(       "retraction_combing");

        s.category(   "Temperatures");
        s.fromSlicer(       "material_print_temperature");
        //s.fromSlicer(       "material_print_temperature_layer_0");
        s.fromSlicer(       "material_bed_temperature");
        //s.fromSlicer(       "material_bed_temperature_layer_0");
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

        s.category(   "Filament");
        s.fromSlicer(       "material_diameter");
        s.fromSlicer(       "material_flow");

        s.category(   "Special Modes");
        s.fromSlicer(       "magic_spiralize");
        s.fromSlicer(       "magic_fuzzy_skin_enabled");

        s.footer();
        s.button(     "Slice",                                       {onclick: SettingsPanel.onSliceClicked});
        s.buttonHelp( "Click this button to generate a G-code file for printing.");

        s.page(       "Print and Preview",                           {id: "page_print"});

        s.category(   "Print Statistics",                            {open: "open"});
        s.text(           "Print time",                              {id: "print_time"});
        s.number(         "Filament used",                           {id: "print_filament", units: "mm²"});

        s.category(   "Preview Options",                             {open: "open"});
        s.toggle(         "Show shell",                              {id: "show_shell", onclick: SettingsPanel.onUpdatePreview, checked: 'checked'});
        s.toggle(         "Show infill",                             {id: "show_infill", onclick: SettingsPanel.onUpdatePreview});
        s.toggle(         "Show supports",                           {id: "show_support", onclick: SettingsPanel.onUpdatePreview});
        s.toggle(         "Show travel",                             {id: "show_travel", onclick: SettingsPanel.onUpdatePreview});
        s.slider(         "Show layer",                              {id: "preview_layer", oninput: SettingsPanel.onUpdateLayer});
        s.number(         "Top layer",                               {id: "current_layer"});

        s.category(   "Print Options",                               {open: "open"});
        attr = {name: "print_destination", onchange: SettingsPanel.onOutputChanged};
        s.radio( "Send to connected printer:",                       {...attr, value: "printer"});
        s.radio( "Save to GCODE file:",                              {...attr, value: "file", checked: "checked"});
        s.text(           "Save as:",                                {id: "gcode_filename", value: "output.gcode", className: "save-to-file webapp-only"});
        s.category();

        s.element(                                                   {id: "gcode-out-of-bounds"});

        s.footer();
        s.div({className: "save-to-file"});
        s.button(     "Save",                                        {onclick: SettingsPanel.onDownloadClicked});
        s.buttonHelp( "Click this button to save a G-code file for your 3D printer.");
        s.div();

        s.div({className: "save-to-printer"});
        s.button(     "Print",                                       {onclick: SettingsPanel.onPrintClicked});
        s.buttonHelp( "Click this button to print to a USB attached printer");
        s.div();

        s.page( null,                                                {id: "page_finished"});
        s.element(                                                   {id: "help-post-print"});

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
        s.button(     "Save Changes",                                {onclick: SettingsPanel.onPrinterSizeChanged});

        s.category(   "Start &amp; End G-code");
        s.buttonHelp( "Template to edit:");
        s.button(         "Start",                                   {onclick: SettingsPanel.onEditStartGcode});
        s.button(         "End",                                     {onclick: SettingsPanel.onEditEndGcode});

        s.page(       "",                                            {id: "page_start_gcode"});
        s.fromSlicer(     "machine_start_gcode");
        s.button(         "Done",                                    {onclick: SettingsPanel.doneEditingGcode});

        s.page(       "",                                            {id: "page_end_gcode"});
        s.fromSlicer(     "machine_end_gcode");
        s.button(         "Done",                                    {onclick: SettingsPanel.doneEditingGcode});

        s.page(       "Update Firmware",                             {id: "page_flash_fw"});
        s.button(     "Update",                                      {onclick: SettingsPanel.onFlashClicked});
        s.buttonHelp( "Click this button to update the firmware on an USB connected printer");

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
        s.button(     "Export",                                      {onclick: SettingsPanel.onExportClicked});
        s.buttonHelp( "Click this button to save current settings to a file on your computer.");

        s.category(   "Import Settings",                             {id: "import_settings"});
        s.file(       "Drag and drop settings<br><small>(.TOML)</small>", {id: "toml_file", onchange: SettingsPanel.onImportChange, mode: 'text'});
        s.separator(                                                 {type: "br"});
        s.button(     "Apply",                                       {id: "import_settings", onclick: SettingsPanel.onImportClicked});
        s.buttonHelp( "Importing settings from a file will override all printer &amp; material presets.");

        s.page(       "Help & Information",                          {id: "page_help"});

        s.heading(    "Help & Information:");
        s.button(     "About",                                       {onclick: showAbout});
        s.button(     "User's Guide",                                {onclick: showUserGuide});
        s.button(     "Change Log",                                  {onclick: Updater.showReleaseNotes});

        s.heading(    "Symple Slicer Desktop Edition:");
        s.button(     "Download Desktop Edition",                    {onclick: redirectToDesktopDownload});

        s.heading(    "View Controls:");
        s.element(                                                   {id: "help-viewport"});

        s.footer();
        s.button(     "Back",                                        {onclick: SettingsPanel.onHelpDismissed});

        s.done();

        s.onPageExit = SettingsPanel.onPageExit;

        settings = s;

        SettingsPanel.onDropModel();    // Disable buttons
        SettingsPanel.onDropImage();    // Disable buttons
        SettingsPanel.onImportChange(); // Disable buttons
        settings.enable(".requires_objects", false);
        SettingsPanel.initProfiles(printer_menu, material_menu);
        SettingsPanel.onOutputChanged();
        SettingsPanel.onLoadTypeChanged();

        // Set up the global drag and drop handler
        window.addEventListener("dragover",function(e){
            e = e || event;
            e.preventDefault();
        },false);
        window.addEventListener("drop", SettingsPanel.onWindowDrop);
    }

    static async initProfiles(printer_menu, material_menu) {
        try {
            await ProfileManager.populateProfileMenus(printer_menu, material_menu);

            if(ProfileManager.loadStoredProfile()) {
                SettingsPanel.onPrinterSizeChanged();
            } else {
                // If no startup profile is found, load first profile from the selection box
                SettingsPanel.onApplyPreset(true);
            }
        } catch(error) {
            alert(error);
            console.error(error);
        }

        window.onunload = ProfileManager.onUnloadHandler;
    }

    static onEditStartGcode() {
        settings.gotoPage("page_start_gcode");
    }

    static onEditEndGcode() {
        settings.gotoPage("page_end_gcode");
    }

    static onGotoSliceClicked() {
        settings.gotoPage("page_slice");
    }

    static onObjectCountChanged(count) {
        settings.enable(".requires_objects", count > 0);
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

    static async onApplyPreset(atStartup) {
        const printer  = settings.get("preset_select");
        const material = settings.get("material_select");

        if(printer !== "keep" || material !== "keep") {
            try {
                ProgressBar.message("Loading profiles");
                await ProfileManager.applyPresets(printer, material);
                if(printer !== "keep") {
                    SettingsPanel.onPrinterSizeChanged();
                }
                if(!atStartup) {
                    alert("The new presets have been applied.");
                }
            } catch(error) {
                alert(error);
                console.error(error);
            } finally {
                ProgressBar.hide();
            }
        }

        settings.gotoPage("page_place");
    }

    static onImportChange(file) {
        settings.enable("#import_settings", file);
    }

    static onImportClicked() {
        try {
            const el = settings.get("toml_file");
            ProfileManager.importConfiguration(el.data);
            SettingsPanel.onPrinterSizeChanged();
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

    static doneEditingGcode() {
        settings.gotoPage("page_machine");
    }

    static setOutputGcodeName(filename) {
        const extension = filename.split('.').pop();
        document.getElementById("gcode_filename").value = filename.replace(extension, "gcode");
    }

    static onLoadTypeChanged(e) {
        let mode = e ? (typeof e == "string" ? e : e.target.value) : '3d';
        switch(mode) {
            case '3d': $("#load_models").show(); $("#load_images").hide(); break;
            case '2d': $("#load_models").hide(); $("#load_images").show(); break;
        }
        if(typeof e == "string") {
            $('[name="load_source"]').removeAttr('checked');
            $("input[name=load_source][value=" + mode + "]").prop('checked', true);
        }
    }

    static onDropModel(data, filename) {
        if(data) {
            SettingsPanel.setOutputGcodeName(filename);
            ProgressBar.message("Preparing model");
            geoLoader.load(filename, data);
        } else {
            SettingsPanel.onGeometryLoaded(null);
        }
    }

    static onDropImage(data, filename) {
        if(data) {
            SettingsPanel.setOutputGcodeName(filename);
        } else {
            SettingsPanel.onGeometryLoaded(null);
        }
        settings.enable("#add_litho", data !== undefined);
    }

    static onAddLitho() {
        const filename = settings.get("image_file").filename;
        const data     = settings.get("image_file").data;
        ProgressBar.message("Preparing model");
        geoLoader.load(filename, data);
    }

    static onGeometryLoaded(geometry) {
        if(geometry) {
            loaded_geometry = geometry;
            settings.enable('.place_more', true);
            SettingsPanel.onAddToPlatform(); // Place the first object automatically
        } else {
            settings.enable('.place_more', false);
            loaded_geometry = false;
        }
        ProgressBar.hide();
    }

    static onAddToPlatform() {
        const howMany = parseInt(settings.get("place_quantity"))
        for(var i = 0; i < howMany; i++) {
            stage.addGeometry(loaded_geometry);
        }
    }

    static onSelectionChanged() {
        SettingsPanel.onTransformChange("translate");
        SettingsPanel.onTransformChange("rotate");
        SettingsPanel.onTransformChange("scale");
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
            case "X": SettingsPanel.setAxisScale("X%", settings.get("xform_scale_x_abs") / dim.x); SettingsPanel.onEditScalePct("X"); break;
            case "Y": SettingsPanel.setAxisScale("Y%", settings.get("xform_scale_y_abs") / dim.y); SettingsPanel.onEditScalePct("Y"); break;
            case "Z": SettingsPanel.setAxisScale("Z%", settings.get("xform_scale_z_abs") / dim.z); SettingsPanel.onEditScalePct("Z"); break;
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
        SettingsPanel.onTransformChange("scale");
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
                SettingsPanel.setAxisPosition("X", pos.x);
                SettingsPanel.setAxisPosition("Y", pos.y);
                SettingsPanel.setAxisPosition("Z", pos.z);
                break;
            case "rotate":
                SettingsPanel.setAxisRotation("X", stage.selection.rotation.x);
                SettingsPanel.setAxisRotation("Y", stage.selection.rotation.y);
                SettingsPanel.setAxisRotation("Z", stage.selection.rotation.z);
                break;
            case "scale":
                SettingsPanel.setAxisScale("X%", stage.selection.scale.x);
                SettingsPanel.setAxisScale("Y%", stage.selection.scale.y);
                SettingsPanel.setAxisScale("Z%", stage.selection.scale.z);
                var dim = stage.getSelectionDimensions();
                SettingsPanel.setAxisScale("X", dim.x);
                SettingsPanel.setAxisScale("Y", dim.y);
                SettingsPanel.setAxisScale("Z", dim.z);
                break;
        }
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

    static set transformOutOfBoundsError(isOutside) {
        if(isOutside) {
            $("#object-out-of-bounds").show();
        } else {
            $("#object-out-of-bounds").hide();
        }
    }

    static readyToDownload(data) {
        gcode_blob = new Blob([data], {type: "application/octet-stream"});
        ProgressBar.hide();
        settings.gotoPage("page_print");

        // Show the filament pathname
        var decoder = new TextDecoder();
        var path = new GCodeParser(decoder.decode(data));
        stage.setGcodePath(path);
        const max = stage.getGcodeLayers() - 1;
        $("#preview_layer").attr("max", max).val(max);
        $('#preview_layer').val(max);
        $('#current_layer').val(max);
        SettingsPanel.onUpdatePreview();
    }

    static onOutputChanged(e) {
        $(settings.ui).attr('data-output', e ? e.target.value : 'file');
    }

    static onDownloadClicked() {
        let fileName = settings.get("gcode_filename");
        saveAs(gcode_blob, fileName);
        settings.gotoPage("page_finished");
    }

    static async onFlashClicked() {
        if(featureRequiresDesktopVersion("Updating firmware")) {
            try {
                await flashFirmware();
            } catch(err) {
                console.error(err);
                alert(err);
            }
        }
    }

    static async onPrintClicked() {
        if(featureRequiresDesktopVersion("Printing via USB")) {
            try {
                await stream_gcode(await gcode_blob.text());
                settings.gotoPage("page_finished");
            } catch(err) {
                if(!(err instanceof PrintAborted)) {
                    // Report all errors except for user initiated abort
                    console.error(err);
                    alert(err);
                }
            }
        }
    }

    static onPageExit(page) {
        if(page == "page_print") {
            stage.hideToolpath();
        }
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

    static onDoItAgainClicked() {
        settings.gotoPage("page_profiles");
    }

    static goToHelp() {
        settings.gotoPage("page_help");
    }

    static onHelpDismissed() {
        settings.goBack();
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
                    settings.gotoPage("page_place");
                    SettingsPanel.onLoadTypeChanged("3d");
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
                    SettingsPanel.onLoadTypeChanged("2d");
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
}