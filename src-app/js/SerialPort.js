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

async function flashFirmware() {
    const usb = ProfileManager.getSection("usb");
    if(!usb) {
        throw Error("No serial port information for this profile");
    }
    const usb_marlin = {usbVendorId: parseInt(usb.marlin_vendor_id, 16), usbProductId: parseInt(usb.marlin_product_id, 16)};
    const usb_samba  = {usbVendorId: parseInt(usb.samba_vendor_id,  16), usbProductId: parseInt(usb.samba_product_id,  16)};
    ProgressBar.message("Downloading firmware");
    const data = await fetchFile(usb.firmware);
    const attr = {usb_marlin, usb_samba, data};
    switch(usb.flasher) {
        case "bossa":    await flashFirmwareWithBossa(attr); break;
        case "stk500v2": await flashFirmwareWithStk(attr); break;
        default: throw Error("Unknown flashing tool type: " + usb.flasher);
    }
}

async function stream_gcode(gcode) {
    const usb     = ProfileManager.getSection("usb");
    const scripts = ProfileManager.getSection("scripts");
    let port, asyncEvent = "", isPaused = false;
    if(!usb) {
        throw Error("No serial port information available for this profile");
    }
    if(!scripts) {
        throw Error("No scripts information available for this profile");
    }
    try {
        const usb_marlin = {usbVendorId: parseInt(usb.marlin_vendor_id, 16), usbProductId: parseInt(usb.marlin_product_id, 16)};

        // Find a printer to connect to

        ProgressBar.message("Finding printers");
        port = await SequentialSerial.requestPort([usb_marlin]);

        setPowerSaveEnabled(false);
        setPrintInProgress(true);

        // Connect to the printer
        Log.clear();
        Log.write("Found printer on port", port);
        await port.open(usb.baudrate, 3, 10000);

        const msp = await import('../lib/serial-tools/gcode-sender/MarlinSerialProtocol.js');
        const proto = new msp.MarlinSerialProtocol();
        proto.onDebugMsgCallback = Log.write;
        proto.onResendCallback = Log.write;
        proto.onResyncCallback = count => {
            if(count > 2 && !confirm("The printer is not responding. Press OK to continue waiting, or Cancel to stop the print")) {
                asyncEvent = "abort";
            }
        };
        await proto.open(port);

        // Split into individual lines
        gcode = gcode.split(/\r?\n/);

        // Stream the GCODE
        ProgressBar.message("Printing");
        ProgressBar.onAbort(() => {
            const okay = confirm("About to stop the print. Click OK to stop, Cancel to keep printing.");
            if(okay) {
                ProgressBar.message("Stopping...");
                asyncEvent = "stop";
            }
            return okay;
        });
        ProgressBar.onPause(async state => {asyncEvent = state ? "pauseWithScript" : "resumeWithScript"});

        // Stream the gcode to the printer
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
    }
    finally {
        if(port) {
            port.close();
        }
        ProgressBar.hide();
        setPowerSaveEnabled(true);
        setPrintInProgress(false);
    }
}

class PrintAborted extends Error {};