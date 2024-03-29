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

import { wikify } from './lib/util/misc//Wikify.js';

// Based on https://deanhume.com/displaying-a-new-version-available-progressive-web-app/

const info = {
    cacheVersion: 299
};

const cacheName = 'v' + info.cacheVersion;

const filesToCache = [
    '.',
    './manifest.webmanifest',
    './package.json',
    'config/syndaver/profile_list.toml',
    'config/syndaver/machine_profiles/syndaver_axi_1.toml',
    'config/syndaver/machine_profiles/syndaver_axi_2.toml',
    'config/syndaver/machine_profiles/syndaver_level.toml',
    'config/syndaver/machine_profiles/syndaver_level_up.toml',
    'config/syndaver/machine_profiles/syndaver_ng2_04.toml',
    'config/syndaver/machine_profiles/syndaver_ng2_06.toml',
    'config/syndaver/machine_profiles/syndaver_ng2_08.toml',
    'config/syndaver/machine_profiles/syndaver_ng2_10.toml',
    'config/syndaver/machine_profiles/syndaver_ng2_12.toml',
    'config/syndaver/print_profiles/axi1/abs_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/asa_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/cf-nylon_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/copperfill_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/fibertuff_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/nylon_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/pc-abs_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/petg_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/pla_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/pro-pla_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/silk-pla_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/tpu85_axi1_standard.toml',
    'config/syndaver/print_profiles/axi1/tpu95_axi1_standard.toml',
    'config/syndaver/print_profiles/axi2/abs_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/asa_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/cf-nylon_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/copperfill_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/fibertuff_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/nylon_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/pc-abs_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/petg_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/pla_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/pro-pla_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/silk-pla_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/tpu85_axi2_standard.toml',
    'config/syndaver/print_profiles/axi2/tpu95_axi2_standard.toml',
    'config/syndaver/print_profiles/level/abs_level_standard.toml',
    'config/syndaver/print_profiles/level/asa_level_standard.toml',
    'config/syndaver/print_profiles/level/cf-nylon_level_standard.toml',
    'config/syndaver/print_profiles/level/copperfill_level_standard.toml',
    'config/syndaver/print_profiles/level/CURA_DEFAULTS.toml',
    'config/syndaver/print_profiles/level/fibretuff_level_standard.toml',
    'config/syndaver/print_profiles/level/nylon_level_standard.toml',
    'config/syndaver/print_profiles/level/pc-abs_level_standard.toml',
    'config/syndaver/print_profiles/level/petg_level_standard.toml',
    'config/syndaver/print_profiles/level/pla_level_standard.toml',
    'config/syndaver/print_profiles/level/pro-pla_level_standard.toml',
    'config/syndaver/print_profiles/level/silk-pla_level_standard.toml',
    'config/syndaver/print_profiles/level/tpu85_level_standard.toml',
    'config/syndaver/print_profiles/level/tpu95_level_standard.toml',
    'config/syndaver/print_profiles/level-up/abs_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/asa_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/cf-nylon_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/copperfill_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/CURA_DEFAULTS.toml',
    'config/syndaver/print_profiles/level-up/fibretuff_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/nylon_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/pc-abs_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/petg_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/pla_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/pro-pla_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/silk-pla_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/tpu85_level-up_standard.toml',
    'config/syndaver/print_profiles/level-up/tpu95_level-up_standard.toml',
    'config/syndaver/print_profiles/ng2_04/CURA_DEFAULTS.toml',
    'config/syndaver/print_profiles/ng2_04/pla_ng2_04_standard.toml',
    'config/syndaver/print_profiles/ng2_06/CURA_DEFAULTS.toml',
    'config/syndaver/print_profiles/ng2_06/pla_ng2_06_standard.toml',
    'config/syndaver/print_profiles/ng2_08/CURA_DEFAULTS.toml',
    'config/syndaver/print_profiles/ng2_08/pla_ng2_08_standard.toml',
    'config/syndaver/print_profiles/ng2_10/CURA_DEFAULTS.toml',
    'config/syndaver/print_profiles/ng2_10/pla_ng2_10_standard.toml',
    'config/syndaver/print_profiles/ng2_12/CURA_DEFAULTS.toml',
    'config/syndaver/print_profiles/ng2_12/pla_ng2_12_standard.toml',
    'config/syndaver/machine_firmware/LICENSE.txt',
    'config/syndaver/machine_firmware/SynDaver_Axi_1_Marlin_R7_c97c32e0f6.bin',
    'config/syndaver/machine_firmware/SynDaver_Axi_2_Marlin_R4_d365fe33af.bin',
    'config/syndaver/machine_firmware/SynDaver_Level_Marlin_R1_9a9d76d508.bin',
    'config/syndaver/machine_firmware/SynDaver_LevelUp_Marlin_R1_9a9d76d508.bin',
    'config/syndaver/machine_firmware/SynDaver_WiFi.bin',
    'config/syndaver/machine_firmware/SynDaver_WiFi.html',
    'config/syndaver/machine_firmware/SynDaver_WiFi_Serial.html',
    'config/syndaver/machine_firmware/syndaver-wifi-master.zip',
    'config/syndaver/machine_firmware/RepRapHost-master.zip',
    'config/syndaver/machine_firmware/syndaver_ng2/NG2_firmware_test.zip',
    'config/syndaver/machine_firmware/syndaver_ng2/Duet2CombinedFirmware.bin',
    'config/profiles/profile_list.toml',
    'config/profiles/machine_profiles/cura_default.toml',
    'config/profiles/print_profiles/cura_default.toml',
    'css/layout.css',
    'css/markdown.css',
    'css/themes/syndaver-3d.css',
    'css/themes/classic.css',
    'css/themes/darkness.css',
    'css/themes/sporty.css',
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
    'js/CascadingChoices.js',
    'js/OtherUI.js',
    'js/PauseAtLayer.js',
    'js/PrintableObject.js',
    'js/OverhangShaderMaterial.js',
    'js/PrinterRepresentation.js',
    'js/ProfileManager.js',
    'js/RenderLoop.js',
    'js/ObjectGroup.js',
    'js/SelectionGroup.js',
    'js/SerialPort.js',
    'js/SettingsPanel.js',
    'js/SlicerSettings.js',
    'js/Stage.js',
    'js/WebWifiConnector.js',
    'lib/FastestSmallestTextEncoderDecoder/EncoderDecoderTogether.min.js',
    'lib/FileSaver/FileSaver.js',
    'lib/circlepacker/circlepacker.min.js',
    'lib/details-polyfill/details-polyfill.js',
    'lib/jakwings-toml-j0.4/toml-browser.js',
    'lib/jquery/contextmenu/font/context-menu-icons.woff2?4wdhf',
    'lib/jquery/contextmenu/jquery.contextMenu.min.css',
    'lib/jquery/contextmenu/jquery.contextMenu.min.js',
    'lib/jquery/contextmenu/jquery.contextMenu.min.js.map',
    'lib/jquery/contextmenu/jquery.ui.position.min.js',
    'lib/jquery/jquery-3.5.0.min.js',
    'lib/jquery/jquery.easing.1.3.js',
    'lib/jszip/jszip.min.js',
    'lib/sjcl/sjcl.min.js',
    'lib/sjcl/codecArrayBuffer.js',
    'lib/slicing-engines/CuraEngine/CuraEngine.data',
    'lib/slicing-engines/CuraEngine/CuraEngine.js',
    'lib/slicing-engines/CuraEngine/CuraEngine.wasm',
    'lib/slicing-engines/CuraEngine/CuraPostprocessing.js',
    'lib/slicing-engines/CuraEngine/SlicerConfiguration.js',
    'lib/slicing-engines/CuraEngine/SlicerWorker.js',
    'lib/slicing-engines/CuraEngine/fdmextruder.def.json',
    'lib/slicing-engines/CuraEngine/fdmprinter.def.json',
    'lib/slicing-engines/CuraEngine/fdmprinter_errata.def.json',
    'lib/slicing-engines/CuraEngine/fdmprinter_extras.def.json',
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
    'lib/three.extendMaterial/ExtendMaterial.js',
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
    'lib/util/io/StlWriter.js',
    'lib/util/io/TOMLWriter.js',
    'lib/util/misc/ParseQuery.js',
    'lib/util/misc/ParseColor.js',
    'lib/util/misc/ResettableTimer.js',
    'lib/util/misc/Wikify.js',
    'lib/serial-tools/avr-isp/chipDB.js',
    'lib/serial-tools/avr-isp/intelHex.js',
    'lib/serial-tools/avr-isp/ispBase.js',
    'lib/serial-tools/avr-isp/stk500v2.js',
    'lib/serial-tools/bossa/bossa.js',
    'lib/serial-tools/bossa/bossa_chip_db.js',
    'lib/serial-tools/bossa/eefc_flash.js',
    'lib/serial-tools/bossa/samba.js',
    'lib/serial-tools/bossa/wordcopy_applet.js',
    'lib/serial-tools/gcode-sender/MarlinSerialProtocol.js',
    'lib/serial-tools/WebSerialAdapter.js',
    'lib/serial-tools/FlashPrinters.js',
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
    'guide/images/advanced_features.JPG',
    'guide/images/beginner.JPG',
    'guide/images/default.JPG',
    'guide/images/expert.JPG',
    'guide/images/first_slice_settings.JPG',
    'guide/images/help.JPG',
    'guide/images/install_chrome_app.JPG',
    'guide/images/layflat_tool.png',
    'guide/images/lithophane_generated.JPG',
    'guide/images/lithophane_original.jpg',
    'guide/images/material_notes.png',
    'guide/images/mirror_objects_tool.png',
    'guide/images/move_objects_tool.png',
    'guide/images/overhangs.JPG',
    'guide/images/place_object.JPG',
    'guide/images/place_objects2.JPG',
    'guide/images/preview_all_layers.JPG',
    'guide/images/preview_infill.JPG',
    'guide/images/preview_shell.JPG',
    'guide/images/preview_show_layers.JPG',
    'guide/images/preview_supports.JPG',
    'guide/images/preview_travel.JPG',
    'guide/images/print_and_preview.JPG',
    'guide/images/right_click_menu.JPG',
    'guide/images/rotate_objects_tool.png',
    'guide/images/save_settings.JPG',
    'guide/images/save_settings_advanced_features.JPG',
    'guide/images/scale_objects_tool.png',
    'guide/images/select_profiles_1.JPG',
    'guide/images/select_profiles_2.JPG',
    'guide/images/select_profiles_3.JPG',
    'guide/images/slice_objects.JPG',
    'guide/images/sympleslicer.JPG',
    'guide/images/tool_layflat_after.JPG',
    'guide/images/tool_layflat_before.JPG',
    'guide/images/tool_mirror.JPG',
    'guide/images/tool_move.JPG',
    'guide/images/tool_rotate.JPG',
    'guide/images/tool_scale.JPG',
    'guide/images/tools.JPG',
    'guide/images/update_firmware.JPG',
    'guide/images/view_drop_down_menu.JPG',
    'guide/images/wifi_page.JPG',
    'guide/images/wireless_printing.JPG'
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