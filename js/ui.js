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
    s.heading(                             "Machine:");
    s.parameter(      "printerNozzleSize", "Nozzle Size (mm)",         0.4);
    s.heading(                             "Build area:");
    s.choice(       "platformStyleSelect", "Shape")
     .option(               "rectangular", "Rectangular")
     .option(               "circular",    "Circular");
    s.parameter(        "printerMaxWidth", "Maximum width (mm)",  300);
    s.parameter(        "printerMaxDepth", "Maximum depth (mm)",  300);
    s.parameter(       "printerMaxHeight", "Maximum height (mm)", 300);
    s.heading(                             "Start/End Gcode:");
    s.choice(             "editGcodeMenu", "Edit gcode template")
     .option(                      "none", "...")
     .option(               "start-gcode", "start")
     .option(                 "end-gcode", "end");

    s.page(                 "start-gcode");
    s.heading(                             "Start GCode template:");
    s.textarea(              "startGcode");
    s.button(            doneEditingGcode, "Done");
                   
    s.page(                   "end-gcode");
    s.heading(                             "End GCode template:");
    s.textarea(                "endGcode");
    s.button(            doneEditingGcode, "Done");
                   
    s.page(              "settings-print", "Slice and Print");
    s.heading(                             "Print Strength:");
    s.choice(                  "infill",   "Infill Pattern:")
     .option(                      "grid", "Grid")
     .option(                     "lines", "Lines")
     .option(                    "gyroid", "Gyroid");
    s.parameter(          "infillDensity", "Infill Density (%):",           30);
    s.parameter(           "wallLineCount","Wall Line Count:",           2);
    s.heading(                             "Scaffolding:");
    s.choice(                  "supports", "Support Material:")
     .option(                      "none", "None")
     .option(                "everywhere", "Everywhere")
     .option(      "touching-build-plate", "Touching Build Plate");
    s.parameter(          "infillDensity", "Support Angle:",           30);
    s.choice(                  "adhesion", "Bed Adhesion:")
     .option(                     "skirt", "Skirt")
     .option(                      "brim", "Brim")
     .option(                      "raft", "Raft")
     .option(                      "none", "None");
    s.heading(                             "Temperature and Speed:");
    s.parameter(       "printTemperature", "Printing temperature (C):",     200);
    s.parameter(         "bedTemperature", "Bed temperature (C):",     200);
    s.parameter(             "printSpeed", "Print speed (mm/s):",           50);
    s.parameter(            "layerHeight", "Layer Height (mm):",           0.25);
    s.heading(                             "Filament:");
    s.choice(          "filamentDiameter", "Filament Diameter (mm):")
     .option(                      "1.75", "1.75")
     .option(                      "3.00", "3.00");
    s.parameter(           "filamentFlow", "Flow (%):",                     100);
    s.separator();
    s.button(              onSliceClicked, "Slice");
    s.buttonHelp("Click this button to save<br>gcode for your 3D printer.");

    s.page(               "settings-help", "Help");
    s.heading(                             "View Controls:");
    s.element(                             "viewport-help");

    s.done();

    settings = s;

    // Set the callbacks

    document.getElementById("editGcodeMenu").onchange        = onEditGcodeSelect;

    onFileChange(); // Disable buttons
}

function onEditGcodeSelect() {
    var choice = $("#editGcodeMenu").val();
    if(choice != "none") {
        settings.gotoPage(choice);
    }
}

function onLoadPresetClicked() {
    slicer.loadDefaults();
    slicer.loadProfile("machine", $("#machinePresetSelect").val() + ".toml");
    slicer.loadProfile("print",   $("#materialPresetSelect").val() + ".toml");
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