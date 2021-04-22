SynDaver Symple Slicer v1.0.18
==============================

* '''Firmware:''' New firmware for Axi 2 (R3)
* '''Slicing UI:''' Added color theme choices under "Advanced Features"!
* '''Slicing UI:''' In "Select Profiles", choosing a printer and material is now the default.
* '''Slicing UI:''' Improved workflow for saving and loading custom slicer profiles.
## Added "Save Settings to File" option under "Slice Objects"
## Added "Import slicer settings" option to "Select Profiles" (formerly under "Advanced Features")

SynDaver Symple Slicer v1.0.171
===============================

* '''Firmware:''' Temporarily rollback Axi 2 firmware to R1

SynDaver Symple Slicer v1.0.17
==============================

* '''Firmware:''' New firmware for Axi (R6) and Axi 2 (R2)
## New bed mesh editor
## More efficient mesh probing
## Improved reliability of probing
## Added mesh compensation test pattern
## Added "Z Probe Wizard" to "Probe Z Offset"
## Added "Raise Z to Top" to "Move Axis" 
* '''Start G-code:''' Fixes to start G-code for Axi 1 and Axi 2
* '''Profiles:''' Update to ABS profile

SynDaver Symple Slicer v1.0.16
==============================

* Prompt before scaling oversized objects to fit.
* Fixed incorrect naming of files with "stl" in their names.
* Fixed incorrect print time on prints longer than a day
* Compute print progress based on time rather than layers
* Added support for Axi 2
* Added USB firmware flashing and tethered printing when Web Serial is available

SynDaver Symple Slicer v1.0.15
==============================

* '''Profiles:''' Updated PLA profile

SynDaver Symple Slicer v1.0.14
==============================

* Added ability to load pre-sliced G-code.
* '''Slicing UI:''' Added "Z Seam Alignment", "Z Seam X" and "Z Seam Y"
* '''Profiles:''' Updated PETG and Nylon; added ASA profile

SynDaver Symple Slicer v1.0.13
==============================

* Multiple objects can now be selected for centering.
* '''Profiles:''' Updates to all profiles

SynDaver Symple Slicer v1.0.12
==============================

* Tweaked part placement algorithm to not cluster objects on center of bed.

SynDaver Symple Slicer v1.0.11
==============================

* Unhighlight unprintable object if it is centered to lie within the print area.
* Fixed incorrect resizing of scaled objects when using the Mirror tool.
* Replaced "Help" button with "User Guide"
* Updated "User Guide"
* Adjusted formula for initial print temperature.
* '''Slicing UI:''' Added a "Material Notes" page for certain materials.
* '''Slicing UI:''' Added "Build Plate Temperature Initial Layer".
* '''Slicing UI:''' Added "Printing Temperature Initial Layer".
* '''Slicing UI:''' Renamed "Minimum Support X/Y Distance" to "Overhang Support X/Y Distance"
* '''Slicing UI:''' Made "Save as:" text box wider
* '''Profiles:''' Corrected print bed dimensions
* '''Profiles:''' Added FibreTuff, carbon fiber, copperfill and nylon profile

SynDaver Symple Slicer v1.0.10
==============================

* '''Profiles:''' Updated start G-code to improve first layer.

SynDaver Symple Slicer v1.0.9
=============================

* Added radio buttons to "Select Presets" panel to make things easier to understand.
* Added auto-scrolling to console window
* '''Slicing UI:''' Added "Initial Layer Speed"
* '''Slicing UI:''' Added "Enable Support Interface"
* '''Slicing UI:''' Made it so changing the "Infill Density" will not change the "Infill Pattern" 
* '''Cura Engine:''' Updated to 4.6.2
* '''Guide:''' Added table of contents; updated text and figures
* '''Profiles:''' Updated ABS, PC-ABS, PETG, PLA and TPU profiles

SynDaver Symple Slicer v1.0.8
=============================
* Fixed bug where certain settings were not being imported from profiles
* '''Profiles:''' Changed all profiles to turn off bed after print is finished
* '''Profiles:''' Updated TPU profiles

SynDaver Symple Slicer v1.0.7
=============================

* Now shows change log on first run
* Consolidated help info in help panel
* Added "Keep heating" checkbox to temperature category
* Fixed settings propagation on part removal temperature
* Correct slight position variations when centering objects
* Use radio buttons in "Place Objects" panel
* Added "Infill Before Walls" to "Shell"
* Added "Support Z Distance", "Support X/Y Distance", "Minimum Support X/Y Distance" and "Support Interface Resolution" to "Support"
* Added "Initial Layer Height", and "Support Speed" to "Print Speed"
* '''Profiles:''' Use Cura Engine computed values for "Initial Layer Speed", "Initial Layer Travel Speed", "Travel Speed", "Wall Speed", "Top/Bottom Speed" and "Inner Wall Speed"
* '''Profiles:''' Added "PC-ABS (beta)" profile

SynDaver Symple Slicer v1.0.6
=============================

* Allow selection of multiple objects in the file selection dialog box
* Object and image files are now filtered based on type
* Show ".gcode" extension even when original file extension was capitalized
* Add M73 to G-code to update progress bar while printing
* Added user's guide
* '''Profiles:''' Updated profiles

SynDaver Symple Slicer v1.0.5
=============================

