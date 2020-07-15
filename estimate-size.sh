#!/bin/sh
#
# estimate-size.sh
# Copyright (C) 2020 SynDaver Labs, Inc.
#
# This script builds the Cura engine from the source in BUILD_DIR
# using Emscripten and copies the built files to INSTALL_DIR.
#
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#

# Estimates the size of the entire slicer package if it were minimized and
# stored in a zip file.

SRC_DIR=src-app

getFiles() {
    awk -F "'" '
    /^const filesToCache/                   {PRINT=1}
    /];/                                    {PRINT=0}
                                            {sub(/\?.*$/, "", $2); if(PRINT) print $2}
    ' $SRC_DIR/service-worker.js | sed '/^\.$/ c index.html'
    echo service-worker.js
    echo change_log.md
    echo images/screenshot.png
}

minify() {
    rm -rf build
    mkdir build
    for file in $FILES
    do
        mkdir -p build/`dirname $file`
        if [[ $file == *.js ]]; then
            uglifyjs $SRC_DIR/$file > build/$file
        else
            false
        fi
        if [ $? -ne 0 ]; then
            cp $SRC_DIR/$file build/$file
        fi
    done
}

FILES=`getFiles`

minify

zip -r -9 packed.zip build
du -sh packed.zip

echo

echo Top ten largest files:
find build -type f | xargs du -sh | sort -h | tail -10
