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

window.NativeTransformStream = window.NativeTransformStream || TransformStream;
window.NativeTextDecoderStream = window.NativeTextDecoderStream || TextDecoderStream;
window.NativeTextEncoderStream = window.NativeTextEncoderStream || TextEncoderStream;

export class CuraPostProcessing {
    /**
     * When slicing via the command line, Cura puts in a dummy header in the GCODE
     * and prints the real header via stderr. Capture this for later use.
     */
    static captureGcodeHeader(str) {
        if(str.match(/Gcode header after slicing/)) {
            this.capturing = true;
            CuraPostProcessing.header = "";
            return;
        }
        if(str.match(/End of gcode header/)) {
            this.capturing = false;
        }
        if(this.capturing) {
            CuraPostProcessing.header += str + "\n";
        }
    }

    static captureProgress(str) {
        var m, stages = ["slice", "layerparts", "inset+skin", "support", "export"];
        if(m = str.match(/Progress:([\w+]+):(\d+):(\d+)/)) {
            const stageProgress = stages.indexOf(m[1]);
            const sliceProgress = parseInt(m[2])/parseInt(m[3]);
            return (sliceProgress + stageProgress)/stages.length;
        }
    }
   
    static getStats() {
        return {
            header: CuraPostProcessing.header
        }
    }
}

/******************** Classes for postprocessing the gcode ********************/

export class LineAlignedTransformStream {
    constructor() {
        let prefix = "";
        return new NativeTransformStream({
            start() {
                prefix = "";
            },
            transform(chunk, controller) {
                let end = chunk.lastIndexOf('\n');
                if(end == -1) {
                    prefix += chunk;
                } else {
                    prefix += chunk.slice(0, end + 1);
                    controller.enqueue(prefix);
                    prefix = chunk.slice(end + 1);
                }
            },
            flush(controller) {
                controller.enqueue(prefix);
            }
        });
    }
}

/* Replace the fake header in the G-code with the real header */

export class ReplaceGCodeHeader {
    constructor(header) {
        let found = false;
        return new NativeTransformStream({
            transform(chunk, controller) {
                if(found) {
                    controller.enqueue(chunk);
                } else {
                    const start = chunk.indexOf("M82 ;absolute extrusion mode");
                    if(start != -1) {
                        controller.enqueue(header + "\n" + chunk.slice(start));
                        found = true;
                    }
                }
            },
            flush(controller) {
                if(!found) {
                    console.warn("Warning: Unable to strip Cura header");
                }
            }
        });
    }
}

/* Add M73 (Set Print Progress) to GCODE file */

export class AddPrintProgress {
    constructor(header) {
        const re_tt = /^;TIME:(\d+)$/m;
        const re_te = /^;TIME_ELAPSED:(\d+).*$/gm;
        
        let total_time = 0;
        function getProgress(time_elapsed) {
            return "M73 P" + Math.ceil((time_elapsed+1)/(total_time+1)*100);
        }
        
        return new NativeTransformStream({
            transform(chunk, controller) {
                if(!total_time) {
                    const m = chunk.match(re_tt)
                    if(m) {
                        total_time = m[1];
                    }
                }
                if(total_time) {
                    chunk = chunk.replace(re_te,
                        (match, time_elapsed) =>
                            match + "\n" + getProgress(time_elapsed)
                    );                    
                }
                controller.enqueue(chunk);
            },
            flush(controller) {
                if(!total_time) {
                    console.warn("Warning: Unable to find time elapsed");
                }
            }
        });
    }
}

/* Inserts a script after a layer transition if a test function returns true */

class AddAtLayer {
    constructor(layerTest, script) {
        const re = /^;LAYER:(\d+)\s*$/gm;
        
        let number = 0;
        function getScript() {
            return script.replace("${number}",++number).trim();
        }
        
        return new NativeTransformStream({
            transform(chunk, controller) {
                chunk = chunk.replace(re,
                    (match,layer) =>
                        layerTest(parseInt(layer,10)) ?
                        match + "\n" + getScript() :
                        match
                );
                controller.enqueue(chunk);
            },
            flush(controller) {
                if(!number) {
                    console.warn("Warning: No layers modified in G-code");
                }
            }
        });
    }
}