* '''Profiles:''' Updated AXI machine settings
* '''Profiles:''' Updated PLA profile with optimized support settings

SynDaver Symple Slicer v1.0.4
=============================

* Changed wording of items for consistency
* Moved "Machine Settings" lower in the menu

SynDaver Symple Slicer v1.0.3
=============================

* Changed wording to "Last session settings"
* Fix for "Last session settings" loading Cura defaults

SynDaver Symple Slicer v1.0.2
=============================

* Added ability to scale objects using absolute units
* Added ability to add multiple objects at once
* Added "top" and "bottom" to right-click view menu

SynDaver Symple Slicer v1.0.1
=============================

* Allow slicing features to be toggled while preserving profile settings

SynDaver Symple Slicer v1.0.0
=============================

* Fix for enter as tab no longer working
* Fix for certain non-linked settings being reset to default
* '''Profiles:''' Updated profiles

SynDaver Symple Slicer v0.9.9997
================================

* Fix for toolpath being occluded by invisible travel moves

SynDaver Symple Slicer v0.9.9996
================================

* Fix for objects being difficult to select after they are sliced
* '''Profiles:''' Updated profiles

SynDaver Symple Slicer v0.9.9995
================================

* Fixed meta tags

SynDaver Symple Slicer v0.9.9994
================================

* Fix for layer slider changing when hiding or showing layer

SynDaver Symple Slicer v0.9.9993
================================

* Fixed layer view on Edge browser

SynDaver Symple Slicer v0.9.9992
================================

* Fix service worker for Edge browser

SynDaver Symple Slicer v0.9.9991
================================

* Change location on change log to prevent confusing Edge

SynDaver Symple Slicer v0.9.999
===============================

* Restore Edge browser compatibility
* Added polyfill for collapsible categories in Edge
* Fixed object transformation not refreshing

SynDaver Symple Slicer v0.9.998
===============================

* Allow centering of object when there are multiple objects on the bed

SynDaver Symple Slicer v0.9.997
===============================

* Fix for slice preview disappearing when leaving preview and returning to it
* Fix for object jumping around after scaling, moving and centering
* Clicking anywhere in window will now deselect objects
* Before slicing, warn if any transformed object falls outside the print volume
* After slicing, warn if the brim, support, etc falls outside the print volume

SynDaver Symple Slicer v0.9.996
===============================

* Enter key now jumps to next field for quick entry of values
* Go to place models page when drag and dropping models
* Fix for blank page when drag and dropping images
* Do not return to place objects page when unselecting items
* Moved "Transform objects" into right-click menu
* Transformation dialog box now returns to previous menu
* Fixed "Clear Build Plate" with many objects
* Added "Close" button to "Transform objects"
* Do not unselect objects when clicking transform tool

SynDaver Symple Slicer v0.9.995
===============================

* Fixed axis color mismatch

SynDaver Symple Slicer v0.9.994
===============================

* Added mirror buttons
* Added axis color coding to UI
* Pre-populate the transform objects panel
* '''Profiles:''' Updated print profiles

SynDaver Symple Slicer v0.9.993
===============================

* The materials panel now takes you to the place objects panel
* Layer view now shows the top layer numerically
* Layflat tool much improved

SynDaver Symple Slicer v0.9.992
===============================

* Allow user to click next if no profiles are selected
* Change wording of export option checkboxes for clarity
* Added tooltip for export option checkboxes for more clarity
* Moved the "Clear All" to the right-click menu
* Moved the "Rearrange All" to the right-click menu
* Added "Center Selected Objects" to the right-click menu
* Fixed issue where UI settings were not being overwritten when loading defaults
* '''Profiles:''' Set default wall thickness to twice the line width
* '''Profiles:''' Changed speed_wall_x to speed_wall

SynDaver Symple Slicer v0.9.991
===============================

* Combined the "Place Objects" and "Place Lithophane" screens into one
* Changed workflow so that the user begins by selecting a preset
* Added choice to keep previous settings
* Added progress bar when loading presets
* Fixed error handling when loading presets

SynDaver Symple Slicer v0.9.99
==============================

* Inform user when updates are downloading
* Fixed loading of presets
* Report errors when presets cannot be loaded
* Nicer formatting of release notes

SynDaver Symple Slicer v0.9.98
==============================

* Made it installable as app

SynDaver Symple Slicer v0.9.95
==============================

* Fix lay flat tool
* Profile menus now dynamically populated
* Added SynDaver favicon

SynDaver Symple Slicer v0.9.94
==============================

* Fixed typos in UI
* '''Profiles:''' Updated PLA profile to release 5/7/2020

SynDaver Symple Slicer v0.9.93
==============================

* Added the ability to make lithophanes out of images.
* Reduce size of extremely large objects to fit
* Fixed objects not falling to the bed.
* '''Profiles:''' Updated PLA profile to release 5/5/2020

SynDaver Symple Slicer v0.9.92
==============================

* Fixes to auto-update functionality.

SynDaver Symple Slicer v0.9.91
==============================

* SynDaver logo size now relative to text size.
* Adjusting Z position objects numerically is now relative to bottom of objects.

SynDaver Symple Slicer v0.9.9
==============================

* Added change log to update dialog box.
* Corrected and/or clarified wording in dialog boxes.
* Allow dragging and dropping of multiple models at once.
* Fixed bug where objects would not always fall to floor after rotating.