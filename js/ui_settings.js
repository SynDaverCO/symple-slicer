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

    function onFileChange(file) {
        if(file) {
            $('#add_to_platform').attr('disabled', false);
        } else {
            $('#add_to_platform').attr('disabled', true);
        }
    }

    s.page(             "settings-design",  "Place Objects");
    s.file(                  "fileSelect", {'binary': true, 'text': "Drop STL file here", 'callback': onFileChange});
                 
    s.separator(     "br");
    s.button(             onAddToPlatform, "Add Object",    {'id': "add_to_platform"});
    s.button(             onClearPlatform, "Clear Objects", {'id': "clear_platform"});
    
    s.page(          "settings-profiles",  "Load Settings");
    s.choice(       "machinePresetSelect", "Printer:")
     .option( "lulzbot_mini2_aero_0.5mm" , "Lulzbot Mini 2 Aero 0.5 mm")
     .option( "lulzbot_taz_we_aero_0.5mm", "Lulzbot TAZ Workhorse Aero 0.5 mm");

    s.choice(      "materialPresetSelect", "Material:")
     .option(    "polymaker_polylite_pla", "Polymaker Polylite PLA");
    s.separator();
    s.button(         onLoadPresetClicked, "Load");
    s.buttonHelp("Loading new settings will<br>overwrite all modified values.");

    s.page(            "settings-machine", "Machine Settings");
    
    s.category(                            "Hot End");
    s.fromSlicer(                          "machine_nozzle_size");
    
    s.category(                            "Build Volume");
    s.fromSlicer(                          "machine_shape");
    s.fromSlicer(                          "machine_width");
    s.fromSlicer(                          "machine_depth");
    s.fromSlicer(                          "machine_height");
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
                   
    s.page(              "settings-print", "Slice and Print");
    
    s.category(                            "Print Strength");
    s.fromSlicer(                          "infill_pattern");
    s.fromSlicer(                          "infill_sparse_density");
    s.fromSlicer(                          "wall_line_count");
    
    s.category(                            "Scaffolding");
    s.fromSlicer(                          "support_enable");
    s.fromSlicer(                          "support_type");
    s.fromSlicer(                          "support_pattern");
    s.fromSlicer(                          "support_infill_rate");
    s.fromSlicer(                          "support_angle");
    s.fromSlicer(                          "adhesion_type");

    s.category(                            "Temperature and Speed");
    s.fromSlicer(                          "default_material_print_temperature");
    s.fromSlicer(                          "material_bed_temperature");
    s.fromSlicer(                          "speed_print");
    s.fromSlicer(                          "layer_height");
    
    s.category(                            "Filament");
    s.fromSlicer(                          "material_diameter");
    s.fromSlicer(                          "material_flow");
    
    s.category(                            "Special Modes");
    s.fromSlicer(                          "magic_spiralize");
    s.fromSlicer(                          "magic_fuzzy_skin_enabled");

    s.category();
    s.separator();
    s.button(              onSliceClicked, "Slice");
    s.buttonHelp("Click this button to save<br>gcode for your 3D printer.");

    s.page(               "settings-help", "Help");
    s.heading(                             "View Controls:");
    s.element(                             "viewport-help");

    s.done();

    settings = s;

    onFileChange(); // Disable buttons

    slicer.config.loadDefaults(true);
}

function onEditStartGcode() {
    settings.gotoPage("start-gcode");
}

function onEditEndGcode() {
    settings.gotoPage("end-gcode");
}

function onLoadPresetClicked() {
    slicer.config.loadDefaults();
    slicer.config.loadProfile("machine", $("#machinePresetSelect").val() + ".toml");
    slicer.config.loadProfile("print",   $("#materialPresetSelect").val() + ".toml");
}

function doneEditingGcode() {
    settings.gotoPage("settings-machine");
}

function entitiesToModel(entities) {
    model = new Model();
    for(var i = 0; i < entities.lines.length; i++) {
        var pts = entities.lines[i].points;
        model.addEdge(pts[0][0],pts[0][1],pts[0][2],pts[1][0],pts[1][1],pts[1][2]);
    }
    model.center();
    stage.setModel(model);
}

function onAddToPlatform() {
    var stlData = settings.get("fileSelect");
    var geometry = GEOMETRY_READERS.readStl(stlData, GEOMETRY_READERS.THREEGeometryCreator);
    stage.addGeometry(geometry);
}

function onClearPlatform() {
    stage.removeObjects();
}

function onSliceClicked() {
    var geometries = stage.getAllGeometry();
    if(geometries.length) {
        showProgressBar();
        stage.getAllGeometry().forEach((geo,i) => slicer.loadFromGeometry(geo, 'input' + (i || '') + '.stl'));
        slicer.slice();
    }
}

function showProgressBar() {
    clearConsole();
    $("#progress").show();
    $("#progress progress").attr("value",0);
    $("#downloadGcode").hide();
}

function readyToDownload(data) {
    var blob = new Blob([data], {type: "application/octet-stream"});
    var fileName = "cura.gcode";

    $("#progress progress").attr("value",100);
    $("#progressBtn").html("Download GCODE").unbind().click(
        function() {
            saveAs(blob, fileName);
            $("#progressBtn").html("Close").unbind().click(afterDownload);
        }
    ).show();
}

function afterDownload() {
    $("#progress").hide();
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