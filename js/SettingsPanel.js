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
var settings;

function settingsInit(id) {

    var s = new SettingsUI(id);

    /**
     * Helper function for obtaining UI parameters from the slicer engine
     */
    s.fromSlicer = function(key) {
        var sd = slicer.config.getSettingDescriptor(key);
        var label = sd.label;
        var el;
        var attr = {
            units:   sd.unit,
            tooltip: sd.description
        };
        switch(sd.type) {
            case 'float':
            case 'int':
                attr.step = (sd.type == 'int') ? 1 : 0.01;
                el = s.number(key, label, attr);
                sd.onValueChanged = (key, val) => {el.value = val;}
                el.addEventListener('change', (event) => slicer.config.set(key, parseFloat(event.target.value)));
                break;
            case 'str':
                el = s.textarea(key, label, attr);
                sd.onValueChanged = (key, val) => {el.value = val;}
                el.addEventListener('change', (event) => slicer.config.set(key, event.target.value));
                break;
            case 'bool':
                el = s.toggle(key, label, attr);
                sd.onValueChanged = (key, val) => {el.checked = val;}
                el.addEventListener('change', (event) => slicer.config.set(key,el.checked));
                break;
            case 'enum':
                var o = s.choice(key, label, attr);
                for(const [value, label] of Object.entries(sd.options)) {
                    o.option(value, label);
                }
                sd.onValueChanged = (key, val) => {o.element.value = val;}
                o.element.addEventListener('change', (event) => slicer.config.set(key, event.target.value));
                break;
        }
    }

    s.page(              "settings-place",  "Place Objects");
    s.file(                  "fileSelect", {'binary': true, 'text': "Drop STL file here", 'callback': onFileChange});

    s.separator(     "br");
    s.button(             onAddToPlatform, "Add Object",    {'id': "add_to_platform"});
    s.button(             onClearPlatform, "Clear Objects", {'id': "clear_platform"});
    s.separator();
    s.button(          onGotoSliceClicked, "Next",          {'id': "done_placing"});
    s.buttonHelp("Click this button to when<br>you are done placing objects.");

    s.page(          "settings-profiles",  "Manage Presets");
    s.category(                            "Printer &amp; Material", {open: "open"});
    s.choice(       "machinePresetSelect", "Printer:")
     .option( "lulzbot_taz_we_aero_0.5mm", "Lulzbot TAZ Workhorse Aero 0.5 mm")
     .option( "lulzbot_mini2_aero_0.5mm" , "Lulzbot Mini 2 Aero 0.5 mm");

    s.choice(      "materialPresetSelect", "Material:")
     .option(    "polymaker_polylite_pla", "Polymaker Polylite PLA");
    s.separator("br");
    s.button(         onLoadPresetClicked, "Apply");
    s.buttonHelp("Applying presets resets all printer &amp; material settings<br>to defaults, including modified or imported settings.");

    s.page(            "settings-machine", "Machine Settings");

    s.category(                            "Hot End");
    s.fromSlicer(                          "machine_nozzle_size");

    s.category(                            "Auto Leveling");
    s.fromSlicer(                          "machine_probe_type");

    s.category(                            "Build Volume");
    s.fromSlicer(                          "machine_shape");
    s.fromSlicer(                          "machine_width");
    s.fromSlicer(                          "machine_depth");
    s.fromSlicer(                          "machine_height");
    s.fromSlicer(                          "machine_center_is_zero");
    s.fromSlicer(                          "machine_heated_bed");
    s.button(        onPrinterSizeChanged, "Save Changes");
    s.category(                            "Start/End Template");
    s.buttonHelp("Template to edit:");
    s.button(            onEditStartGcode, "Start");
    s.button(              onEditEndGcode, "End");

    s.page(                 "start-gcode");
    s.fromSlicer(                          "machine_start_gcode");
    s.button(            doneEditingGcode, "Done");

    s.page(                   "end-gcode");
    s.fromSlicer(                          "machine_end_gcode");
    s.button(            doneEditingGcode, "Done");

    s.page(              "settings-slice", "Slice Objects");

    s.category(                            "Print Strength");
    s.fromSlicer(                          "infill_pattern");
    s.fromSlicer(                          "infill_sparse_density");
    s.fromSlicer(                          "wall_line_count");

    s.category(                            "Print Speed");
    s.fromSlicer(                          "speed_print");
    s.fromSlicer(                          "layer_height");

    s.category(                            "Temperatures");
    s.fromSlicer(                          "material_print_temperature");
    s.fromSlicer(                          "material_bed_temperature");
    s.fromSlicer(                          "material_part_removal_temperature");
    s.fromSlicer(                          "material_probe_temperature");
    s.fromSlicer(                          "material_soften_temperature");
    s.fromSlicer(                          "material_wipe_temperature");

    s.category(                            "Scaffolding");
    s.fromSlicer(                          "support_enable");
    s.fromSlicer(                          "support_type");
    s.fromSlicer(                          "support_pattern");
    s.fromSlicer(                          "support_infill_rate");
    s.fromSlicer(                          "support_angle");
    s.fromSlicer(                          "adhesion_type");

    s.category(                            "Filament");
    s.fromSlicer(                          "material_diameter");
    s.fromSlicer(                          "material_flow");

    s.category(                            "Special Modes");
    s.fromSlicer(                          "magic_spiralize");
    s.fromSlicer(                          "magic_fuzzy_skin_enabled");

    s.category();
    s.separator();
    s.button(              onSliceClicked, "Slice");
    s.buttonHelp("Click this button to prepare<br>the model for printing.");

    s.page(                 "settings-print", "Print and Preview");
    s.category(                               "Print Statistics", {open: "open"});
    s.text(                     "print_time", "Print time");
    s.number(               "print_filament", "Filament used", {units: "mm²"});
    s.category(                               "Preview Options",  {open: "open"});
    s.toggle(                   "show_shell", "Show shell",       {onclick: onUpdatePreview, checked: 'checked'});
    s.toggle(                  "show_infill", "Show infill",      {onclick: onUpdatePreview});
    s.toggle(                 "show_support", "Show scaffolding", {onclick: onUpdatePreview});
    s.toggle(                  "show_travel", "Show travel",      {onclick: onUpdatePreview});
    s.slider(                "preview_layer", "Show layer",       {oninput: onUpdateLayer});
    s.category(                               "Save Options",     {open: "open"});
    s.text(                 "gcode_filename", "Save as:",         {default_value: "output.gcode"});
    s.category();
    s.separator();
    s.button(              onDownloadClicked, "Save");
    s.buttonHelp("Click this button to save<br>gcode for your 3D printer.");

    s.page(              "settings-finished", "Final Steps");
    s.element(                                "help-post-print");

    s.page(              "settings-advanced", "Advanced Features");
    s.category(                               "Slicer Output");
    s.button(            onShowLogClicked,    "Show");
    s.buttonHelp("Click this button to show<br>slicing engine logs.");

    s.category(                            "Export Settings");
    s.toggle(       "export_with_choices", "Annotate settings with units and choices");
    s.toggle(  "export_with_descriptions", "Annotate settings with descriptions");
    s.toggle(      "export_with_defaults", "Include (unchanged) default values");
    s.separator("br");
    s.text(             "export_filename", "Save as:", {default_value: "config.toml"});
    s.separator("br");
    s.button(         onExportClicked,     "Export");
    s.buttonHelp("Click this button to save changed<br>settings to your computer.");

    s.category(                            "Import Settings");
    s.file(                "importSelect", {'text': "Drop settings file here", 'callback': onImportChange});
    s.separator("br");
    s.button(         onImportClicked, "Apply", {'id': "import_settings"});
    s.buttonHelp("Importing settings from a file will override<br>all printer &amp; material presets.");

    s.page(               "settings-help",    "Help");
    s.heading(                                "View Controls:");
    s.element(                                "help-viewport");

    s.done();

    s.onPageExit = onPageExit;

    settings = s;

    onFileChange(); // Disable buttons
    onImportChange(); // Disable buttons
    $('#done_placing').attr('disabled', true);
    loadStartupProfile();
}

