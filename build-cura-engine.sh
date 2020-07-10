#!/bin/sh
#
# build-cura-engine.sh
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

#BUILD_OPT='-DCMAKE_BUILD_TYPE=MinSizeRel'
BUILD_DIR=src-cura/CuraEngine/build
INSTALL_DIR=src-app/lib/slicing-engines/CuraEngine

build_cura() {
    rm -rf $BUILD_DIR &&
    mkdir -p $BUILD_DIR &&
    (cd $BUILD_DIR &&
     emcmake cmake $BUILD_OPT .. &&
     emmake make) ||
     exit 1
}

install_cura() {
    mv $BUILD_DIR/CuraEngine.* $INSTALL_DIR ||
    exit 1
}

build_cura && install_cura || exit 1
