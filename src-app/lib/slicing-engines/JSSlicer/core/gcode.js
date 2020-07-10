/**
 * JavaScript GCODE Generation
 * Copyright (C) 2015 Marcio Teixeira
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

// Copy and paste into this website to run:
//   http://math.chapman.edu/~jipsen/js
//
// Copy and paste gcode into this website to preview:
//   http://nraynaud.github.io/webgcode

function GcodeWriter() {

    var last_x;
    var last_y;
    var last_z;
    var last_e;
    var last_f;

    var buffer = "";

    // Filament settings
    var filament_dia          = 1.74;

    // Printer settings
    var nozzle_dia            = 0.4;

    // Miscellaneous settings
    var c_decimals            = 3;    // Number of decimals for coordinates
    var e_decimals            = 6;    // Number of decimals for extrusion
    var retraction_mm         = 4.5;  // Number of mm to retract at the top of the strut
    var retraction_speed      = 40;

    var tip_angle             = 40;   // Angle substended by the sides of the print head tip with the horizontal

    var extrude_ratio         = undefined;

    var travel_speed          = 50;    // travel speed in mm/s

    // Initialize some derived values

    var filament_vol_per_mm = Math.PI * Math.pow(filament_dia/2,2);
    var extrude_vol_per_mm  = Math.PI * Math.pow(nozzle_dia/2,2);
    var extrude_ratio = extrude_vol_per_mm/filament_vol_per_mm;

    function write(str) {
        buffer += str + "\n";
    }

    this.clear = function() {
        buffer = "";
    }

    this.get = function() {
        return buffer;
    }

    this.start_gcode = function() {
        write(";Start gcode for Deltaprintr -- may not work with other printers");
        write( "G21        ;metric values" );
        write( "G90        ;absolute positioning" );
        write( "M107       ;start with the fan off" );
        write( "G28        ;move to endstops" );
        write( "G29" );
        write( "G92 E0     ;zero the extruded length" );
        write( "G1 F" + (travel_speed*60) .toFixed(0));
        write( ";Put printing message on LCD screen" );
        write( "M117 Printing..." );
        write(";Extrude_ratio: " + extrude_ratio);
    }

    this.end_gcode = function() {
        write(";End gcode for Deltaprintr -- may not work with other printers");
        write("M107                         ; Turn off fan");
        write("M104 S0                      ;extruder heater off");
        write("M140 S0                      ;heated bed heater off (if you have it)");
        write("G91                          ;relative positioning");
        write("G1 E-1 F300                  ;retract the filament a bit before lifting the nozzle, to release some of the pressure");
        write("G1 Z+0.5 E-5 X-20 Y-20 F3000 ;move Z up a bit and retract filament even more");
        write("G28                          ;move to endstops");
        write("M84                          ;steppers off");
        write("G90                          ;absolute positioning   ");
    }

    this.home = function() {
        write( "G00 F3000 X0 Y0" );
        last_x = 0;
        last_y = 0;
        last_z = 0;
        last_e = 0;
        last_f = 3000;
    }

    // Turns on the heater at a specific temperature
    this.heater_on = function(temp) {
        write( "M109 S" + temp.toFixed(0) );
    }

    this.cooling_fan = function(speed) {
        if(speed > 0) {
            write( "M106 S" + speed );
        } else {
            write( "M107" );
        }
    }

    // Moves to a location without extruding
    this.moveto = function(speed,pos) {
        this.lineto(speed,pos,false);
    }

    // Dwells for a given number of milliseconds
    this.dwell = function(ms) {
        write( "G4 P" + ms );
    }

    // Moves to a location while extruding
    this.lineto = function(speed,pos,extrude) {
        var x = pos[0];
        var y = pos[1];
        var z = pos[2];

        if(last_x === x && last_y === y && last_z === z)
            return;

        var e;
        if(typeof extrude === 'undefined' || extrude) {
            var dist          = Math.sqrt(Math.pow(x-last_x,2) + Math.pow(y-last_y,2) + Math.pow(z-last_z,2));
            var glide_angle   = Math.atan2(z-last_z,Math.sqrt(Math.pow(x-last_x,2) + Math.pow(y-last_y,2)));
            if(glide_angle/Math.PI*180 < -tip_angle) {
                write(";WARNING: Glide angle exceeded! " + glide_angle/Math.PI*180);
            }
            e = last_e + dist*extrude_ratio;
        } else {
            e = last_e;
        }

        var f = speed*60;
        write( "G01" +
            ((last_f !== f) ? " F" + f.toFixed(c_decimals) : "") +
            ((last_x !== x) ? " X" + x.toFixed(c_decimals) : "") +
            ((last_y !== y) ? " Y" + y.toFixed(c_decimals) : "") +
            ((last_z !== z) ? " Z" + z.toFixed(c_decimals) : "") +
            ((last_e !== e) ? " E" + e.toFixed(e_decimals) : "")
        );

        last_x = x;
        last_y = y;
        last_z = z;
        last_f = f;
        last_e = e;
    }

    // Retract the filament
    this.retract = function() {
        var e = last_e - retraction_mm;
        var f = retraction_speed*60;
        write( "G01" +
            ((last_f !== f) ? " F" + f.toFixed(c_decimals) : "") +
            " E" + e.toFixed(e_decimals)
        );
        last_f = f;
    }

    this.unretract = function() {
        var e = last_e;
        write( "G01" +
            " E" + e.toFixed(e_decimals)
        );
    }

    this.comment = function(comment) {
        write(";" + comment);
    }
}

function GcodeToEdges() {
    var edges = [];
    var last_x, last_y, last_z;

    this.clear = function() {
    }

    this.get = function() {
        return edges;
    }

    this.start_gcode = function() {
    }

    this.end_gcode = function() {
    }

    this.home = function() {
        last_x = 0;
        last_y = 0;
        last_z = 0;
    }

    this.heater_on = function(temp) {
    }

    this.cooling_fan = function(speed) {
    }

    this.moveto = function(speed,pos) {
        this.lineto(speed,pos,false);
    }

    this.dwell = function(ms) {
    }

    this.lineto = function(speed,pos,extrude) {
        var x = pos[0];
        var y = pos[1];
        var z = pos[2];

        if(last_x === x && last_y === y && last_z === z)
            return;

        if(typeof extrude === 'undefined' || extrude)
            edges.push([last_x, last_y, last_z, x, y, z]);

        last_x = x;
        last_y = y;
        last_z = z;
    }

    this.retract = function() {
    }

    this.unretract = function() {
    }

    this.comment = function(comment) {
    }
}
