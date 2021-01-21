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
    static _loadDefaults() {
        delete ProfileManager.usb;
        delete ProfileManager.scripts;
        delete ProfileManager.settings;
        delete ProfileManager.metadata;
    }

    static _loadProfileStr(str, baseUrl) {
        // Convert any URLs into absolute paths relative to the profile
        const makeAbsolute = path => (baseUrl && path) ? new URL(path, baseUrl).toString() : path;
        const config = toml.parse(str);
        if(config.usb) {
            config.usb.firmware = makeAbsolute(config.usb.firmware);
            ProfileManager.usb = config.usb;
        }
        if(config.wireless) {
            if(config.wireless.uploads) {
                for(const pair of config.wireless.uploads) {
                    pair[1] = makeAbsolute(pair[1]);
                }
            }
            ProfileManager.wireless = config.wireless;
        }
        if(config.settings) {
            slicer.setMultiple(config.settings);
        }
        if(config.metadata) {
            // Merge the meta data with any existing metadata
            ProfileManager.metadata = Object.assign(ProfileManager.metadata || {}, config.metadata);
        }
    }

    static _saveProfileStr(options) {
        const toml = new TOMLWriter();
        toml.writeProperties(ProfileManager, ["metadata", "usb", "wireless"]);
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
            oldList += "\n" + url;
            localStorage.setItem("profile_urls", oldList.trim());
        }
    }

    static getURLs() {
        return localStorage.getItem("profile_urls") || "";
    }

    static setURLs(list) {
        localStorage.setItem("profile_urls", list);
    }

    // Populate the pull down menus in the UI with a list of available profiles
    static async populateProfileMenus(printer_menu, material_menu) {
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
        if(!okay) alert("Unable to load from one or more profile URLs.\nTo correct this problem, adjust \"Advanced Features -> External Data Sources\"");
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
    static async applyPresets(printer, material) {
        slicer.loadDefaults();
        ProfileManager._loadDefaults();
        await ProfileManager.loadPresets("machine", printer);
        await ProfileManager.loadPresets("print", material);
    }

    static importConfiguration(data, initial) {
        slicer.loadDefaults(initial);
        ProfileManager._loadDefaults();
        ProfileManager._loadProfileStr(data);
    }

    static exportConfiguration(options) {
        return TOMLWriter.alignComments(ProfileManager._saveProfileStr(options));
    }
}
