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

SRC_DIR=src-app
OUT_DIR=dist/web

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

makeWebReleaseDir() {
    echo Copying web-release files
    for f in `getFiles`
    do
        mkdir -p `dirname $OUT_DIR/$f`
        cp $SRC_DIR/$f $OUT_DIR/$f
    done
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
    FILES=`grep -R -E -l "\.\.\.[a-zA-Z.]+" $OUT_DIR | grep -v "\.min\."`
    for f in $FILES
    do
        echo Rewriting slice operator on $f
        perl -i -00pe 's/{\s*\.\.\.([a-zA-Z.]+)\,([^{}]*)}/Object.assign({\2},\1)/igs' $f
        perl -i -00pe 's/{([^{}]*)\,\s*\.\.\.([a-zA-Z.]+)\s*}/Object.assign({\1},\2)/igs' $f
    done
}

incrementCacheVersion() {
    sed -i -r 's/(.*)(cacheVersion:[ ]*)([0-9]+)(.*)/echo "\1\2$((\3+1))\4"/ge' $SRC_DIR/service-worker.js
    echo Incremented cache version in service worker
}

rm -rf $OUT_DIR
mkdir -p $OUT_DIR

makeWebReleaseDir
customSliceFilter
incrementCacheVersion