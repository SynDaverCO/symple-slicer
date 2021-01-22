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
    const usb = ProfileManager.getSection("usb");
    if(!usb) {
        throw Error("No serial port information for this profile");
    }
    switch(usb.flasher) {
        case "bossa":    await flashFirmwareWithBossa(usb); break;
        case "stk500v2": await flashFirmwareWithStk(usb); break;
    }
}

async function stream_gcode(gcode) {
    if(!ProfileManager.usb) {
        throw Error("No serial port information for this profile");
    }
    const usb     = ProfileManager.getSection("usb");
    const scripts = ProfileManager.getSection("scripts");

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
        setPrintInProgress(true);

        // Connect to the printer
        Log.clear();
        Log.write("Found printer on port", port);
        var sio = new SequentialSerial();
        await sio.open(port, usb.baudrate, 3, 10000);

        let asyncEvent = "";
        let proto = new marlin.MarlinSerialProtocol(sio);
        proto.onDebugMsgCallback = Log.write;
        proto.onResendCallback = Log.write;
        proto.onResyncCallback = count => {
            if(count > 2 && !confirm("The printer is not responding. Press OK to continue waiting, or Cancel to stop the print")) {
                asyncEvent = "abort";
            }
        };

        // Split into individual lines
        gcode = gcode.split(/\r?\n/);

        // Stream the GCODE
        ProgressBar.message("Printing");
        
        ProgressBar.onAbort(() => {
            let okay = confirm("About to stop the print. Click OK to stop, Cancel to keep printing.");
            if(okay) {
                ProgressBar.message("Stopping...");
                asyncEvent = "stop";
            }
            return okay;
        });
        ProgressBar.onPause(async state => {asyncEvent = state ? "pauseWithScript" : "resumeWithScript"});

        // Stream the gcode to the printer
        let isPaused = false;
        for(const [i, line] of gcode.entries()) {
            await proto.sendCmdReliable(line);
            while(!await proto.clearToSend() || isPaused) {
                const line = await proto.readline();
                if(line) {
                    if(!line.startsWith("ok")) {
                        Log.write(line);
                    }
                    /**
                     * Handle host action commands
                     *
                     * See:
                     *   https://reprap.org/wiki/G-code#Action_commands
                     *   https://docs.octoprint.org/en/master/features/action_commands.html
                     *   https://docs.octoprint.org/en/master/bundledplugins/action_command_prompt.html
                     */
                    if(line.startsWith("//action:")) {
                        let args = line.substr(9).split(" ");
                        let cmd = args.shift();
                        switch(cmd) {
                            case "out_of_filament": alert("The filament has run out. Press okay to resume printing"); break;
                            case "pause":  asyncEvent = "pauseWithScript"; break;
                            case "resume": asyncEvent = "resumeWithScript"; break;
                            case "paused": asyncEvent = "pause"; break;
                            case "resumed": asyncEvent = "resume"; break;
                            case "cancel": asyncEvent = "stop"; break;
                            case "notification": ProgressBar.message(args.join(" ")); break;
                            case "probe_failed": throw new Error("Probe failed."); break;
                            case "prompt_begin": Dialog.removeButtons(); Dialog.message(args.join(" ")); break;
                            case "prompt_choice":
                            case "prompt_button": Dialog.addButton(cmd[1]); break;
                            case "prompt_show": Dialog.show(); break;
                            case "prompt_end": Dialog.hide(); break;
                            default:
                                console.warn("Unhandled host action:", cmd, args);
                        }
                    }
                }
                // Handle events that may have happened outside this thread.
                switch(asyncEvent) {
                    case "resumeWithScript":
                       if(scripts.resume_print_gcode) {
                            await proto.sendScriptUnreliable(scripts.resume_print_gcode);
                            await proto.waitUntilQueueEmpty();
                        } else {
                            console.warn("No resume_print_gcode in profile");
                        }
                        // Fall-through
                    case "resume":
                        isPaused = false;
                        ProgressBar.setPauseState(false);
                        break;
                    case "pauseWithScript":
                        if(scripts.pause_print_gcode) {
                            await proto.waitUntilQueueEmpty();
                            await proto.sendScriptUnreliable(scripts.pause_print_gcode);
                            await proto.waitUntilQueueEmpty();
                        } else {
                            console.warn("No pause_print_gcode in profile");
                        }
                        // Fall-through
                    case "pause":
                        isPaused = true;
                        ProgressBar.setPauseState(true);
                        break;
                    case "abort":
                        throw new PrintAborted("Print stopped by user");
                    case "stop":
                        Log.write("Stopping print");
                        if(!scripts.stop_print_gcode) {
                            console.warn("No stop_print_gcode in profile");
                        }
                        await proto.abortPrint(scripts.stop_print_gcode);
                        Log.write("Print stopped");
                        throw new PrintAborted("Print stopped by user");
                        break;
                }
                asyncEvent = "";
            }
            ProgressBar.progress(i/gcode.length);
        }
        await proto.finishPrint();
        Log.write("Print finished.");
    } finally {
        if(sio) {
            sio.close();
        }
        ProgressBar.hide();
        setPowerSaveEnabled(true);
        setPrintInProgress(false);
    }
}

class PrintAborted extends Error {};