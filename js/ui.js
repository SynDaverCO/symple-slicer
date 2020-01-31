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
var toolbox;

function toolboxInit() {
	var t = new ToolboxUI("toolbox");
	
	t.page(          "toolbox-design",  "Placement Menu");
	t.file(          "fileSelect", true);
	
	t.separator(     "br");
	t.button(          onAddToPlatform, "Add to Platform");
	t.button(          onClearPlatform, "Clear Platform");
	
	t.page(          "toolbox-machine", "Machine Preferences");
	t.heading(                          "Load Preset:");
	t.choice(    "machinePresetSelect", "")
	 .option(         "deltaprintr-ks", "Deltaprintr Kickstarter Edition");
	t.heading(                          "Machine:");
	t.parameter(   "printerNozzleSize", "Nozzle (mm)",   0.4);
	t.heading(                          "Build area:");
	t.choice(    "platformStyleSelect", "Shape")
	 .option(            "rectangular", "Rectangular")
	 .option(            "circular",    "Circular");
	t.parameter(     "printerMaxWidth", "Maximum width (mm)",  300);
	t.parameter(     "printerMaxDepth", "Maximum depth (mm)",  300);
	t.parameter(    "printerMaxHeight", "Maximum height (mm)", 300);
	t.heading(                          "Start/End Gcode:");
	t.choice(          "editGcodeMenu", "Edit gcode template")
	 .option(                   "none", "...")
	 .option(            "start-gcode", "start")
	 .option(              "end-gcode", "end");
	
	t.page(              "start-gcode");
	t.heading(                          "Start GCode template:");
	t.textarea(           "startGcode");
	t.button(         doneEditingGcode, "Done");
	
	t.page(                "end-gcode");
	t.heading(                          "End GCode template:");
	t.textarea(             "endGcode");
	t.button(         doneEditingGcode, "Done");
	
	t.page(            "toolbox-print", "Print Menu");
	t.heading(                          "Quality:");
	t.parameter("bottomLayerThickness", "Bottom layer thickness (mm)",  0.2);
	t.heading(                          "Speed and Temperature:");
	t.parameter(    "printTemperature", "Printing temperature (C)",     200);
	t.parameter(          "printSpeed", "Print speed (mm/s)",           50);
	t.parameter(         "travelSpeed", "Travel speed (mm/s)",          70);
	t.heading(                          "Filament:");
	t.parameter(    "filamentDiameter", "Diameter (mm)",                1.4);
	t.parameter(        "filamentFlow", "Flow (%)",                     100);
	t.separator();
	t.button(              onSaveGcode, "Slice");
	t.buttonHelp("Click this button to save .gcode you<br>can then send to your 3D printer.");
	
	t.page(             "toolbox-help", "Help");
	t.heading(                          "View Controls:");
	t.element(                          "viewport-help");
	
	t.done();

	toolbox = t;
	
	// Set the callbacks
	
	document.getElementById("editGcodeMenu").onchange = onEditGcodeSelect;
}

function onEditGcodeSelect() {
	var choice = $("#editGcodeMenu").val();
	if(choice != "none") {
		toolbox.gotoPage(choice);
	}
}

function doneEditingGcode() {
	toolbox.gotoPage("toolbox-machine");
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
	var stlData = toolbox.get("fileSelect");
	var geometry = GEOMETRY_READERS.readStl(stlData, GEOMETRY_READERS.THREEGeometryCreator);
	stage.addGeometry(geometry);
}

function onClearPlatform() {
	
}

function onSaveGcode() {
    slicer.sliceGeometry(stage.getGeometry());
}