/**
 * SerialTools
 * Copyright (C) 2020  SynDaver Labs, Inc.
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
 */
 
const flashPrintersPath = document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf("/"));

async function flashFirmwareWithBossa(attr) {
    const bossa      = await import(flashPrintersPath + '/bossa/bossa.js');
    const programmer = new bossa.BOSSA();
    try {
        ProgressBar.message("Finding printers");
        programmer.onProgress = ProgressBar.progress;

        let port = await SequentialSerial.requestPort([attr.usb_marlin, attr.usb_samba]);
        // Check to see if we need to reset the printer to the bootloader
        const usbInfo = port.getInfo();
        if(usbInfo.usbVendorId  == attr.usb_marlin.usbVendorId &&
           usbInfo.usbProductId == attr.usb_marlin.usbProductId) {
            await programmer.reset_to_bootloader(port);
            if(SequentialSerial.isWebSerial) {
                // With the Web Serial API, the browser needs a new button click to allow us to open another device.
                alert("The printer is now ready for upgrading.\nClick the \"Update\" button once again to proceed.\n\nThe printer's display may fade out during this process (this is normal)");
                return;
            } else {
                // With Electron, we can immediately try to open another serial port
                port = await SequentialSerial.requestPort([attr.usb_samba]);
            }
        }
        await programmer.connect(port);
        ProgressBar.message("Writing firmware");
        await programmer.flash_firmware(attr.data);
        ProgressBar.message("Verifying firmware");
        await programmer.verify_firmware(attr.data);
        await programmer.enable_boot_flag();
    } finally {
        ProgressBar.hide();
        await programmer.reset_and_close();
    }
}

async function flashFirmwareWithStk(attr) {
    const stk        = await import(flashPrintersPath + '/avr-isp/stk500v2.js');
    const hex        = await import(flashPrintersPath + '/avr-isp/intelHex.js');
    const programmer = new stk.Stk500v2();
    const firmware   = hex.IntelHex.decode(attr.data);
    try {
        ProgressBar.message("Finding printers");
        programmer.onProgress = ProgressBar.progress;

        let port = await SequentialSerial.requestPort([attr.usb_marlin]);
        await programmer.connect(port);
        ProgressBar.message("Writing firmware");
        await programmer.flash_firmware(firmware);
        ProgressBar.message("Verifying firmware");
        await programmer.verify_firmware(firmware);
        await programmer.reset_and_close();
    } finally {
        ProgressBar.hide();
    }
}
