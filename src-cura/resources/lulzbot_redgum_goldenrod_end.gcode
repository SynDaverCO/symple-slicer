M400                                      ; wait for moves to finish
M140 S{material_part_removal_temperature} ; start bed cooling
M104 S0                                   ; disable hotend
M107                                      ; disable fans
G91                                       ; relative positioning
G1 E-1 F300                               ; filament retraction to release pressure
G1 Z20 E-5 X-20 Y-20 F3000                ; lift up and retract even more filament
G1 E6                                     ; re-prime extruder
M117 Cooling please wait                  ; progress indicator message on LCD
G90                                       ; absolute positioning
G1 Y0 F3000                               ; move to cooling position
M190 R{material_part_removal_temperature} ; wait for bed to cool down to removal temp
G1 Y280 F3000                             ; present finished print
M140 S{material_keep_part_removal_temperature_t}; keep temperature or cool downs
M77                                       ; stop GLCD timer
M84                                       ; disable steppers
G90                                       ; absolute positioning
M117 Print Complete.                      ; print complete message
