/**
 *
 * @licstart
 *
 * Web Cura
 * Copyright (C) 2020 SynDaver Labs, Inc.
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
 *
 * @licend
 *
 */

var arg_str = 'slice -v \
    -j resources/lulzbot_redgum_goldenrod.def.json \
    -o output.gcode \
-s print_bed_temperature="60" \
-s support_tree_wall_thickness="0.5" \
-s printer_name="LulzBot TAZ 6 Aerostruder" \
-s support_z_distance="0.2" \
-s support_interface_line_width="0.5" \
-s time="12:02:19" \
-s print_temperature="195" \
-s material_keep_part_removal_temperature_t="45.0" \
-s wall_line_width="0.5" \
-s line_width="0.5" \
-s skin_overlap="5" \
-s raft_acceleration="500" \
-s date="22-01-2020" \
-s start_layers_at_same_position="False" \
-s jerk_support_roof="12" \
-s material_name="PLA (Village Plastics)" \
-s jerk_roofing="12" \
-s support_bottom_distance="0.2" \
-s speed_layer_0="15" \
-s acceleration_support_roof="500" \
-s support_bottom_line_width="0.5" \
-s max_feedrate_z_override="0" \
-s cool_fan_full_at_height="1" \
-s skin_no_small_gaps_heuristic="True" \
-s speed_wall_x="35" \
-s speed_wall_0="30" \
-s speed_infill="40" \
-s switch_extruder_retraction_amount="16" \
-s prime_tower_size="6.282808624375432" \
-s retraction_retract_speed="10" \
-s jerk_ironing="12" \
-s cross_infill_pocket_size="5.0" \
-s material_print_temperature_layer_0="200" \
-s material_print_temperature="195" \
-s min_skin_width_for_expansion="4.6536578367599424e-17" \
-s speed_travel_layer_0="43.75" \
-s infill_sparse_thickness="0.38" \
-s skin_overlap_mm="0.025" \
-s infill_overlap_mm="0.05" \
-s outer_inset_first="False" \
-s infill_angles="[ ]" \
-s cross_infill_apply_pockets_alternatingly="True" \
-s zig_zaggify_infill="True" \
-s retraction_amount="1" \
-s z_seam_corner="z_seam_corner_inner" \
-s material_extrusion_cool_down_speed="0.7" \
-s infill_pattern="grid" \
-s layer_height="0.38" \
-s prime_tower_purge_volume="0" \
-s sub_div_rad_add="0.5" \
-s support_roof_line_width="0.5" \
-s meshfix_maximum_resolution="0.01" \
-s raft_speed="30.0" \
-s gradual_support_infill_step_height="1" \
-s alternate_extra_perimeter="False" \
-s material_flow_layer_0="100" \
-s speed_prime_tower="60" \
-s machine_heat_zone_length="16" \
-s ironing_flow="10.0" \
-s support_zag_skip_count="12" \
-s switch_extruder_retraction_speed="20" \
-s ironing_inset="0.25" \
-s layer_0_z_overlap="0.5" \
-s machine_filament_park_distance="16" \
-s acceleration_ironing="500" \
-s mesh_rotation_matrix="[[1,0,0], [0,1,0], [0,0,1]]" \
-s retraction_prime_speed="10" \
-s gradual_infill_step_height="1.5" \
-s top_layers="2" \
-s infill_wipe_dist="0.125" \
-s machine_nozzle_tip_outer_diameter="1" \
-s day="Wed" \
-s material_bed_temperature_layer_0="60" \
-s machine_nozzle_cool_down_speed="2.0" \
-s raft_surface_jerk="12" \
-s multiple_mesh_overlap="0.15" \
-s fill_outline_gaps="False" \
-s infill_line_width="0.5" \
-s top_bottom_pattern="lines" \
-s support_interface_height="1" \
-s initial_layer_line_width_factor="100.0" \
-s support_xy_distance="1.5" \
-s layer_height_0="0.425" \
-s support="0" \
-s material_bed_temp_prepend="False" \
-s material_diameter="2.85" \
-s machine_port="AUTO" \
-s wall_thickness="1.0" \
-s brim_outside_only="True" \
-s infill_line_distance="5.0" \
-s raft_interface_line_spacing="1.2" \
-s material_probe_temperature_0="140" \
-s skirt_brim_line_width="0.5" \
-s brim_line_count="10" \
-s speed_roofing="30" \
-s raft_base_acceleration="500" \
-s initial_extruder_nr="0" \
-s material_initial_print_temperature="185" \
-s raft_jerk="12" \
-s wall_line_width_0="0.5" \
-s skin_alternate_rotation="False" \
-s support_line_width="0.5" \
-s cool_fan_full_layer="3" \
-s bottom_layers="2" \
-s material_bed_temperature="60" \
-s prime_tower_line_width="0.5" \
-s wall_line_width_x="0.5" \
-s raft_surface_line_width="0.5" \
-s wall_0_wipe_dist="0.25" \
-s smooth_spiralized_contours="False" \
-s skin_line_width="0.5" \
-s raft_interface_jerk="12" \
-s machine_wipe_gcode="G28 Z ; home Z \
G1 E-30 F100 ; retract filament \
M109 R{material_wipe_temperature} ; wait for extruder to reach wiping temp \
G1 X-15 Y100 F3000 ; move above wiper pad \
G1 Z1 ; push nozzle into wiper \
G1 X-17 Y95 F1000 ; slow wipe \
G1 X-17 Y90 F1000 ; slow wipe \
G1 X-17 Y85 F1000 ; slow wipe \
G1 X-15 Y90 F1000 ; slow wipe \
G1 X-17 Y80 F1000 ; slow wipe \
G1 X-15 Y95 F1000 ; slow wipe \
G1 X-17 Y75 F2000 ; fast wipe \
G1 X-15 Y65 F2000 ; fast wipe \
G1 X-17 Y70 F2000 ; fast wipe \
G1 X-15 Y60 F2000 ; fast wipe \
G1 X-17 Y55 F2000 ; fast wipe \
G1 X-15 Y50 F2000 ; fast wipe \
G1 X-17 Y40 F2000 ; fast wipe \
G1 X-15 Y45 F2000 ; fast wipe \
G1 X-17 Y35 F2000 ; fast wipe \
G1 X-15 Y40 F2000 ; fast wipe \
G1 X-17 Y70 F2000 ; fast wipe \
G1 X-15 Y30 Z2 F2000 ; fast wipe \
G1 X-17 Y35 F2000 ; fast wipe \
G1 X-15 Y25 F2000 ; fast wipe \
G1 X-17 Y30 F2000 ; fast wipe \
G1 X-15 Y25 Z1.5 F1000 ; slow wipe \
G1 X-17 Y23 F1000 ; slow wipe \
G1 Z10 ; raise extruder" \
-s raft_base_line_width="1.0" \
-s support_top_distance="0.2" \
-s carve_multiple_volumes="False" \
-s skirt_brim_speed="15" \
-s z_seam_y="840" \
-s retraction_min_travel="1.0" \
-s retraction_extrusion_window="1" \
-s default_material_print_temperature="210" \
-s cool_fan_speed_min="80" \
-s cool_min_layer_time_fan_speed_max="15" \
-s material_part_removal_temperature="45.0" \
-s raft_surface_line_spacing="0.5" \
-s infill_hollow="False" \
-s support_line_distance="1.6666666666666667" \
-s cool_min_layer_time="15" \
-s support_infill_sparse_thickness="0.38" \
-s dual_pre_wipe="True" \
-s retraction_speed="10" \
-s material_soften_temperature_0="140" \
-s support_roof_line_distance="0.5" \
-s support_bottom_line_distance="0.5" \
-s support_minimal_diameter="3.0" \
-s prime_blob_enable="True" \
-s adhesion_type="skirt" \
-s prime_tower_position_x="275.3" \
-s raft_airgap="0.5" \
-s prime_tower_min_volume="10" \
-s support_xy_distance_overhang="0.25" \
-s raft_surface_thickness="0.38" \
-s raft_interface_thickness="0.5700000000000001" \
-s raft_interface_line_width="1.0" \
-s raft_base_thickness="0.51" \
-s raft_base_line_spacing="2.0" \
-s raft_interface_speed="22.5" \
-s support_offset="0.2" \
-s raft_base_speed="22.5" \
-s raft_surface_acceleration="500" \
-s speed_print_layer_0="15" \
-s raft_interface_acceleration="500" \
-s raft_base_jerk="12" \
-s meshfix_union_all_remove_holes="False" \
-s support_tree_collision_resolution="0.25" \
-s roofing_line_width="0.5" \
-s acceleration_support_bottom="500" \
-s prime_tower_wall_thickness="1.328" \
-s jerk_support_bottom="12" \
-s acceleration_roofing="500" \
-s prime_tower_position_y="269.0171913756246" \
-s z_seam_x="140.0" \
-s raft_surface_speed="30.0" \
-s quality_name="High speed" \
-s coasting_volume="0.064" \
-s material_final_print_temperature="180" \
-s material_print_temperature_0="195" \
-s adaptive_layer_height_threshold="200.0" \
-s speed_travel="175" \
-s support_tree_branch_distance="4" \
-s top_thickness="0.76" \
-g -e0 \
-s bottom_thickness="0.76" \
-s support_angle="50" \
-s raft_surface_thickness="0.38" \
-s speed_wall_x="35" \
-s raft_interface_acceleration="500" \
-s retraction_amount="1" \
-s support_infill_rate="30" \
-s material_standby_temperature="175" \
-s material_guid="57ffda11-0178-46ea-afc2-26414151975d" \
-s default_material_print_temperature="205" \
-s speed_topbottom="30" \
-s meshfix_maximum_deviation="1" \
-e0 \
-j resources/lulzbot_redgum_goldenrod_extruder.def.json \
-s skin_edge_support_layers="1" \
-s bridge_sparse_infill_max_density="1" \
-s machine_extruders_share_heater="false" \
-l input.stl';