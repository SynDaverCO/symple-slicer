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
    // Clears out any configuration information in the ProfileManager object.
    static _loadDefaults() {
        ProfileManager.profile = {};
    }

    static getSection(section) {
        return ProfileManager.profile[section];
    }

    // Parses a TOML string and loads the profile. Slicer settings are sent to the slicer,
    // while other settings are stored in the ProfileManager object.
    static _loadProfileStr(str, baseUrl) {
        const config = toml.parse(str);

        // Convert any URLs into absolute paths relative to the profile
        function makeAbsolute(path) {
            if(baseUrl && path) {
                return new URL(path, baseUrl).toString();
            }
            return path;
        }

        if(config.usb) {
            config.usb.firmware = makeAbsolute(config.usb.firmware);
        }
        if(config.wireless && config.wireless.uploads) {
            for(const pair of config.wireless.uploads) {
                pair[1] = makeAbsolute(pair[1]);
            }
        }

        // Merge data from the config with data that may already exist in the ProfileManager object
        function mergeSection(section) {
            const src = config[section];
            const dst = ProfileManager.profile[section] || {};
            ProfileManager.profile[section] = Object.assign(dst, src);
        }
        mergeSection("metadata");
        mergeSection("usb");
        mergeSection("wireless");
        mergeSection("scripts");

        // Apply the slicer settings
        if(config.settings) {
            slicer.setMultiple(config.settings);
        }
    }

    // Writes out the current profile as a TOML formatted string
    static _saveProfileStr(options) {
        const toml = new TOMLWriter();
        if(ProfileManager.profile) {
            toml.writeProperties(ProfileManager.profile, ["metadata", "usb", "wireless","scripts"]);
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
        try {
            ProfileManager.importConfiguration(stored_config, true);
        } catch (e) {
            alert("Unable to load profile from last session");
            console.error(e);
            console.log(stored_config);
            return false;
        }
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
        const defaultProfileList = [
            "config/syndaver/profile_list.toml",
            "config/profiles/profile_list.toml"
        ].join('\n');

        let profileList = localStorage.getItem("profile_urls");
        if(profileList) {
            profileList = profileList.trim();
        } else {
            profileList = defaultProfileList;
            localStorage.setItem("profile_urls", defaultProfileList);
        }
        return profileList.split(/\s+/);
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
                console.log("Loading profile list from", baseUrl.toString())
                const data = await fetchText(url);
                const config = toml.parse(data);
                addMenuEntries(baseUrl, config, "machine_profiles", printer_menu);
                addMenuEntries(baseUrl, config, "print_profiles",   material_menu);
            } catch(e) {
                console.warn("Unable to load profiles from", url)
                okay = false
            }
        }
        if(!okay) alert("Unable to load from one or more profile URLs.\nTo correct this problem, adjust \"Advanced Features -> Data Sources\"");
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

ProfileManager.profile = {};
