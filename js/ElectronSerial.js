/**
 * WebSlicer
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

async function flashArchimFirmware(usb) {
    try {
        ProgressBar.message("Loading firmware", usb.firmware);
        const data         = await fetchFile(usb.firmware);
        const bossa        = await import('../lib/serial-tools/bossa/bossa.js');
        const programmer   = new bossa.BOSSA();
        const usb_marlin   = {vendorId: usb.marlin_vendor_id, productId: usb.marlin_product_id};
        const usb_samba    = {vendorId: usb.samba_vendor_id,  productId: usb.samba_product_id};

        ProgressBar.message("Finding printers");
        programmer.onProgress = ProgressBar.progress;

        // See if there are devices in the Samba bootloader
        var matches = await programmer.find_devices(usb_samba);
        if(matches.length == 0) {
            // If none are found, try resetting active printers
            matches = await programmer.find_devices(usb_marlin);
            if(matches.length == 0) {
                throw Error("No printers found");
            }
            await programmer.reset_to_bootloader(matches[0]);
            // See if there are now devices in the Samba bootloader
            matches = await programmer.find_devices(usb_samba);
            if(matches.length == 0) {
                throw Error("Unable to enter bootloaders");
            }
        }
        await programmer.connect(matches[0]);
        ProgressBar.message("Writing firmware");
        await programmer.flash_firmware(data);
        await programmer.reset_and_close();
    } finally {
        ProgressBar.hide();
    }
}

async function flashFirmware() {
    if(!ProfileManager.usb) {
        throw Error("No serial port information for this profile");
    }
    switch(ProfileManager.usb.flasher) {
        case "bossa": await flashArchimFirmware(ProfileManager.usb); break;
    }
}

async function stream_gcode(gcode) {
    if(!ProfileManager.usb) {
        throw Error("No serial port information for this profile");
    }
    const usb = ProfileManager.usb;

    try {
        const marlin = await import('../lib/serial-tools/gcode-sender/MarlinSerialProtocol.js');

        // Find an Archim board to connect to

        const usb_marlin   = {vendorId: usb.marlin_vendor_id, productId: usb.marlin_product_id};
        ProgressBar.message("Finding printers");
        const matches = await SequentialSerial.matchPorts(usb_marlin);
        if(matches.length == 0) {
            throw Error("No printers found");
        }
        let port = matches[0];

        setPowerSaveEnabled(false);

        // Connect to the printer
        console.log("Found printer on port", port);
        let sio = new SequentialSerial();
        await sio.open(port, usb.baudrate, 3, 10000);

        const proto = new marlin.MarlinSerialProtocol(sio, console.log, console.log);

        // Split into individual lines
        gcode = gcode.split(/\r?\n/);

        // Stream the GCODE
        ProgressBar.message("Printing");
        for(const [i, line] of gcode.entries()) {
            await proto.sendCmdReliable(line);
            while(!await proto.clearToSend()) {
                let line = await proto.readline();
                line = line.trim();
                if(line && !line.startsWith("ok")) {
                    console.log(line);
                }
            }
            ProgressBar.progress(i/gcode.length);
        }
    } finally {
        ProgressBar.hide();
        setPowerSaveEnabled(true);
    }
}