function loadStartupProfile() {
    // Always start with defaults.
    slicer.config.loadDefaults(true);

    if (typeof(Storage) !== "undefined") {
        // Install handler for saving profile
        window.onunload = function() {
            console.log("Saved setting to local storage");
            localStorage.setItem("startup_config", slicer.config.saveProfileStr());
        }

        var stored_config = localStorage.getItem("startup_config");
        if(stored_config) {
            console.log("Loaded settings from local storage");
            slicer.config.loadProfileStr(stored_config);
            onPrinterSizeChanged();
            return;
        }
    }

    // If no local profile is found, reload starting profile
    onLoadPresetClicked(true);
}

function onEditStartGcode() {
    settings.gotoPage("start-gcode");
}

function onEditEndGcode() {
    settings.gotoPage("end-gcode");
}

function onGotoSliceClicked() {
    settings.gotoPage("settings-slice");
}

function onShowLogClicked() {
    $("#log-dialog").show();
}

function onHideLogClicked() {
    $("#log-dialog").hide();
}

function onPrinterSizeChanged() {
    var circular         = $("#machine_shape").val() == "elliptic";
    var origin_at_center = $("#machine_center_is_zero").is(':checked');
    var x_width          = parseFloat($("#machine_width").val());
    var y_depth          = parseFloat($("#machine_depth").val());
    var z_height         = parseFloat($("#machine_height").val());

    stage.setPrinterCharacteristics(circular, origin_at_center, x_width, y_depth, z_height);
}

