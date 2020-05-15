/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
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
                        o.option(label, {id: value});
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
        s.button(     "Next",                                        {onclick: SettingsPanel.onApplyPreset});
        s.buttonHelp( "Click this button to apply selections<br>and proceed to placing objects.");

        s.page("Place Objects",                                      {id: "page_place"});

        s.category(   "Load 3D Objects",                             {id: "place_models", open: "open"});
        s.file("Drag and drop 3D objects<br><small>(STL, OBJ or 3MF)</small>",
                                                                     {id: "model_file", onchange: SettingsPanel.onDropModel, mode: 'binary'});

        s.separator(                                                 {type: "br"});
        s.button(     "Add Another",                                 {className: "add_another",      onclick: SettingsPanel.onAddToPlatform});

        s.category(   "Load 2D Images (as Reliefs or Lithophanes)",     {id: "place_lithophane"});

        s.file("Drag and drop 2D images<br><small>(JPG, PNG, BMP or GIF)</small>",
                                                                     {id: "image_file", onchange: SettingsPanel.onDropImage, mode: 'file'});

        s.separator(                                                 {type: "br"});
        s.button(     "Create",                                      {id: "add_litho", onclick: SettingsPanel.onAddLitho});
        s.footer();
        s.button(     "Next",                                        {className: "requires_objects", onclick: SettingsPanel.onGotoSliceClicked});
        s.buttonHelp( "Click this button to<br>proceed to slicing.");



        s.page(       "Transform Objects",                           {id: "page_transform"});

        s.category(   "Position",                                    {id: "xform_position"});
        s.number(         "X",                                       {id: "xform_position_x", className: "x_axis", units: "mm", onchange: SettingsPanel.onEditPosition});
        s.number(         "Y",                                       {id: "xform_position_y", className: "y_axis", units: "mm", onchange: SettingsPanel.onEditPosition});
        s.number(         "Z",                                       {id: "xform_position_z", className: "z_axis", units: "mm", onchange: SettingsPanel.onEditPosition});

        s.category(   "Scale",                                       {id: "xform_scale"});
        s.number(         "X",                                       {id: "xform_scale_x_pct", className: "x_axis", units: "%", onchange: evt => SettingsPanel.onEditScale("X%")});
        s.number(         "Y",                                       {id: "xform_scale_y_pct", className: "y_axis", units: "%", onchange: evt => SettingsPanel.onEditScale("Y%")});
        s.number(         "Z",                                       {id: "xform_scale_z_pct", className: "z_axis", units: "%", onchange: evt => SettingsPanel.onEditScale("Z%")});
        /*s.separator(                                                 {type: "br"});
        s.number(         "X",                                       {id: "xform_scale_x_abs", units: "mm"});
        s.number(         "Y",                                       {id: "xform_scale_y_abs", units: "mm"});
        s.number(         "Z",                                       {id: "xform_scale_z_abs", units: "mm"});*/
        s.separator(                                                 {type: "br"});
        s.toggle(     "Uniform Scaling",                             {id: "xform_scale_uniform", checked: "checked"});

        s.category(   "Mirror",                                      {id: "xform_mirror"});
        s.button(     "X Axis",                                      {className: "x_axis", onclick: evt => SettingsPanel.onMirrorAxis("X")});
        s.button(     "Y Axis",                                      {className: "y_axis", onclick: evt => SettingsPanel.onMirrorAxis("Y")});
        s.button(     "Z Axis",                                      {className: "z_axis", onclick: evt => SettingsPanel.onMirrorAxis("Z")});

        s.category(   "Rotation",                                    {id: "xform_rotate"});
        s.number(         "X",                                       {id: "xform_rotation_x", className: "x_axis", units: "°", onchange: SettingsPanel.onEditRotation});
        s.number(         "Y",                                       {id: "xform_rotation_y", className: "y_axis", units: "°", onchange: SettingsPanel.onEditRotation});
        s.number(         "Z",                                       {id: "xform_rotation_z", className: "z_axis", units: "°", onchange: SettingsPanel.onEditRotation});

        s.page(       "Machine Settings",                            {id: "page_machine"});

        s.category(   "Hot End");
        s.fromSlicer(     "machine_nozzle_size");

        s.category(   "Auto Leveling");
        s.fromSlicer(     "machine_probe_type");

        s.category(   "Build Volume");
        s.fromSlicer(     "machine_shape");
        s.fromSlicer(     "machine_width",                           {className: "x_axis"});
        s.fromSlicer(     "machine_depth",                           {className: "y_axis"});
        s.fromSlicer(     "machine_height",                          {className: "z_axis"});
        s.fromSlicer(     "machine_center_is_zero");
        s.fromSlicer(     "machine_heated_bed");
        s.button(     "Save Changes",                                {onclick: SettingsPanel.onPrinterSizeChanged});

        s.category(   "Start/End Template");
        s.buttonHelp( "Template to edit:");
        s.button(         "Start",                                   {onclick: SettingsPanel.onEditStartGcode});
        s.button(         "End",                                     {onclick: SettingsPanel.onEditEndGcode});

        s.page(       "",                                            {id: "page_start_gcode"});
        s.fromSlicer(     "machine_start_gcode");
        s.button(         "Done",                                    {onclick: SettingsPanel.doneEditingGcode});

        s.page(       "",                                            {id: "page_end_gcode"});
        s.fromSlicer(     "machine_end_gcode");
        s.button(         "Done",                                    {onclick: SettingsPanel.doneEditingGcode});

        s.page(       "Slice Objects",                               {id: "page_slice", className: "scrollable"});

        s.category(   "Print Strength");
        s.fromSlicer(       "infill_sparse_density");
        s.fromSlicer(       "infill_pattern");

        s.category(   "Print Speed");
        s.fromSlicer(       "layer_height");
        s.fromSlicer(       "speed_print");
        s.fromSlicer(       "speed_layer_0");
        s.fromSlicer(       "speed_travel");
        s.fromSlicer(       "speed_travel_layer_0");

        s.category(   "Shell");
        s.fromSlicer(       "wall_thickness");
        s.fromSlicer(       "top_layers");
        s.fromSlicer(       "bottom_layers");
        s.fromSlicer(       "initial_bottom_layers");
        s.fromSlicer(       "top_bottom_pattern");
        s.fromSlicer(       "top_bottom_pattern_0");
        s.fromSlicer(       "z_seam_type");
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
        s.fromSlicer(       "material_part_removal_temperature");
        s.fromSlicer(       "material_probe_temperature");
        s.fromSlicer(       "material_soften_temperature");
        s.fromSlicer(       "material_wipe_temperature");

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
        s.buttonHelp( "Click this button to prepare<br>the model for printing.");

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

        s.category(   "Save Options",                                {open: "open"});
        s.text(           "Save as:",                                {id: "gcode_filename", value: "output.gcode"});

        s.footer();
        s.button(     "Save",                                        {onclick: SettingsPanel.onDownloadClicked});
        s.buttonHelp( "Click this button to save<br>gcode for your 3D printer.");

        s.page(       "Final Steps",                                 {id: "page_finished"});
        s.element(                                                   {id: "help-post-print"});

        s.page(       "Advanced Features",                           {id: "page_advanced"});

        s.category(   "Slicer Output");
        s.button(     "Show",                                        {onclick: onShowLogClicked});
        s.buttonHelp( "Click this button to show<br>slicing engine logs.");

        s.category(   "Export Settings");
        s.toggle(         "Show units and choices as comments",      {id: "export_with_choices"});
        s.toggle(         "Show units descriptions as comments",     {id: "export_with_descriptions"});
        s.toggle(         "Show implicit values as comments",        {id: "export_with_unchanged",
           tooltip: "Include all values, including those absent in profiles and unchanged by the user. This provides documentation for values that may have been implicitly computed from other settings."});
        s.separator(                                                 {type: "br"});
        s.text(       "Save as:",                                    {id: "export_filename", value: "config.toml"});
        s.separator(                                                 {type: "br"});
        s.button(     "Export",                                      {onclick: SettingsPanel.onExportClicked});
        s.buttonHelp( "Click this button to save changed<br>settings to your computer.");

        s.category(   "Import Settings",                             {id: "import_settings"});
        s.file(       "Drag and drop settings<br><small>(.TOML)</small>", {id: "toml_file", onchange: SettingsPanel.onImportChange, mode: 'text'});
        s.separator(                                                 {type: "br"});
        s.button(     "Apply",                                       {id: "import_settings", onclick: SettingsPanel.onImportClicked});
        s.buttonHelp( "Importing settings from a file will override<br>all printer &amp; material presets.");

        s.page(       "Help",                                        {id: "page_help"});

        s.heading(    "View Controls:");
        s.element(                                                   {id: "help-viewport"});

        s.done();

        s.onPageExit = SettingsPanel.onPageExit;

        settings = s;

        SettingsPanel.onDropModel();    // Disable buttons
        SettingsPanel.onDropImage();    // Disable buttons
        SettingsPanel.onImportChange(); // Disable buttons
        settings.enable(".requires_objects", false);
        SettingsPanel.loadProfileList(printer_menu, material_menu);

        // Set up the global drag and drop handler
        window.addEventListener("dragover",function(e){
            e = e || event;
            e.preventDefault();
        },false);
        window.addEventListener("drop", SettingsPanel.onWindowDrop);
    }

    static hasSavedProfile() {
        return (typeof(Storage) !== "undefined") && localStorage.getItem("startup_config");
    }

    static loadStartupProfile() {
        // Always start with defaults.
        slicer.loadDefaults(true);

        if (typeof(Storage) !== "undefined") {
            // Install handler for saving profile
            window.onunload = function() {
                console.log("Saved setting to local storage");
                localStorage.setItem("startup_config", slicer.saveProfileStr());
            }

            var stored_config = localStorage.getItem("startup_config");
            if(stored_config) {
                console.log("Loaded settings from local storage");
                slicer.loadProfileStr(stored_config);
                SettingsPanel.onPrinterSizeChanged();
                return;
            }
        }

        // If no local profile is found, reload starting profile
        SettingsPanel.applyPresets()
                     .catch(error => alert(error));
    }

    static loadProfileList(printer_menu, material_menu) {
        console.log("Loading profile list");
        if(SettingsPanel.hasSavedProfile()) {
            printer_menu.option("Keep previous settings", {id: "keep"});
            material_menu.option("Keep previous settings", {id: "keep"});
        }
        fetchText("config/syndaver/profile_list.toml")
            .then(data => {
                const config = toml.parse(data);
                for (let [key, value] of Object.entries(config.machine_profiles)) {
                    printer_menu.option(value, {id: key});
                }
                for (let [key, value] of Object.entries(config.print_profiles)) {
                    material_menu.option(value, {id: key});
                }
                SettingsPanel.loadStartupProfile();
            })
            .catch(error => alert(error));
    }

    static async applyPresets(notifyUser) {
        const printer  = settings.get("preset_select");
        const material = settings.get("material_select");

        var promise;
        try {
            console.log("Loading slicer defaults");
            slicer.loadDefaults();
            if(printer !== "keep") {
                console.log("Loading printer profile");
                ProgressBar.message("Loading profiles");
                promise = await slicer.loadProfile("machine", printer + ".toml");
                SettingsPanel.onPrinterSizeChanged();
            }
            if(material !== "keep") {
                console.log("Loading material profile");
                ProgressBar.message("Loading profiles");
                promise = await slicer.loadProfile("print", material + ".toml");
            }
            console.log("Loaded profiles");
            ProgressBar.hide();
            if(notifyUser) {
                if(printer !== "keep" || material  !== "keep") {
                    alert("The new presets have been applied.");
                }
                settings.gotoPage("page_place");
            }
        } catch(error) {
            alert(error);
        }
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
        var circular         = settings.get("machine_shape") == "elliptic";
        var origin_at_center = settings.get("machine_center_is_zero");
        var x_width          = settings.get("machine_width");
        var y_depth          = settings.get("machine_depth");
        var z_height         = settings.get("machine_height");
        stage.setPrinterCharacteristics(circular, origin_at_center, x_width, y_depth, z_height);
    }

    static onApplyPreset(evt) {
        SettingsPanel.applyPresets(true);
    }

    static onImportChange(file) {
        settings.enable("#import_settings", file);
    }

    static onImportClicked() {
        try {
            const el = settings.get("toml_file");
            el.clear();
            slicer.loadDefaults();
            slicer.loadProfileStr(el.data);
            SettingsPanel.onPrinterSizeChanged();
            alert("The new settings have been applied.");
        } catch(e) {
            alert(["Error:", e.message, "Line:", e.line].join(" "));
        }
    }

    static onExportClicked() {
        var config = slicer.saveProfileStr({
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
        const extension = filename.split('.').pop().toLowerCase();
        document.getElementById("gcode_filename").value = filename.replace(extension, "gcode");
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
            settings.enable('.add_another', true);
            SettingsPanel.onAddToPlatform(); // Place the first object automatically
        } else {
            settings.enable('.add_another', false);
            loaded_geometry = false;
        }
        ProgressBar.hide();
    }

    static onAddToPlatform() {
        stage.addGeometry(loaded_geometry);
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
        settings.gotoPage("page_place");
    }

    static onEditPosition() {
        stage.selection.position.x = settings.get("xform_position_x");
        stage.selection.position.y = settings.get("xform_position_y");
        stage.selection.position.z = settings.get("xform_position_z") + stage.selectionHeightAdjustment;
        stage.onTransformationEdit(false);
    }

    static onEditScale(axis) {
        var x_percent = settings.get("xform_scale_x_pct") / 100;
        var y_percent = settings.get("xform_scale_y_pct") / 100;
        var z_percent = settings.get("xform_scale_z_pct") / 100;
        const uniform = settings.get("xform_scale_uniform");
        if(uniform) {
            switch(axis) {
                case "X%": y_percent = z_percent = x_percent; break;
                case "Y%": x_percent = z_percent = y_percent; break;
                case "Z%": x_percent = y_percent = z_percent; break;
            }
        }
        stage.selection.scale.x = x_percent;
        stage.selection.scale.y = y_percent;
        stage.selection.scale.z = z_percent;
        if(uniform) {
            SettingsPanel.onTransformChange("scale");
        }
        stage.onTransformationEdit();
    }

    static onMirrorAxis(axis) {
        switch(axis) {
            case "X": stage.selection.scale.x *= -1; break;
            case "Y": stage.selection.scale.y *= -1; break;
            case "Z": stage.selection.scale.z *= -1; break;
        }
        stage.onTransformationEdit();
    }

    static onEditRotation() {
        const toRad = deg => deg * Math.PI / 180;
        stage.selection.rotation.x = toRad(settings.get("xform_rotation_x"));
        stage.selection.rotation.y = toRad(settings.get("xform_rotation_y"));
        stage.selection.rotation.z = toRad(settings.get("xform_rotation_z"));
        stage.onTransformationEdit();
    }

    static onTransformChange(mode) {
        const toDeg = rad => (rad * 180 / Math.PI).toFixed(0);
        switch(mode) {
            case "translate":
                const pos = stage.selection.position;
                $('#xform_position_x').val( pos.x.toFixed(2));
                $('#xform_position_y').val( pos.y.toFixed(2));
                $('#xform_position_z').val((pos.z - stage.selectionHeightAdjustment).toFixed(2));
                break;
            case "rotate":
                $('#xform_rotation_x').val(toDeg(stage.selection.rotation.x));
                $('#xform_rotation_y').val(toDeg(stage.selection.rotation.y));
                $('#xform_rotation_z').val(toDeg(stage.selection.rotation.z));
                break;
            case "scale":
                $('#xform_scale_x_pct').val((stage.selection.scale.x * 100).toFixed(2));
                $('#xform_scale_y_pct').val((stage.selection.scale.y * 100).toFixed(2));
                $('#xform_scale_z_pct').val((stage.selection.scale.z * 100).toFixed(2));
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
            clearConsole();
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

    static readyToDownload(data) {
        gcode_blob = new Blob([data], {type: "application/octet-stream"});
        ProgressBar.hide();
        settings.gotoPage("page_print");

        // Show the filament pathname
        var decoder = new TextDecoder();
        var path = new GCodeParser(decoder.decode(data));
        stage.setGcodePath(path);
        var max = stage.getGcodeLayers() - 1;
        $("#preview_layer").attr("max", max).val(max);
        SettingsPanel.onUpdatePreview();
    }

    static onDownloadClicked() {
        var fileName = settings.get("gcode_filename");
        saveAs(gcode_blob, fileName);
        settings.gotoPage("page_finished");
    }

    static onPageExit(page) {
        if(page == "page_print") {
            stage.setGcodePath(null);
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
        settings.enable("#preview_layer", stage.isGcodePathVisible);
        const layer = stage.getGcodeLayers() - 1;
        $('#preview_layer').val(layer);
        $('#current_layer').val(layer);
    }

    static onUpdateLayer() {
        const layer = Math.trunc(settings.get("preview_layer"));
        stage.setGcodeLayer(layer);
        $('#current_layer').val(layer);
    }

    static onDoItAgainClicked() {
        settings.gotoPage("page_profiles");
    }

    /**
     * If the user drops a file anywhere other than the drop boxes,
     * then try to dispatchEvent it to the correct handler.
     */
    static onWindowDrop(e) {
        e = e || event;
        const files = e.dataTransfer.files;
        for (var i = 0; i < files.length; i++) {
            const extension = files[i].name.split('.').pop().toLowerCase();
            var id;
            switch (extension) {
                case 'stl':
                case 'obj':
                case '3mf':
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
                    settings.gotoPage("place_page");
                    settings.expand("place_lithophane");
                    id = "image_file";
                    break;
            }
            if(id) {
                settings.get(id).drophandler(e);
            }
        }
        e.preventDefault();
    }
}