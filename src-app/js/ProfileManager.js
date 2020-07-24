/**
 * WebSlicer
 * Copyright (C) 2016  Marcio Teixeira
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

class ProfileManager {
    static _loadProfileStr(str, baseUrl) {
        const config = toml.parse(str);
        if(config.hasOwnProperty("usb")) {
            // Convert any URLs relative to the profile into absolute paths
            if(baseUrl && config.usb.hasOwnProperty("firmware")) {
                config.usb.firmware = new URL(config.usb.firmware, baseUrl).toString();
            }
            ProfileManager.usb = config.usb;
        }
        if(config.hasOwnProperty("settings")) {
            slicer.setMultiple(config.settings);
        }
    }

    static _saveProfileStr(options) {
        const toml = new TOMLFormatter();
        if(ProfileManager.usb) {
            toml.writeCategory("usb");
            toml.writeProperties(ProfileManager.usb);
        }
        toml.writeCategory("settings");
        slicer.dumpSettings(toml, options);
        return toml.str;
    }

    /**
     * The stored profile is saved in the browser's local store
     * and is used to preserve settings across multiple sessions
     */
    static hasStoredProfile() {
        return (typeof(Storage) !== "undefined") && localStorage.getItem("startup_config");
    }

    static loadStoredProfile() {
        if(typeof(Storage) === "undefined") return false;

        const stored_config = localStorage.getItem("startup_config");
        if(!stored_config) return false;

        console.log("Loaded settings from local storage");
        ProfileManager.importConfiguration(stored_config, true);
        return true;
   }

    static onUnloadHandler() {
        console.log("Saved setting to local storage");
        localStorage.setItem("startup_config", ProfileManager._saveProfileStr());
    }

    /**
     * Returns a list of URLs to fetch profiles from. By default,
     * only the default profiles, but if "profile_urls"
     * exists in the local storage, add those as well.
     */
    static getProfileUrls() {
        let profileUrls = ["config/syndaver/profile_list.toml"];

        if(typeof(Storage) === "undefined") return profileUrls;

        const extra = localStorage.getItem("profile_urls");
        if(extra) {
            profileUrls = profileUrls.concat(extra.split(/\s+/));
        }
        return profileUrls;
    }

    static addProfileUrl(url) {
        let oldList = localStorage.getItem("profile_urls") || "";
        url = url.toString();
        if(oldList.indexOf(url) === -1) {
            oldList += " " + url;
            localStorage.setItem("profile_urls", oldList.trim());
        }
    }

    // Populate the pull down menus in the UI with a list of available profiles
    static async populateProfileMenus(printer_menu, material_menu) {
        if(ProfileManager.hasStoredProfile()) {
            printer_menu.option("Last session settings", {value: "keep"});
            material_menu.option("Last session settings", {value: "keep"});
        }

        function addMenuEntries(baseUrl, config, type, menu) {
            if(config.hasOwnProperty(type)) {
                for (const [key, value] of Object.entries(config[type])) {
                    let profile_url = new URL(type + "/" + key + ".toml", baseUrl);
                    menu.option(value, {value: profile_url});
                }
            }
        }

        let okay = true
        for(const url of ProfileManager.getProfileUrls()) {
            const baseUrl = new URL(url, document.location)
            try {
                const data = await fetchText(url)
                const config = toml.parse(data)
                console.log("Loading profile list from", baseUrl.toString())
                addMenuEntries(baseUrl, config, "machine_profiles", printer_menu)
                addMenuEntries(baseUrl, config, "print_profiles",   material_menu)
            } catch(e) {
                console.warn("Unable to load profiles from", url)
                okay = false
            }
        }
        if(!okay) alert("Unable to retrieve one or more profile lists")
    }

    /**
     * Loads a specific print profile. These profiles are stored as TOML files.
     */
    static async loadPresets(type, url) {
        const data = await fetchText(url);
        console.log("Loaded", type, "profile from", url);
        ProfileManager._loadProfileStr(data, url);
    }

    // Apply a selection from the menu
    static async applyPresets(printer = "keep", material = "keep") {
        if(printer !== "keep" && material !== "keep") {
            console.log("Loading slicer defaults");
            slicer.loadDefaults();
        }
        if(printer && printer !== "keep") {
            await ProfileManager.loadPresets("machine", printer);
        }
        if(material && material !== "keep") {
            await ProfileManager.loadPresets("print", material);
        }
    }

    static importConfiguration(data, initial) {
        slicer.loadDefaults(initial);
        ProfileManager._loadProfileStr(data);
    }

    static exportConfiguration(options) {
        return TOMLFormatter.alignComments(ProfileManager._saveProfileStr(options));
    }
}

class TOMLFormatter {
    constructor() {
        this.str = "";
    }

    writeCategory(category) {
        this.str += "[" + category + "]\n\n";
    }

    /**
     * Writes a value into the TOML file
     *
     *   key     - the name of the value
     *   value   - the value
     *   comment - if provided, this is added as a comment at the end of the line
     *   enabled - If false, the entire line is commented out
     */
    writeValue(key, value, comment, enabled = true) {
        let val_str;
        switch(typeof value) {
            case "object":
            case "boolean":
            case "object":
            case "number":
                val_str = JSON.stringify(value);
                break;
            case "string":
                if(value.indexOf('\n') != -1) {
                    val_str = '"""\n' + value + '"""';
                } else {
                    val_str = '"' + value + '"';
                }
                break;
        }
        if(!enabled) {
            this.str += "# ";
            val_str = val_str.replace(/\n/g, "\n#"); // Comment out each line of a multi-line values
        }
        this.str += key + " = " + val_str;
        if(comment) {
            this.str += " # " + comment;
        }
        this.str += "\n";
    }

    writeProperties(obj) {
        for (const [key, value] of Object.entries(obj)) {
            this.writeValue(key, value);
        }
    }

    // Reformats the TOML file so all the comments line up
    static alignComments(str) {
        const comment  = /^(..*?)([#;].*)$/gm;
        let   tab_stop = 0;
        for(const m of str.matchAll(comment)) {
            tab_stop = Math.max(tab_stop, m[1].length);
        }
        return str.replace(comment, (m, p1, p2) => p1.padEnd(tab_stop) + p2)
    }
}