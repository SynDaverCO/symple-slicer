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

importScripts('lib/util/misc/Wikify.js');

// Based on https://deanhume.com/displaying-a-new-version-available-progressive-web-app/

const info = {
    cacheVersion: 72
};

const cacheName = 'v' + info.cacheVersion;

const filesToCache = [
    '.',
    './manifest.webmanifest',
    './package.json',
    'config/cura_defaults/fdmextruder.def.json',
    'config/cura_defaults/fdmprinter.def.json',
    'config/cura_defaults/fdmprinter_errata.def.json',
    'config/cura_defaults/fdmprinter_extras.def.json',
    'config/syndaver/machine_profiles/cura_default.toml',
    'config/syndaver/machine_profiles/syndaver_axi.toml',
    'config/syndaver/print_profiles/abs_standard_stable.toml',
    'config/syndaver/print_profiles/asa_standard_stable.toml',
    'config/syndaver/print_profiles/cura_default.toml',
    'config/syndaver/print_profiles/carbon-fiber-nylon_standard_stable.toml',
    'config/syndaver/print_profiles/copperfill_standard_stable.toml',
    'config/syndaver/print_profiles/fibretuff_standard_stable.toml',
    'config/syndaver/print_profiles/nylon_standard_stable.toml',
    'config/syndaver/print_profiles/pc-abs_standard_stable.toml',
    'config/syndaver/print_profiles/petg_standard_stable.toml',
    'config/syndaver/print_profiles/pla_standard_stable.toml',
    'config/syndaver/print_profiles/tpu85_standard_stable.toml',
    'config/syndaver/print_profiles/tpu95_standard_stable.toml',
    'config/syndaver/profile_list.toml',
    'css/layout.css',
    'css/markdown.css',
    'css/theme.css',
    'images/favicon.ico',
    'images/icon_128px.png',
    'images/icon_180px.png',
    'images/icon_192px.png',
    'images/icon_512px.png',
    'images/lay-flat.png',
    'images/logo.png',
    'images/mirror.png',
    'images/move.png',
    'images/rotate.png',
    'images/scale-max.png',
    'images/scale.png',
    'images/spinner.gif',
    'js/OtherUI.js',
    'js/PrintableObject.js',
    'js/PrinterRepresentation.js',
    'js/ProfileManager.js',
    'js/RenderLoop.js',
    'js/SelectionGroup.js',
    'js/SettingsPanel.js',
    'js/Stage.js',
    'lib/FastestSmallestTextEncoderDecoder/EncoderDecoderTogether.min.js',
    'lib/FileSaver/FileSaver.js',
    'lib/circlepacker/circlepacker.min.js',
    'lib/details-polyfill/details-polyfill.js',
    'lib/jakwings-toml-j0.4/toml-browser.js',
    'lib/jquery/contextmenu/font/context-menu-icons.woff2?4wdhf',
    'lib/jquery/contextmenu/jquery.contextMenu.css',
    'lib/jquery/contextmenu/jquery.contextMenu.min.js',
    'lib/jquery/contextmenu/jquery.contextMenu.min.js.map',
    'lib/jquery/jquery-3.5.0.min.js',
    'lib/jquery/jquery.easing.1.3.js',
    'lib/jszip/jszip.min.js',
    'lib/sjcl/sjcl.min.js',
    'lib/sjcl/codecArrayBuffer.js',
    'lib/slicing-engines/CuraEngine/CuraEngine.data',
    'lib/slicing-engines/CuraEngine/CuraEngine.js',
    'lib/slicing-engines/CuraEngine/CuraEngine.wasm',
    'lib/slicing-engines/CuraEngine/SlicerConfiguration.js',
    'lib/slicing-engines/CuraEngine/SlicerWorker.js',
    'lib/slicing-engines/SlicerInterface.js',
    'lib/three/3MFLoader.js',
    'lib/three/BufferGeometryUtils.js',
    'lib/three/ConvexGeometry.js',
    'lib/three/ConvexHull.js',
    'lib/three/CopyShader.js',
    'lib/three/EffectComposer.js',
    'lib/three/OBJLoader.js',
    'lib/three/OrbitControls.js',
    'lib/three/OutlinePass.js',
    'lib/three/Pass.js',
    'lib/three/RenderPass.js',
    'lib/three/ShaderPass.js',
    'lib/three/TransformControls.js',
    'lib/three/three.min.js',
    'lib/util/crypto/SynDaverWiFi.js',
    'lib/util/gcode/GCodeParser.js',
    'lib/util/gcode/Toolpath.js',
    'lib/util/geometry/FaceRotationHelper.js',
    'lib/util/geometry/GeometryAlgorithms.js',
    'lib/util/geometry/GeometrySerialize.js',
    'lib/util/io/FetchFile.js',
    'lib/util/io/GeometryLoader.js',
    'lib/util/io/GeometryLoaderWorker.js',
    'lib/util/io/LoadResource.js',
    'lib/util/io/StlReader.js',
    'lib/util/io/TOMLWriter.js',
    'lib/util/misc/ParseQuery.js',
    'lib/util/misc/ResettableTimer.js',
    'lib/util/misc/Wikify.js',
    'lib/util/ui/dialog/dialog.css',
    'lib/util/ui/dialog/dialog.js',
    'lib/util/ui/log/log.css',
    'lib/util/ui/log/log.js',
    'lib/util/ui/navcube/navcube.css',
    'lib/util/ui/navcube/navcube.js',
    'lib/util/ui/progress/progress.css',
    'lib/util/ui/progress/progress.js',
    'lib/util/ui/settings/dropdown.html',
    'lib/util/ui/settings/editable-select.js',
    'lib/util/ui/settings/settings.css',
    'lib/util/ui/settings/settings.js',
    'lib/util/ui/toolbar/toolbar.css',
    'lib/util/ui/toolbar/toolbar.js',
    'lib/util/ui/ui.css',
    'lib/util/ui/updater/updater.css',
    'lib/util/ui/updater/updater.js',
    'guide/css/markdown.css',
    'guide/symple_slicer_users_guide.md.txt',
    'guide/images/advanced_features.png',
    'guide/images/final_steps.png',
    'guide/images/firmware.png',
    'guide/images/help.png',
    'guide/images/install_chrome_app.png',
    'guide/images/lithophane_generated.png',
    'guide/images/lithophane_original.png',
    'guide/images/machine_settings.png',
    'guide/images/material_notes.png',
    'guide/images/place_objects.png',
    'guide/images/preview_all_layers.png',
    'guide/images/preview_infill.png',
    'guide/images/preview_shell.png',
    'guide/images/preview_show_layers.png',
    'guide/images/preview_supports.png',
    'guide/images/preview_travel.png',
    'guide/images/print_and_preview.png',
    'guide/images/right_click_menu.png',
    'guide/images/sympleslicer.png',
    'guide/images/select_profiles.png',
    'guide/images/select_profiles2.png',
    'guide/images/slice_objects.png',
    'guide/images/tool_layflat_after.png',
    'guide/images/tool_layflat_before.png',
    'guide/images/tool_mirror.png',
    'guide/images/tool_move.png',
    'guide/images/tool_rotate.png',
    'guide/images/tool_scale.png',
    'guide/images/view_drop_down_menu.png'
];

