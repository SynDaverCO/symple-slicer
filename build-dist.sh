#!/bin/sh
#
# Web Slicer
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

USE_BABEL=0

getFiles() {
    awk -F "'" '
    /^const filesToCache/                   {PRINT=1}
    /];/                                    {PRINT=0}
                                            {sub(/\?.*$/, "", $2); if(PRINT) print $2}
    ' service-worker.js | sed '/^\.$/ c index.html'
    echo service-worker.js
    echo change_log.md
    echo images/screenshot.png
    echo LICENSE.txt
}

makeBuildDir() {
    echo Copying build files
    for f in `getFiles`
    do
        mkdir -p `dirname build/$f`
        cp $f build/$f
    done
}

makeDistDir() {
    echo Making distribution directory
    if [ $USE_BABEL != 0 ];
    then
        ~/node_modules/.bin/babel build --verbose --copy-files --out-dir dist
    else
        cp -r build/* dist
    fi
}

customSliceFilter() {
    #
    # The following converts this:
    #
    #    {...attr, field1: "value", field2: "value"}
    #    {field1: "value", field2: "value", ...attr}
    #
    # To:
    #    Object.assign({field1: "value", field2: "value"}, attr)
    #
    # This transformation is required for the Edge browser and currently isn't handled by Babel
    #
    FILES=`grep -R -E -l "\.\.\.[a-zA-Z.]+" dist | grep -v "\.min\."`
    for f in $FILES
    do
        echo Rewriting slice operator on $f
        perl -i -00pe 's/{\s*...([a-zA-Z.]+)\,([^{}]*)}/Object.assign({\2},\1)/igs' $f
        perl -i -00pe 's/{([^{}]*)\,\s*...([a-zA-Z.]+)\s*}/Object.assign({\1},\2)/igs' $f
    done
}

rm -rf build dist
mkdir build dist

makeBuildDir
makeDistDir
customSliceFilter