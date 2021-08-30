/**
 * WebSlicer
 * Copyright (C) 2021 SynDaver 3D
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

class SlicerSettings {
    static async populate(s) {
        const settings = localStorage.getItem("ui-slicer-settings") || query.slicer_settings || "syndaver-default";
        
        if (settings == "cura-all") return this.populateCuraSettings(s);
        if (!SlicerSettings.slicerSettings.hasOwnProperty(settings)) settings = "syndaver-default";

        for (const item of SlicerSettings.slicerSettings[settings]) {
            if (item.endsWith(":")) {
                s.category(item.slice(0,-1));
            } else if (!item.startsWith("#")){
                s.fromSlicer(item);
            }
        }
    }

    static async populateCuraSettings(s) {
        function parseChildren(child, label_prefix) {
            for (const [key, value] of Object.entries(child)) {
                s.fromSlicer(key,{},label_prefix);
                if (value.hasOwnProperty("children")) {
                    parseChildren(value.children, label_prefix + "\t");
                }
            }
        }
        const json = await fetchJSON("config/cura_defaults/fdmprinter.def.json");
        for (const [key, value] of Object.entries(json["settings"])) {
            if (key == "machine_settings" || key == "dual" || key == "command_line_settings") continue;
            if (value.type == "category") {
                s.category(value.label);
                parseChildren(value.children, "");
            }
        }
         
    }
}

SlicerSettings.slicerSettings = {
    "syndaver-beginner" : [
        // Settings list for beginners
        "Print Strength:",
            "infill_sparse_density",
            "infill_pattern",

        "Print Speed:",
            "layer_height",
            "speed_print",

        "Shell:",
            "wall_thickness",

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

        "Support &amp; Adhesion:",
            "support_enable",
            "adhesion_type",

        "Filament:",
            "material_diameter",
            "material_flow",
        ],

    "syndaver-default" : [
        // Default settings list
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
            "magic_spiralize",
            "magic_fuzzy_skin_enabled"
    ]
};