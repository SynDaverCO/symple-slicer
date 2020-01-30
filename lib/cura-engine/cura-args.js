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
-s material_wipe_temperature="160" \
-s print_bed_temperature="60" \
-s travel_compensate_overlapping_walls_enabled="True" \
-s support_roof_density="100" \
-s support_tree_wall_thickness="0.5" \
-s acceleration_print="500" \
-s wall_extruder_nr="-1" \
-s shell="0" \
-s jerk_layer_0="12" \
-s printer_name="LulzBot TAZ 6 Aerostruder" \
-s command_line_settings="0" \
-s speed="0" \
-s infill_sparse_density="20" \
-s firmware_machine_type="LulzBot TAZ 6" \
-s machine_head_polygon="[[-1, 1], [-1, -1], [1, -1], [1, 1]]" \
-s support_z_distance="0.2" \
-s acceleration_support_interface="500" \
-s material_flow="100" \
-s support_interface_line_width="0.5" \
-s machine_settings="0" \
-s wireframe_flow="100" \
-s machine_nozzle_offset_y="0" \
-s speed_support_interface="40.0" \
-s time="12:02:19" \
-s print_temperature="195" \
-s material_soften_temperature="170" \
-s cooling="0" \
-s brim_width="8.0" \
-s speed_support="60" \
-s infill="0" \
-s top_bottom_thickness="0.8" \
-s speed_print="60" \
-s material_keep_part_removal_temperature_t="45.0" \
-s wall_line_width="0.5" \
-s line_width="0.5" \
-s speed_wall="30.0" \
-s skin_overlap="5" \
-s skin_preshrink="1.0" \
-s support_bottom_density="100" \
-s acceleration_wall="500" \
-s raft_acceleration="500" \
-s support_skip_zag_per_mm="20" \
-s jerk_wall="12" \
-s date="22-01-2020" \
-s switch_extruder_retraction_speeds="20" \
-s support_extruder_nr="0" \
-s material_keep_part_removal_temperature="True" \
-s jerk_print="12" \
-s start_layers_at_same_position="False" \
-s jerk_prime_tower="12" \
-s travel_avoid_other_parts="True" \
-s jerk_support_roof="12" \
-s jerk_print_layer_0="12" \
-s material_print_temp_prepend="False" \
-s jerk_travel="12" \
-s material_name="PLA (Village Plastics)" \
-s jerk_roofing="12" \
-s support_bottom_distance="0.2" \
-s jerk_wall_x="12" \
-s speed_layer_0="15" \
-s jerk_wall_0="12" \
-s machine_max_jerk_e="5.0" \
-s jerk_enabled="False" \
-s material_probe_temperature="160" \
-s blackmagic="0" \
-s acceleration_support_roof="500" \
-s prime_tower_enable="False" \
-s acceleration_wall_x="500" \
-s support_bottom_line_width="0.5" \
-s max_feedrate_z_override="0" \
-s skirt_brim_minimal_length="250" \
-s raft_smoothing="5" \
-s cool_fan_full_at_height="1" \
-s conical_overhang_angle="50" \
-s machine_has_lcd="True" \
-s skin_no_small_gaps_heuristic="True" \
-s layer_start_x="0.0" \
-s speed_wall_x="35" \
-s speed_wall_0="30" \
-s speed_infill="40" \
-s switch_extruder_retraction_amount="16" \
-s spaghetti_infill_stepped="True" \
-s prime_tower_size="6.282808624375432" \
-s retraction_retract_speed="10" \
-s machine_nozzle_heat_up_speed="2.0" \
-s extruder_prime_pos_x="0" \
-s material_surface_energy="100" \
-s travel_avoid_distance="0.625" \
-s jerk_ironing="12" \
-s retraction_extra_prime_amount="0" \
-s cross_infill_pocket_size="5.0" \
-s material_print_temperature_layer_0="200" \
-s material_print_temperature="195" \
-s jerk_topbottom="12" \
-s draft_shield_height="10" \
-s min_skin_width_for_expansion="4.6536578367599424e-17" \
-s flow_rate_extrusion_offset_factor="100" \
-s speed_travel_layer_0="43.75" \
-s wireframe_roof_outer_delay="0.2" \
-s top_skin_expand_distance="1.0" \
-s experimental="0" \
-s bottom_skin_preshrink="1.0" \
-s extruder_prime_pos_abs="False" \
-s top_skin_preshrink="1.0" \
-s adhesion_extruder_nr="0" \
-s infill_before_walls="False" \
-s gradual_infill_steps="0" \
-s infill_sparse_thickness="0.38" \
-s skin_overlap_mm="0.025" \
-s speed_equalize_flow_enabled="False" \
-s mold_angle="40" \
-s acceleration_layer_0="500" \
-s machine_start_gcode=";This G-Code has been generated specifically for the LulzBot TAZ 6 with Aerosturder \
M75 ; start GLCD timer \
G26 ; clear potential probe fail condition \
G21 ; set units to Millimetres \
M107 ; disable fans \
G90 ; absolute positioning \
M82 ; set extruder to absolute mode \
G92 E0 ; set extruder position to 0 \
M140 S60 ; start bed heating up \
G28 XY ; home X and Y \
G1 X-19 Y258 F1000 ; move to safe homing position \
M109 R140 ; soften filament before homing Z \
G28 Z ; home Z \
G1 E-15 F100 ; retract filament \
M109 R140 ; wait for extruder to reach wiping temp \
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
G1 Z10 ; raise extruder \
M109 R140 ; wait for extruder to reach probe temp \
G1 X-9 Y-9 ; move above first probe point \
M204 S100 ; set probing acceleration \
G29 ; start auto-leveling sequence \
M204 S500 ; restore standard acceleration \
G1 X0 Y0 Z15 F5000 ; move up off last probe point \
G4 S1 ; pause \
M400 ; wait for moves to finish \
M117 Heating... ; progress indicator message on LCD \
M109 R195 ; wait for extruder to reach printing temp \
M190 S60 ; wait for bed to reach printing temp \
G1 Z2 E0 F75 ; prime tiny bit of filament into the nozzle \
M117 TAZ 6 Printing... ; progress indicator message on LCD \
" \
-s wireframe_up_half_speed="0.3" \
-s machine_firmware_retract="False" \
-s infill_overlap_mm="0.05" \
-s outer_inset_first="False" \
-s infill_offset_x="0" \
-s magic_fuzzy_skin_enabled="False" \
-s infill_angles="[ ]" \
-s cross_infill_apply_pockets_alternatingly="True" \
-s zig_zaggify_infill="True" \
-s retraction_amount="1" \
-s z_seam_corner="z_seam_corner_inner" \
-s machine_max_jerk_z="0.4" \
-s acceleration_topbottom="500" \
-s material_extrusion_cool_down_speed="0.7" \
-s infill_pattern="grid" \
-s support_tower_roof_angle="65" \
-s adaptive_layer_height_enabled="False" \
-s optimize_wall_printing_order="False" \
-s acceleration_travel_layer_0="500.0" \
-s layer_height="0.38" \
-s prime_tower_purge_volume="0" \
-s sub_div_rad_add="0.5" \
-s machine_max_feedrate_x="800" \
-s material_adhesion_tendency="10" \
-s support_roof_line_width="0.5" \
-s machine_max_feedrate_y="800" \
-s meshfix_maximum_resolution="0.01" \
-s machine_max_acceleration_y="9000" \
-s raft_speed="30.0" \
-s machine_show_variants="False" \
-s gradual_support_infill_step_height="1" \
-s alternate_extra_perimeter="False" \
-s material_flow_layer_0="100" \
-s machine_nozzle_size="0.5" \
-s speed_prime_tower="60" \
-s machine_heat_zone_length="16" \
-s ironing_flow="10.0" \
-s ooze_shield_dist="2" \
-s support_zag_skip_count="12" \
-s cutting_mesh="False" \
-s wireframe_drag_along="0.6" \
-s roofing_extruder_nr="-1" \
-s switch_extruder_retraction_speed="20" \
-s gantry_height="9999999" \
-s ironing_inset="0.25" \
-s layer_0_z_overlap="0.5" \
-s wireframe_bottom_delay="0" \
-s machine_filament_park_distance="16" \
-s extruder_prime_pos_z="0" \
-s acceleration_ironing="500" \
-s acceleration_wall_0="500" \
-s mesh_rotation_matrix="[[1,0,0], [0,1,0], [0,0,1]]" \
-s retraction_prime_speed="10" \
-s machine_nozzle_temp_enabled="True" \
-s gradual_infill_step_height="1.5" \
-s meshfix_keep_open_polygons="False" \
-s mesh_position_x="0" \
-s machine_width="280" \
-s top_layers="2" \
-s machine_heated_bed="True" \
-s infill_wipe_dist="0.125" \
-s machine_nozzle_tip_outer_diameter="1" \
-s day="Wed" \
-s material_bed_temperature_layer_0="60" \
-s machine_max_acceleration_e="1000" \
-s support_bottom_height="1" \
-s machine_nozzle_offset_x="0" \
-s machine_nozzle_cool_down_speed="2.0" \
-s acceleration_travel="500" \
-s raft_surface_jerk="12" \
-s multiple_mesh_overlap="0.15" \
-s fill_outline_gaps="False" \
-s infill_line_width="0.5" \
-s machine_nozzle_expansion_angle="45" \
-s top_bottom_pattern="lines" \
-s machine_baudrate="250000" \
-s coasting_speed="90" \
-s speed_equalize_flow_max="150" \
-s roofing_layer_count="0" \
-s machine_level_x_axis_gcode="0" \
-s support_interface_height="1" \
-s initial_layer_line_width_factor="100.0" \
-s support_xy_distance="1.5" \
-s machine_nozzle_id="unknown" \
-s layer_height_0="0.425" \
-s support_conical_min_width="5.0" \
-s support="0" \
-s material_bed_temp_prepend="False" \
-s travel_compensate_overlapping_walls_0_enabled="True" \
-s material_diameter="2.85" \
-s top_bottom_extruder_nr="-1" \
-s machine_max_acceleration_z="100" \
-s support_bottom_pattern="concentric" \
-s machine_depth="280" \
-s machine_port="AUTO" \
-s wall_thickness="1.0" \
-s min_infill_area="0" \
-s machine_height="250" \
-s support_connect_zigzags="True" \
-s wall_x_extruder_nr="-1" \
-s brim_outside_only="True" \
-s machine_head_with_fans_polygon="[[-20, 10], [10, 10], [10, -10], [-20, -10]]" \
-s jerk_support_infill="12" \
-s infill_line_distance="5.0" \
-s raft_interface_line_spacing="1.2" \
-s material_probe_temperature_0="140" \
-s machine_end_gcode="M400                                      ; wait for moves to finish \
M140 S45.0 ; start bed cooling \
M104 S0                                   ; disable hotend \
M107                                      ; disable fans \
G91                                       ; relative positioning \
G1 E-1 F300                               ; filament retraction to release pressure \
G1 Z20 E-5 X-20 Y-20 F3000                ; lift up and retract even more filament \
G1 E6                                     ; re-prime extruder \
M117 Cooling please wait                  ; progress indicator message on LCD \
G90                                       ; absolute positioning \
G1 Y0 F3000                               ; move to cooling position \
M190 R45.0 ; wait for bed to cool down to removal temp \
G1 Y280 F3000                             ; present finished print \
M140 S45.0; keep temperature or cool downs \
M77					  ; stop GLCD timer \
M84                                       ; disable steppers \
G90                                       ; absolute positioning \
" \
-s skirt_brim_line_width="0.5" \
-s acceleration_support="500" \
-s brim_line_count="10" \
-s machine_max_acceleration_x="9000" \
-s slicing_tolerance="middle" \
-s speed_support_roof="40.0" \
-s wireframe_top_delay="0" \
-s acceleration_skirt_brim="500" \
-s acceleration_print_layer_0="500" \
-s speed_roofing="30" \
-s material_standby_temperature="150" \
-s infill_extruder_nr="-1" \
-s skin_angles="[ ]" \
-s jerk_infill="12" \
-s acceleration_infill="500" \
-s travel_retract_before_outer_wall="False" \
-s switch_extruder_prime_speed="20" \
-s raft_base_acceleration="500" \
-s initial_extruder_nr="0" \
-s dual="0" \
-s cool_min_speed="10" \
-s material_initial_print_temperature="185" \
-s layer_start_y="0.0" \
-s wireframe_flow_connection="100" \
-s raft_jerk="12" \
-s retraction_combing="all" \
-s machine_max_jerk_xy="20.0" \
-s wall_line_width_0="0.5" \
-s acceleration_enabled="False" \
-s skin_alternate_rotation="False" \
-s support_line_width="0.5" \
-s jerk_skirt_brim="12" \
-s z_seam_relative="False" \
-s machine_shape="rectangular" \
-s alternate_carve_order="True" \
-s spaghetti_inset="0.2" \
-s cool_fan_full_layer="3" \
-s retraction_count_max="90" \
-s magic_fuzzy_skin_point_dist="0.8" \
-s material_bed_temp_wait="True" \
-s bottom_layers="2" \
-s material_bed_temperature="60" \
-s prime_tower_line_width="0.5" \
-s machine_gcode_flavor="RepRap (Marlin/Sprinter)" \
-s wall_0_extruder_nr="-1" \
-s retraction_hop_after_extruder_switch="True" \
-s travel="0" \
-s material_flow_temp_graph="[[3.5,200],[7.0,240]]" \
-s material_print_temp_wait="True" \
-s wall_line_count="2" \
-s machine_minimum_feedrate="0.0" \
-s machine_name="LulzBot TAZ 6 Aerostruder" \
-s wall_line_width_x="0.5" \
-s raft_surface_line_width="0.5" \
-s wall_0_wipe_dist="0.25" \
-s machine_acceleration="500" \
-s wall_0_inset="0" \
-s machine_center_is_zero="False" \
-s smooth_spiralized_contours="False" \
-s skin_line_width="0.5" \
-s raft_interface_jerk="12" \
-s wireframe_printspeed="5" \
-s machine_use_extruder_offset_to_offset_coords="True" \
-s machine_max_feedrate_z="3" \
-s retraction_hop="1" \
-s machine_max_feedrate_e="40" \
-s travel_compensate_overlapping_walls_x_enabled="True" \
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
-s machine_min_cool_heat_time_window="50.0" \
-s spaghetti_infill_extra_volume="0" \
-s xy_offset="0" \
-s carve_multiple_volumes="False" \
-s jerk_support="12" \
-s ironing_line_spacing="0.1" \
-s skirt_brim_speed="15" \
-s xy_offset_layer_0="0" \
-s material_wipe_temperature_0="140" \
-s z_seam_y="840" \
-s retraction_min_travel="1.0" \
-s speed_ironing="20.0" \
-s infill_mesh="False" \
-s retraction_enable="True" \
-s skin_outline_count="1" \
-s ironing_only_highest_layer="False" \
-s meshfix="0" \
-s retraction_extrusion_window="1" \
-s speed_support_infill="60" \
-s retract_at_layer_change="False" \
-s machine_extruder_count="1" \
-s ironing_enabled="False" \
-s ironing_pattern="zigzag" \
-s retraction_hop_enabled="False" \
-s retraction_hop_only_when_collides="False" \
-s support_interface_extruder_nr="0" \
-s default_material_print_temperature="210" \
-s wireframe_fall_down="0.5" \
-s cool_fan_enabled="True" \
-s cool_fan_speed_min="80" \
-s magic_fuzzy_skin_point_density="1.25" \
-s wireframe_enabled="False" \
-s cool_min_layer_time_fan_speed_max="15" \
-s ooze_shield_angle="60" \
-s cool_lift_head="False" \
-s support_enable="False" \
-s fill_perimeter_gaps="everywhere" \
-s support_infill_extruder_nr="0" \
-s speed_support_bottom="40.0" \
-s support_extruder_nr_layer_0="0" \
-s skirt_line_count="1" \
-s material_part_removal_temperature="45.0" \
-s filter_out_tiny_gaps="True" \
-s support_tree_branch_diameter_angle="5" \
-s raft_surface_line_spacing="0.5" \
-s infill_hollow="False" \
-s top_bottom_pattern_0="lines" \
-s support_roof_extruder_nr="0" \
-s jerk_travel_layer_0="12.0" \
-s support_bottom_extruder_nr="0" \
-s support_type="everywhere" \
-s nozzle_disallowed_areas="[]" \
-s support_angle="50" \
-s support_pattern="zigzag" \
-s support_line_distance="1.6666666666666667" \
-s cool_min_layer_time="15" \
-s wireframe_roof_inset="3" \
-s support_xy_overrides_z="z_overrides_xy" \
-s support_bottom_stair_step_height="0.3" \
-s support_bottom_stair_step_width="5.0" \
-s machine_disallowed_areas="[]" \
-s jerk_support_interface="12" \
-s acceleration_prime_tower="500" \
-s support_infill_sparse_thickness="0.38" \
-s dual_pre_wipe="True" \
-s mold_width="5" \
-s gradual_support_infill_steps="0" \
-s support_roof_enable="False" \
-s support_bottom_enable="False" \
-s retraction_speed="10" \
-s support_roof_height="1" \
-s support_interface_pattern="concentric" \
-s support_interface_skip_height="0.3" \
-s material_soften_temperature_0="140" \
-s support_roof_line_distance="0.5" \
-s support_tree_branch_diameter="2" \
-s infill_overlap="10" \
-s support_bottom_line_distance="0.5" \
-s material="0" \
-s support_roof_pattern="concentric" \
-s prime_tower_wipe_enabled="True" \
-s support_tower_diameter="3.0" \
-s support_join_distance="2.0" \
-s remove_empty_first_layers="True" \
-s support_minimal_diameter="3.0" \
-s infill_mesh_order="0" \
-s cool_fan_speed_max="100.0" \
-s support_mesh_drop_down="True" \
-s bottom_skin_expand_distance="1.0" \
-s prime_blob_enable="True" \
-s extruder_prime_pos_y="0" \
-s support_infill_rate="30" \
-s adhesion_type="skirt" \
-s skirt_gap="3" \
-s support_interface_density="100" \
-s prime_tower_position_x="275.3" \
-s cool_fan_speed_0="0" \
-s raft_airgap="0.5" \
-s support_mesh="False" \
-s prime_tower_min_volume="10" \
-s raft_surface_layers="2" \
-s support_xy_distance_overhang="0.25" \
-s raft_surface_thickness="0.38" \
-s prime_tower_flow="100" \
-s raft_interface_thickness="0.5700000000000001" \
-s z_seam_type="sharpest_corner" \
-s raft_interface_line_width="1.0" \
-s raft_base_thickness="0.51" \
-s raft_base_line_spacing="2.0" \
-s raft_interface_speed="22.5" \
-s support_offset="0.2" \
-s raft_base_speed="22.5" \
-s raft_surface_acceleration="500" \
-s platform_adhesion="0" \
-s speed_print_layer_0="15" \
-s raft_interface_acceleration="500" \
-s raft_base_jerk="12" \
-s raft_surface_fan_speed="0" \
-s adaptive_layer_height_variation_step="0.01" \
-s draft_shield_dist="10" \
-s raft_interface_fan_speed="0" \
-s support_skip_some_zags="False" \
-s support_tree_enable="False" \
-s meshfix_union_all="True" \
-s acceleration_support_infill="500" \
-s meshfix_union_all_remove_holes="False" \
-s mold_enabled="False" \
-s mold_roof_height="0.5" \
-s magic_mesh_surface_mode="normal" \
-s anti_overhang_mesh="False" \
-s relative_extrusion="False" \
-s support_tree_angle="40" \
-s support_tree_collision_resolution="0.25" \
-s support_tree_wall_count="1" \
-s roofing_line_width="0.5" \
-s acceleration_support_bottom="500" \
-s roofing_pattern="lines" \
-s infill_offset_y="0" \
-s roofing_angles="[ ]" \
-s raft_margin="15" \
-s infill_enable_travel_optimization="False" \
-s mesh_position_y="0" \
-s material_flow_dependent_temperature="False" \
-s conical_overhang_enabled="False" \
-s draft_shield_enabled="False" \
-s draft_shield_height_limitation="full" \
-s prime_tower_wall_thickness="1.328" \
-s ooze_shield_enabled="False" \
-s wireframe_printspeed_bottom="5" \
-s coasting_enable="False" \
-s coasting_min_volume="0.8" \
-s spaghetti_infill_enabled="False" \
-s spaghetti_max_infill_angle="10" \
-s speed_topbottom="30" \
-s magic_spiralize="False" \
-s spaghetti_max_height="2.0" \
-s spaghetti_flow="20" \
-s machine_nozzle_head_distance="3" \
-s support_conical_enabled="False" \
-s support_conical_angle="30" \
-s jerk_support_bottom="12" \
-s magic_fuzzy_skin_thickness="0.3" \
-s acceleration_roofing="500" \
-s flow_rate_max_extrusion_offset="0" \
-s mesh_position_z="0" \
-s wireframe_height="3" \
-s wireframe_printspeed_up="5" \
-s prime_tower_position_y="269.0171913756246" \
-s z_seam_x="140.0" \
-s raft_surface_speed="30.0" \
-s wireframe_printspeed_down="5" \
-s raft_base_fan_speed="0" \
-s wireframe_printspeed_flat="5" \
-s wireframe_flow_flat="100" \
-s quality_name="High speed" \
-s wireframe_flat_delay="0.1" \
-s wireframe_top_jump="0.6" \
-s coasting_volume="0.064" \
-s wireframe_strategy="compensate" \
-s wireframe_straight_before_down="20" \
-s print_sequence="all_at_once" \
-s support_use_towers="True" \
-s wireframe_roof_fall_down="2" \
-s speed_slowdown_layers="2" \
-s material_final_print_temperature="180" \
-s wireframe_roof_drag_along="0.8" \
-s wireframe_nozzle_clearance="1" \
-s material_print_temperature_0="195" \
-s meshfix_extensive_stitching="False" \
-s adaptive_layer_height_variation="0.1" \
-s adaptive_layer_height_threshold="200.0" \
-s center_object="False" \
-s speed_travel="175" \
-s cool_fan_speed="100.0" \
-s support_tree_branch_distance="4" \
-s expand_skins_expand_distance="1.0" \
-s max_skin_angle_for_expansion="90" \
-s top_thickness="0.76" \
-s support_interface_enable="False" \
-g -e0 \
-s wall_line_width="0.5" \
-s skirt_gap="3" \
-s acceleration_travel_layer_0="500.0" \
-s roofing_pattern="lines" \
-s acceleration_support_infill="500" \
-s acceleration_skirt_brim="500" \
-s retract_at_layer_change="False" \
-s speed_equalize_flow_max="150" \
-s travel_avoid_distance="0.625" \
-s zig_zaggify_infill="True" \
-s bottom_thickness="0.76" \
-s bottom_skin_expand_distance="1.0" \
-s acceleration_support_bottom="500" \
-s retraction_prime_speed="10" \
-s raft_interface_thickness="0.5700000000000001" \
-s xy_offset_layer_0="0" \
-s support_angle="50" \
-s raft_surface_thickness="0.38" \
-s speed_wall_x="35" \
-s top_skin_preshrink="1.0" \
-s support_bottom_height="1" \
-s raft_interface_acceleration="500" \
-s travel="0" \
-s retraction_amount="1" \
-s travel_avoid_other_parts="True" \
-s material_extrusion_cool_down_speed="0.7" \
-s support_interface_height="1" \
-s jerk_print="12" \
-s jerk_support_roof="12" \
-s infill_before_walls="False" \
-s travel_compensate_overlapping_walls_enabled="True" \
-s jerk_support_infill="12" \
-s infill_overlap="10" \
-s support_join_distance="2.0" \
-s spaghetti_flow="20" \
-s support_tree_wall_thickness="0.5" \
-s roofing_layer_count="0" \
-s machine_baudrate="250000" \
-s center_object="False" \
-s acceleration_print_layer_0="500" \
-s support_tree_collision_resolution="0.25" \
-s acceleration_print="500" \
-s jerk_prime_tower="12" \
-s support_interface_skip_height="0.3" \
-s support_roof_line_distance="0.5" \
-s support_tree_branch_diameter="2" \
-s material_probe_temperature="140" \
-s retraction_hop_enabled="False" \
-s jerk_wall_0="12" \
-s platform_adhesion="0" \
-s infill_enable_travel_optimization="False" \
-s support_bottom_enable="False" \
-s support_conical_angle="30" \
-s machine_port="AUTO" \
-s speed_support_roof="40.0" \
-s jerk_support="12" \
-s support_infill_rate="30" \
-s raft_margin="15" \
-s roofing_line_width="0.5" \
-s acceleration_support="500" \
-s speed_travel_layer_0="43.75" \
-s acceleration_prime_tower="500" \
-s z_seam_y="840" \
-s cool_fan_speed_0="0" \
-s meshfix_union_all_remove_holes="False" \
-s mold_roof_height="0.5" \
-s prime_tower_purge_volume="0" \
-s speed_print_layer_0="15" \
-s speed="0" \
-s raft_surface_layers="2" \
-s brim_width="8.0" \
-s prime_tower_min_volume="10" \
-s magic_fuzzy_skin_point_dist="0.8" \
-s retraction_count_max="90" \
-s xy_offset="0" \
-s material_diameter="2.85" \
-s wall_line_width_x="0.5" \
-s raft_surface_line_width="0.5" \
-s material_final_print_temperature="180" \
-s cross_infill_pocket_size="5.0" \
-s cool_min_layer_time="15" \
-s min_skin_width_for_expansion="4.6536578367599424e-17" \
-s infill_offset_x="0" \
-s magic_fuzzy_skin_enabled="False" \
-s support_tree_branch_diameter_angle="5" \
-s support_bottom_stair_step_width="5.0" \
-s ironing_line_spacing="0.1" \
-s infill_wipe_dist="0.125" \
-s support_roof_enable="False" \
-s top_bottom_pattern_0="lines" \
-s support_xy_distance_overhang="0.25" \
-s bottom_skin_preshrink="1.0" \
-s coasting_volume="0.064" \
-s speed_ironing="20.0" \
-s raft_base_line_width="1.0" \
-s z_seam_x="140.0" \
-s acceleration_infill="500" \
-s support_z_distance="0.2" \
-s z_seam_corner="z_seam_corner_inner" \
-s bottom_layers="2" \
-s support_xy_overrides_z="z_overrides_xy" \
-s cool_lift_head="False" \
-s material_flow="100" \
-s retraction_min_travel="1.0" \
-s machine_nozzle_tip_outer_diameter="1" \
-s infill_overlap_mm="0.05" \
-s outer_inset_first="False" \
-s raft_interface_line_spacing="1.2" \
-s machine_settings="0" \
-s cool_fan_enabled="True" \
-s support_roof_density="100" \
-s raft_base_fan_speed="0" \
-s jerk_skirt_brim="12" \
-s z_seam_relative="False" \
-s jerk_support_interface="12" \
-s material_standby_temperature="175" \
-s layer_0_z_overlap="0.5" \
-s switch_extruder_retraction_amount="16" \
-s switch_extruder_retraction_speeds="20" \
-s support_conical_enabled="False" \
-s speed_equalize_flow_enabled="False" \
-s mold_angle="40" \
-s skin_overlap_mm="0.025" \
-s material_guid="57ffda11-0178-46ea-afc2-26414151975d" \
-s brim_outside_only="True" \
-s meshfix_extensive_stitching="False" \
-s infill_line_width="0.5" \
-s material_wipe_temperature="140" \
-s max_skin_angle_for_expansion="90" \
-s infill_line_distance="5.0" \
-s prime_tower_line_width="0.5" \
-s wall_0_wipe_dist="0.25" \
-s raft_interface_speed="22.5" \
-s raft_surface_jerk="12" \
-s acceleration_travel="500" \
-s multiple_mesh_overlap="0.15" \
-s magic_mesh_surface_mode="normal" \
-s support_infill_sparse_thickness="0.38" \
-s mold_width="5" \
-s support_line_distance="1.6666666666666667" \
-s dual_pre_wipe="True" \
-s mold_enabled="False" \
-s support_tower_diameter="3.0" \
-s retraction_hop_after_extruder_switch="True" \
-s material_flow_temp_graph="[[3.5,200],[7.0,240]]" \
-s jerk_print_layer_0="12" \
-s raft_base_thickness="0.51" \
-s retraction_hop="1" \
-s spaghetti_infill_extra_volume="0" \
-s machine_min_cool_heat_time_window="50.0" \
-s raft_speed="30.0" \
-s speed_roofing="30" \
-s skin_no_small_gaps_heuristic="True" \
-s speed_print="60" \
-s infill_sparse_density="20" \
-s support_roof_height="1" \
-s support_interface_pattern="concentric" \
-s acceleration_wall_0="500" \
-s mesh_rotation_matrix="[[1,0,0], [0,1,0], [0,0,1]]" \
-s alternate_extra_perimeter="False" \
-s machine_nozzle_temp_enabled="True" \
-s retraction_hop_only_when_collides="False" \
-s support_minimal_diameter="3.0" \
-s support_tree_angle="40" \
-s material_surface_energy="100" \
-s slicing_tolerance="middle" \
-s coasting_min_volume="0.8" \
-s meshfix_maximum_resolution="0.01" \
-s support_roof_line_width="0.5" \
-s expand_skins_expand_distance="1.0" \
-s raft_surface_fan_speed="0" \
-s prime_tower_flow="100" \
-s sub_div_rad_add="0.5" \
-s coasting_enable="False" \
-s infill_angles="[ ]" \
-s cross_infill_apply_pockets_alternatingly="True" \
-s material_soften_temperature="140" \
-s material_flow_dependent_temperature="False" \
-s machine_extruder_start_pos_abs="False" \
-s support_top_distance="0.2" \
-s fill_perimeter_gaps="everywhere" \
-s extruder_prime_pos_y="0" \
-s machine_extruder_end_pos_x="0" \
-s z_seam_type="sharpest_corner" \
-s machine_extruder_end_pos_abs="False" \
-s acceleration_ironing="500" \
-s extruder_prime_pos_z="0" \
-s travel_compensate_overlapping_walls_x_enabled="True" \
-s magic_fuzzy_skin_thickness="0.3" \
-s machine_extruder_end_pos_y="0" \
-s line_width="0.5" \
-s machine_nozzle_size="0.5" \
-s skirt_brim_line_width="0.5" \
-s support_interface_line_width="0.5" \
-s brim_line_count="10" \
-s material_adhesion_tendency="10" \
-s raft_surface_acceleration="500" \
-s support_interface_density="100" \
-s prime_tower_wipe_enabled="True" \
-s support_use_towers="True" \
-s meshfix_union_all="True" \
-s cool_fan_speed_max="100.0" \
-s infill_pattern="grid" \
-s resolution="0" \
-s coasting_speed="90" \
-s top_bottom_pattern="lines" \
-s jerk_layer_0="12" \
-s support_conical_min_width="5.0" \
-s machine_nozzle_id="unknown" \
-s switch_extruder_retraction_speed="20" \
-s extruder_nr="0" \
-s jerk_travel="12" \
-s speed_layer_0="15" \
-s top_thickness="0.76" \
-s machine_nozzle_offset_y="0.0" \
-s support_pattern="zigzag" \
-s machine_extruder_start_pos_x="0" \
-s infill_offset_y="0" \
-s wall_thickness="1.0" \
-s raft_surface_speed="30.0" \
-s raft_acceleration="500" \
-s optimize_wall_printing_order="False" \
-s support_bottom_line_distance="0.5" \
-s material="0" \
-s default_material_print_temperature="205" \
-s cool_fan_full_at_height="1" \
-s skin_outline_count="1" \
-s cool_fan_speed="100.0" \
-s support_interface_enable="False" \
-s machine_extruder_start_pos_y="0" \
-s mesh_position_z="0" \
-s spaghetti_inset="0.2" \
-s support_connect_zigzags="True" \
-s layer_start_y="0.0" \
-s material_initial_print_temperature="185" \
-s raft_base_acceleration="500" \
-s command_line_settings="0" \
-s switch_extruder_prime_speed="20" \
-s raft_fan_speed="0" \
-s raft_jerk="12" \
-s support_tree_wall_count="1" \
-s conical_overhang_enabled="False" \
-s ironing_pattern="zigzag" \
-s machine_nozzle_head_distance="3" \
-s meshfix="0" \
-s ironing_only_highest_layer="False" \
-s prime_blob_enable="True" \
-s acceleration_support_roof="500" \
-s retraction_enable="True" \
-s jerk_ironing="12" \
-s spaghetti_infill_enabled="False" \
-s raft_base_jerk="12" \
-s infill_sparse_thickness="0.38" \
-s ironing_flow="10.0" \
-s fill_outline_gaps="False" \
-s jerk_support_bottom="12" \
-s skin_preshrink="1.0" \
-s cool_min_layer_time_fan_speed_max="15" \
-s initial_layer_line_width_factor="100.0" \
-s jerk_travel_layer_0="12.0" \
-s acceleration_support_interface="500" \
-s extruder_prime_pos_x="0" \
-s machine_nozzle_heat_up_speed="2.0" \
-s retraction_retract_speed="10" \
-s speed_support_bottom="40.0" \
-s blackmagic="0" \
-s acceleration_roofing="500" \
-s ironing_inset="0.25" \
-s gradual_support_infill_step_height="1" \
-s cool_fan_speed_min="80" \
-s ironing_enabled="False" \
-s retraction_extrusion_window="1" \
-s max_feedrate_z_override="0" \
-s acceleration_topbottom="500" \
-s support_bottom_stair_step_height="0.3" \
-s support="0" \
-s acceleration_layer_0="500" \
-s speed_support_interface="40.0" \
-s jerk_topbottom="12" \
-s magic_fuzzy_skin_point_density="1.25" \
-s material_print_temperature="195" \
-s support_zag_skip_count="12" \
-s filter_out_tiny_gaps="True" \
-s support_skip_zag_per_mm="20" \
-s roofing_angles="[ ]" \
-s top_layers="2" \
-s wall_line_width_0="0.5" \
-s skin_alternate_rotation="False" \
-s skirt_brim_speed="15" \
-s skin_angles="[ ]" \
-s jerk_infill="12" \
-s machine_nozzle_offset_x="0.0" \
-s speed_topbottom="30" \
-s machine_nozzle_cool_down_speed="2.0" \
-s raft_interface_line_width="1.0" \
-s shell="0" \
-s machine_heat_zone_length="16" \
-s speed_prime_tower="60" \
-s spaghetti_max_infill_angle="10" \
-s gradual_support_infill_steps="0" \
-s jerk_wall_x="12" \
-s raft_base_speed="22.5" \
-s skin_line_width="0.5" \
-s raft_interface_jerk="12" \
-s support_bottom_pattern="concentric" \
-s cool_min_speed="10" \
-s support_bottom_line_width="0.5" \
-s cool_fan_full_layer="3" \
-s speed_travel="175" \
-s acceleration_wall="500" \
-s extruder_prime_pos_abs="False" \
-s material_print_temperature_layer_0="200" \
-s infill="0" \
-s support_bottom_density="100" \
-s wall_0_inset="0" \
-s support_tree_branch_distance="4" \
-s wall_line_count="2" \
-s support_tower_roof_angle="65" \
-s gradual_infill_steps="0" \
-s speed_infill="40" \
-s retraction_speed="10" \
-s machine_filament_park_distance="16" \
-s skin_overlap="5" \
-s acceleration_wall_x="500" \
-s dual="0" \
-s spaghetti_max_height="2.0" \
-s speed_wall_0="30" \
-s speed_wall="30.0" \
-s support_xy_distance="1.5" \
-s travel_compensate_overlapping_walls_0_enabled="True" \
-s retraction_extra_prime_amount="0" \
-s mesh_position_y="0" \
-s raft_airgap="0.5" \
-s min_infill_area="0" \
-s layer_start_x="0.0" \
-s raft_base_line_spacing="2.0" \
-s support_offset="0.2" \
-s spaghetti_infill_stepped="True" \
-s jerk_roofing="12" \
-s support_bottom_distance="0.2" \
-s mesh_position_x="0" \
-s meshfix_keep_open_polygons="False" \
-s gradual_infill_step_height="1.5" \
-s top_bottom_thickness="0.8" \
-s experimental="0" \
-s top_skin_expand_distance="1.0" \
-s speed_support="60" \
-s support_roof_pattern="concentric" \
-s support_skip_some_zags="False" \
-s raft_interface_fan_speed="0" \
-s cooling="0" \
-s infill_hollow="False" \
-s skirt_line_count="1" \
-s raft_surface_line_spacing="0.5" \
-s speed_support_infill="60" \
-s machine_has_lcd="True" \
-s skirt_brim_minimal_length="250" \
-s jerk_wall="12" \
-s raft_smoothing="5" \
-s conical_overhang_angle="50" \
-s support_line_width="0.5" \
-s meshfix_maximum_deviation="1" \
-s machine_heated_build_volume="0" \
    -e0 -j resources/lulzbot_redgum_goldenrod_extruder.def.json -s skin_edge_support_layers="1" -s bridge_sparse_infill_max_density="1" -s machine_extruders_share_heater="false"  -l resources/ml_lh_mesh.stl \
    -e1 -j resources/lulzbot_redgum_goldenrod_extruder.def.json -s skin_edge_support_layers="1" -s bridge_sparse_infill_max_density="1" -s machine_extruders_share_heater="false"  -l resources/ml_rh_mesh.stl';