![alt text][logo]

SynDaver Symple Slicer
======================

Symple Slicer is an easy-to-use, web-based slicer for 3D printers based on
Ultimaker's Cura Engine.

Symple Slicer is maintained by SynDaver Labs, Inc. for use with SynDaver
printers. Symple Slicer is licensed under the GNU Affero General Public
License Version 3.

Symple Slicer is an easy-to-use web application built on [THREE.js] and
other open-source projects. For slicing, it uses a Cura Engine which has
been compiled into WebAssembly using the Emscripten toolchain. The entire
project can be served off a minmalistic web server and has no server-side
requirements. Everything, including the Cura Engine, will download and run
in the user's web browser.

Symple Slicer was designed to avoid the complexities of building Ultimaker's
Cura desktop application across many platforms while still providing access
to Cura's slicing capabilities.

Symple Slicer is not meant as a replacement for Cura for all use cases. Only
a subset of settings are adjustable and presently only single extruder slicing
is available.

Re-Building from Source
-----------------------

There is no need to build or package the web application itself. It will run
as-is from the JavaScript, HTML, CSS and JSON source files.

However, the source contains pre-built WebAssembly binaries for the Cura Engine.
These may be generated from the Cura Engine C++ source (in src-cura/) at any
time using the "build-cura-engine.sh" shell script. Rebuilding the Cura Engine
requires the [EMSCRIPTEN] toolchain. Recompilation can be done in minutes.
Please refer to the documentation in "config/README.md" for information on how
to upgrade the slicing engine.

[THREE.js]: https://threejs.org
[EMSCRIPTEN]: https://emscripten.org

[logo]: https://github.com/SynDaverCO/symple-slicer/raw/master/images/screenshot.png "Symple Slicer"