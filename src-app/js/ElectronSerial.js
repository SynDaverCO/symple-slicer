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

async function flashFirmwareWithBossa(usb) {
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
                throw Error("Unable to enter bootloader");
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

async function flashFirmwareWithStk(usb) {
    try {
        ProgressBar.message("Loading firmware", usb.firmware);
        const data         = await fetchFile(usb.firmware);
        const stk          = await import('../lib/serial-tools/avr-isp/stk500v2.js');
        const hex          = await import('../lib/serial-tools/avr-isp/intelHex.js');
        const programmer   = new stk.Stk500v2();
        const usb_marlin   = {vendorId: usb.marlin_vendor_id, productId: usb.marlin_product_id};

        ProgressBar.message("Finding printers");
        programmer.onProgress = progress => {console.log(progress); ProgressBar.progress(progress)};

        matches = await programmer.find_devices(usb_marlin);
        if(matches.length == 0) {
            throw Error("No printers found");
        }
        await programmer.connect(matches[0]);
        ProgressBar.message("Writing firmware");
        await programmer.flash_firmware(hex.IntelHex.decode(data));
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
        case "bossa":    await flashFirmwareWithBossa(ProfileManager.usb); break;
        case "stk500v2": await flashFirmwareWithStk(ProfileManager.usb); break;
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
        Log.clear();
        Log.write("Found printer on port", port);
        var sio = new SequentialSerial();
        await sio.open(port, 0.5*usb.baudrate, 3, 10000);

        let serialDisconnect = false;
        sio.serial.on('close', err => {if(err) {console.error(err); serialDisconnect = true;}});

        let proto = new marlin.MarlinSerialProtocol(sio, Log.write, Log.write);

        // Split into individual lines
        gcode = gcode.split(/\r?\n/);

        // Stream the GCODE
        ProgressBar.message("Printing");
        let abortPrint = false;
        ProgressBar.onAbort(() => {
            let abortPrint = confirm("About to stop the print. Click OK to stop, Cancel to keep printing.");
            if(abortPrint) {
                ProgressBar.message("Stopping...");
            }
            return abortPrint;
        });
        for(const [i, line] of gcode.entries()) {
            await proto.sendCmdReliable(line);
            while(!await proto.clearToSend()) {
                const line = await proto.readline();
                if(line && !line.startsWith("ok")) {
                    Log.write(line);
                }
                if(abortPrint || serialDisconnect) break;
            }
            if(proto.resyncCount > 2) {
                if(!confirm("The printer is not responding. Press OK to continue waiting, or Cancel to stop the print")) {
                    throw new PrintAborted("Print stopped by user");
                }
            }
            ProgressBar.progress(i/gcode.length);
            if(abortPrint || serialDisconnect) break;
        }
        // Handle abnormal conditions
        if(serialDisconnect) {
            Log.write("Connection dropped");
            throw new Error("Connection dropped");
        }
        else if(abortPrint) {
            await proto.abortPrint(usb.stop_print_gcode);
            Log.write("Print stopped by user");
            throw new PrintAborted("Print stopped by user");
        } else {
            await proto.finishPrint();
            Log.write("Print finished.");
        }
    } finally {
        if(sio) {
            sio.close();
        }
        ProgressBar.hide();
        setPowerSaveEnabled(true);
    }
}

class PrintAborted extends Error {};