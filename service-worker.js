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

// Based on https://deanhume.com/displaying-a-new-version-available-progressive-web-app/

const info = {
    version: '0.9.99',
    release: 1
};

const cacheName = 'v' + info.version + "r" + info.release;

const filesToCache = [
    '.',
    './manifest.webmanifest',
    'lib/three/three.min.js',
    'lib/three/OrbitControls.js',
    'lib/three/TransformControls.js',
    'lib/jquery/jquery-3.5.0.min.js',
    'lib/jquery/jquery.easing.1.3.js',
    'lib/jquery/contextmenu/jquery.contextMenu.min.js',
    'lib/jquery/contextmenu/font/context-menu-icons.woff2?4wdhf',
    'lib/FileSaver/FileSaver.js',
    'lib/jakwings-toml-j0.4/toml-browser.js',
    'lib/circlepacker/circlepacker.min.js',
    'lib/three/ConvexHull.js',
    'lib/three/ConvexGeometry.js',
    'lib/util/geometry/GeometrySerialize.js',
    'lib/util/geometry/GeometryAlgorithms.js',
    'lib/util/gcode/Toolpath.js',
    'lib/util/gcode/GCodeParser.js',
    'lib/util/io/FetchFile.js',
    'lib/util/io/LoadResource.js',
    'lib/util/io/GeometryLoader.js',
    'lib/util/misc/ResettableTimer.js',
    'lib/util/misc/ParseQuery.js',
    'lib/util/ui/settings/settings.js',
    'lib/util/ui/toolbar/toolbar.js',
    'lib/util/ui/progress/progress.js',
    'lib/util/ui/navcube/navcube.js',
    'lib/util/ui/updater/updater.js',
    'lib/slicing-engines/SlicerInterface.js',
    'lib/three/3MFLoader.js',
    'lib/three/OBJLoader.js',
    'lib/jszip/jszip.min.js',
    'lib/jquery/contextmenu/jquery.contextMenu.css',
    'lib/util/ui/ui.css',
    'lib/util/ui/settings/settings.css',
    'lib/util/ui/toolbar/toolbar.css',
    'lib/util/ui/progress/progress.css',
    'lib/util/ui/navcube/navcube.css',
    'lib/util/ui/updater/updater.css',
    'lib/three/Pass.js',
    'lib/three/RenderPass.js',
    'lib/three/ShaderPass.js',
    'lib/three/CopyShader.js',
    'lib/three/EffectComposer.js',
    'lib/three/OutlinePass.js',
    'css/layout.css',
    'css/theme.css',
    'js/PrinterRepresentation.js',
    'js/PrintableObject.js',
    'js/SelectionGroup.js',
    'js/RenderLoop.js',
    'js/Stage.js',
    'js/SettingsPanel.js',
    'js/OtherUI.js',
    'images/celebration-party-hats.jpg',
    'images/spinner.gif',
    'images/logo.png',
    'lib/slicing-engines/CuraEngine/SlicerConfiguration.js',
    'lib/slicing-engines/CuraEngine/SlicerWorker.js',
    'lib/util/io/GeometryLoaderWorker.js',
    'images/favicon.ico',
    'images/icon_128px.png',
    'images/icon_180px.png',
    'images/icon_192px.png',
    'images/icon_512px.png',
    'images/scale.png',
    'images/scale-max.png',
    'images/rotate.png',
    'images/mirror.png',
    'images/lay-flat.png',
    'config/cura_defaults/fdmprinter.def.json',
    'config/cura_defaults/fdmextruder.def.json',
    'config/cura_defaults/fdmprinter_errata.def.json',
    'config/cura_defaults/fdmprinter_extras.def.json',
    'lib/slicing-engines/CuraEngine/CuraEngine.js',
    'lib/slicing-engines/CuraEngine/CuraEngine.data',
    'lib/slicing-engines/CuraEngine/CuraEngine.wasm',
    'lib/three/BufferGeometryUtils.js',
    'lib/util/io/StlReader.js',
    'config/syndaver/profile_list.toml',
    'config/syndaver/machine_profiles/cura_default.toml',
    'config/syndaver/machine_profiles/syndaver_axi.toml',
    'config/syndaver/print_profiles/cura_default.toml',
    'config/syndaver/print_profiles/abs_standard_stable.toml',
    'config/syndaver/print_profiles/pla_standard_stable.toml',
    'config/syndaver/print_profiles/tpu85_standard_stable.toml',
    'config/syndaver/print_profiles/tpu95_standard_stable.toml'
];

self.addEventListener('install', event => {
    console.log('Attempting to install service worker and cache static assets');
    event.waitUntil(
        caches.open(cacheName)
              .then(cache => cache.addAll(filesToCache))
    );
});

self.addEventListener('message', event => {
    switch(event.data.cmd) {
        case 'skipWaiting':
            self.skipWaiting();
            break;
    }
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(cacheName).then(cache =>
            cache.match(event.request).then(response => {
                if (response) {
                    //console.log("Using", event.request.url, " version ",  cacheName);
                    return response;
                }
                if (event.request.url.includes("version.json")) {
                    return new Response(
                        JSON.stringify(info),
                        {headers: {"Content-Type": "text/css"}}
                    );
                }
                console.log("Warning: Resource not in cache: ", event.request.url, "requested by",  event.request.referrer);
                return fetch(event.request);
            })
        )
    );
});