console.log('Service worker starting');

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

self.addEventListener('fetch', event => event.respondWith(processRequest(event.request)));

function processMarkdown(str) {
    return '<html><head><meta charset="utf-8"><link rel="stylesheet" href="css/markdown.css"></head><body>' + wikify(str) + '</body></html>';
}

async function processRequest(request) {
    const autoWikify = request.url.endsWith(".md.html") || request.url.endsWith(".md.txt"); 
    if (autoWikify) {
        request = new Request(request.url.replace(".md.html", ".md"));
    }
    var cache    = await caches.open(cacheName);
    var response = await cache.match(request);
    if (!response) {
        if (request.url.includes("service-worker-info.json")) {
            return new Response(
                JSON.stringify(info),
                {headers: {"Content-Type": "text/json"}}
            );
        } else {
            console.log("Warning: Resource not in cache: ", request.url, "requested by",  request.referrer);
            response = fetch(request);
        }
    }
    if(autoWikify) {
        return modifyResponse(await response, processMarkdown, "text/html");
    }
    return response;
}

async function modifyResponse(response, func, mimeType) {
  // Check response is html content
  if (
    !response.headers.get("content-type") ||
    !response.headers.get("content-type").includes("text/")
  ) {
    return response;
  }

  // Read response body.
  const text = await response.text();
  const modified = func(text);

  // Return modified response.
  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers: Object.assign({
        "content-type": mimeType
    },response.headers)
  });
}