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
    
    s.page(          "settings-design",  "Place Objects");
    s.file(          "fileSelect", true, "Drop STL file here");
    
    s.separator(     "br");
    s.button(          onAddToPlatform, "Add to Platform");
    s.button(          onClearPlatform, "Clear Platform");
    
    s.page(         "settings-machine", "Configure Machine");
    s.heading(                          "Load Preset:");
    s.choice(    "machinePresetSelect", "")
     .option(           "lulzbot-mini", "Lulzbot Mini 2")
     .option(         "deltaprintr-ks", "Deltaprintr Kickstarter Edition");
    s.heading(                          "Machine:");
    s.parameter(   "printerNozzleSize", "Nozzle (mm)",   0.4);
    s.heading(                          "Build area:");
    s.choice(    "platformStyleSelect", "Shape")
     .option(            "rectangular", "Rectangular")
     .option(            "circular",    "Circular");
    s.parameter(     "printerMaxWidth", "Maximum width (mm)",  300);
    s.parameter(     "printerMaxDepth", "Maximum depth (mm)",  300);
    s.parameter(    "printerMaxHeight", "Maximum height (mm)", 300);
    s.heading(                          "Start/End Gcode:");
    s.choice(          "editGcodeMenu", "Edit gcode template")
     .option(                   "none", "...")
     .option(            "start-gcode", "start")
     .option(              "end-gcode", "end");
    
    s.page(              "start-gcode");
    s.heading(                          "Start GCode template:");
    s.textarea(           "startGcode");
    s.button(         doneEditingGcode, "Done");
    
    s.page(                "end-gcode");
    s.heading(                          "End GCode template:");
    s.textarea(             "endGcode");
    s.button(         doneEditingGcode, "Done");
    
    s.page(           "settings-print", "Slice and Print");
    s.heading(                          "Load Preset:");
    s.choice(    "materialPresetSelect", "")
     .option(         "pla-high-speed", "PLA High Speed")
     .option(        "pla-high-detail", "PLA High Detail");
    s.heading(                          "Quality:");
    s.parameter("bottomLayerThickness", "Bottom layer thickness (mm)",  0.2);
    s.heading(                          "Speed and Temperature:");
    s.parameter(    "printTemperature", "Printing temperature (C)",     200);
    s.parameter(          "printSpeed", "Print speed (mm/s)",           50);
    s.parameter(         "travelSpeed", "Travel speed (mm/s)",          70);
    s.heading(                          "Filament:");
    s.parameter(    "filamentDiameter", "Diameter (mm)",                1.4);
    s.parameter(        "filamentFlow", "Flow (%)",                     100);
    s.separator();
    s.button(              onSaveGcode, "Slice");
    s.buttonHelp("Click this button to save .gcode you<br>can then send to your 3D printer.");
    
    s.page(            "settings-help", "Help");
    s.heading(                          "View Controls:");
    s.element(                          "viewport-help");
    
    s.done();

    settings = s;
    
    // Set the callbacks
    
    document.getElementById("editGcodeMenu").onchange = onEditGcodeSelect;
}

function onEditGcodeSelect() {
    var choice = $("#editGcodeMenu").val();
    if(choice != "none") {
        settings.gotoPage(choice);
    }
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

function onSaveGcode() {
    stage.getAllGeometry().forEach((geo,i) => slicer.loadFromGeometry(geo, 'input' + i || '' + '.stl'));
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