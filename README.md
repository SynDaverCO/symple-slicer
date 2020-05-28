![alt text][logo]

SynDaver Symple Slicer
======================

Symple Slicer is a simple-to-use, web-based slicer for 3D printers,
built on the robust and dependable [CuraEngine].

Symple Slicer was developed at the Loveland, Colorado division of
[SynDaver Labs, Inc.] for use with SynDaver 3D printers. Symple Slicer
is licensed under the [GNU Affero General Public License Version 3].

Easy to use, easy to print
--------------------------

For end-users, Symple Slicer brings the following advantages:

- Easy-to-use interface, with a step-by-step wizard 
- Runs on many platforms, requiring only a compatible web browswer
   - Installable as an app on Chromebooks
   - Once run once, it can be used off-line
   - Automatic updates when connected to the web
- Uses the [CuraEngine] for slicing

Easy for developers as well
---------------------------

For developers and contributors, Symple Slicer brings the following
advantages:

- Open-source and build using [THREE.js] and WebGL
- Written in modern JavaScript (ES6)
- Fast development turn-around times
   - Web UI can be executed-in-place with no compilation
   - Updates can be pushed to users in minutes
- No server-side code for straight-forward deployment
- Clean, human-readable profile configuration files ([TOML])
- [CuraEngine] is far easier to compile than for Cura:
   - Uses a simple command-line build of [CuraEngine]
   - No dependencies on libarcus or protobuff
   - CuraEngine can be compiled into [WebAssembly] in minutes
- Compatibility with Cura's JSON files (fdmprinter and fdmextruder):
   - Simplifies upgrades to the CuraEngine
   - Allows automatic computation of related values
   - Implements Python to JavaScript translation for formulas

Scope and limitations
---------------------

Because Symple Slicer is a web application, it cannot do tethered
printing and requires a printer that can print GCODE from SD cards
or USB flash drives.

Symple Slicer is not meant as a replacement for Cura for advanced
users. Slicing is currently limited to a single extruder and the
GUI allows access to a subset of all Cura settings (although
exporting, editing and importing a TOML configuration file allows
advanced users to access to all Cura command-line slicer options).

History
-------

Symple Slicer is a spin off from earlier work done by the author
in 2016 on a native JavaScript slicing engine. There are still
references to a JSSlicer engine in the code. Such code isn't
necessarily useful or functional in Symple Slicer, but is being
kept around for posterity and/or future work.

Re-Building CuraEngine from source
----------------------------------

This repo contains pre-built [WebAssembly] binaries for [CuraEngine].
If needed, these may be re-generated from the CuraEngine C++
source (in `src-cura/`) using the `build-cura-engine.sh` shell
script. Rebuilding the CuraEngine requires the [EMSCRIPTEN]
toolchain. Refer to the documentation in [config/README.md] for
information on upgrading the slicing engine and associated
configuration files.

[THREE.js]: https://threejs.org
[EMSCRIPTEN]: https://emscripten.org
[CuraEngine]: https://github.com/Ultimaker/CuraEngine
[GNU Affero General Public License Version 3]: https://github.com/SynDaverCO/symple-slicer/raw/master/LICENSE.txt
[config/README.md]: https://github.com/SynDaverCO/symple-slicer/blob/master/config/README.md
[SynDaver Labs, Inc.]: https://syndaver.com
[WebAssembly]: https://webassembly.org
[TOML]: https://en.wikipedia.org/wiki/TOML

[logo]: https://github.com/SynDaverCO/symple-slicer/raw/master/images/screenshot.png "SynDaver Symple Slicer"