function onLoadPresetClicked(noAlert) {
    slicer.config.loadDefaults();
    slicer.config.loadProfile("machine", $("#machinePresetSelect").val() + ".toml", onPrinterSizeChanged);
    slicer.config.loadProfile("print",   $("#materialPresetSelect").val() + ".toml");
    if(!noAlert) alert("The new presets have been applied.");
}

function onImportChange(file) {
    $('#import_settings').attr('disabled', file ? false : true);
}

function onImportClicked() {
    alert("The new settings have been applied.");
    var stored_config = settings.get("importSelect");
    slicer.config.loadProfileStr(stored_config);
    onPrinterSizeChanged();
}

function onExportClicked() {
    var config = slicer.config.saveProfileStr({
        descriptions: $("#export_with_descriptions").is(':checked'),
        defaults:     $("#export_with_defaults").is(':checked'),
        choices:      $("#export_with_choices").is(':checked')
    });
    var blob = new Blob([config], {type: "text/plain;charset=utf-8"});
    var filename = settings.get("export_filename");
    saveAs(blob, filename);
}

function doneEditingGcode() {
    settings.gotoPage("settings-machine");
}

function onFileChange(file) {
    $('#add_to_platform').attr('disabled', file ? false : true);
}

function onAddToPlatform() {
    var stlData = settings.get("fileSelect");
    var geometry = GEOMETRY_READERS.readStl(stlData, GEOMETRY_READERS.THREEGeometryCreator);
    stage.addGeometry(geometry);

    var filename = settings.get("fileSelect_filename");
    document.getElementById("gcode_filename").value = filename.replace(".stl", ".gcode");
    $('#done_placing').attr('disabled', false);
}

function onClearPlatform() {
    stage.removeObjects();
    $('#done_placing').attr('disabled', true);
}

function onSliceClicked() {
    var geometries = stage.getAllGeometry();
    if(geometries.length) {
        var geometries = stage.getAllGeometry();
        var filenames  = geometries.map((geo,i) => {
            var filename = 'input_' + i + '.stl';
            slicer.loadFromGeometry(geo, filename);
            return filename;
        });
        showProgressBar();
        slicer.slice(filenames);
    }
}

function showProgressBar() {
    clearConsole();
    $("#progress-dialog").show();
    $("#progress-dialog progress").attr("value",0);
    $("#downloadGcode").hide();
}

function setProgress(value) {
    $("#progress-dialog progress").attr("value",value);
}

function hideProgressBar() {
    $("#progress-dialog").hide();
}

function setPrintTime(value) {
    $("#print_time").attr("value",value);
}

function setPrintFilament(value) {
    $("#print_filament").attr("value",value);
}

var gcode_blob;

function readyToDownload(data) {
    gcode_blob = new Blob([data], {type: "application/octet-stream"});
    hideProgressBar();
    settings.gotoPage("settings-print");

    // Show the filament pathname
    var decoder = new TextDecoder();
    var path = new GCodeParser(decoder.decode(data));
    stage.setGcodePath(path);
    var max = stage.getGcodeLayers() - 1;
    $("#preview_layer").attr("max", max).val(max);
    onUpdatePreview();
}

function onDownloadClicked() {
    var fileName = settings.get("gcode_filename");
    saveAs(gcode_blob, fileName);
    settings.gotoPage("settings-finished");
}

function onPageExit(page) {
    if(page == "settings-print") {
        stage.setGcodePath(null);
    }
}

function onUpdatePreview() {
    stage.showGcodePath("TRAVEL",            $("#show_travel").is(':checked'));
    stage.showGcodePath("SKIN",              $("#show_shell").is(':checked'));
    stage.showGcodePath("DEFAULT",           $("#show_shell").is(':checked'));
    stage.showGcodePath("WALL-OUTER",        $("#show_shell").is(':checked'));
    stage.showGcodePath("WALL-INNER",        $("#show_shell").is(':checked'));
    stage.showGcodePath("FILL",              $("#show_infill").is(':checked'));
    stage.showGcodePath("SKIRT",             $("#show_support").is(':checked'));
    stage.showGcodePath("SUPPORT",           $("#show_support").is(':checked'));
    stage.showGcodePath("SUPPORT-INTERFACE", $("#show_support").is(':checked'));
    if(stage.isGcodePathVisible) {
        $('#preview_layer').removeAttr('disabled');
    } else {
        var max = stage.getGcodeLayers() - 1;
        $('#preview_layer').attr('disabled','disabled').val(max);
    }
}

function onUpdateLayer() {
    var val = parseInt($("#preview_layer").val());
    stage.setGcodeLayer(val);
}

function onDoItAgainClicked() {
    settings.gotoPage("settings-place");
}

function showAbout() {
    document.getElementById("about").style.display = "block";
}
function hideAbout() {
    document.getElementById("about").style.display = "none";
}

function enterFullscreen() {
    var el = document.getElementById("main");
    if (el.requestFullscreen) {
        el.requestFullscreen();
    } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
    }
}