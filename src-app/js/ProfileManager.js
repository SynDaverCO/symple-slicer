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

function mergeProperties(copyTo, copyFrom, depth = 1) {
    for(const property in copyFrom) {
        if(!copyTo.hasOwnProperty(property) || depth == 0) {
            copyTo[property] = copyFrom[property];
        } else {
            mergeProperties(copyTo[property], copyFrom[property], depth - 1);
        }
    }
}

class ProfileLibrary {
    static getURLs() {
        return localStorage.getItem("profile_urls") || "";
    }

    static setURLs(list) {
        localStorage.setItem("profile_urls", list);
    }

    static addURL(url) {
        let oldList = localStorage.getItem("profile_urls") || "";
        url = url.toString();
        if(oldList.indexOf(url) === -1) {
            oldList += "\n" + url;
            localStorage.setItem("profile_urls", oldList.trim());
        }
    }

    /**
     * Returns a list of URLs to fetch profiles from. By default,
     * only the default profiles, but if "profile_urls"
     * exists in the local storage, add those as well.
     */
    static get urlList() {
        let urls = localStorage.getItem("profile_urls");
        if(!urls) {
            urls = ProfileLibrary.defaultProfileLists.join('\n');
            localStorage.setItem("profile_urls", urls);
        }
        if(query.profiles) {
            // Allow the profiles to be overriden from the query string.
            urls = query.profiles;
        }
        return urls.trim().split(/\s+/);
    }

    /**
     * Fetch all the profile lists from the network and returns a list of profile
     * descriptors with the following fields:
     *
     *   label: A human readable name for the profile
     *   url:   An absolute URL to the profile's resource
     *   type:  The type of profile, from the TOML section heading
     *
     */
    static async fetch() {
        function makeProfileDescriptor(section, key, value, baseUrl, defaults) {
            // Process an abbreviated profile definition
            const desc = Object.assign({
                id:   key,
                name: value,
                type: section
            }, defaults);
            // Process an expanded profile definition
            if(typeof value === "object") {
                desc.name = key;
                for(const prop of ["name", "url", "extruders"].concat(ProfileLibrary.constraints)) {
                    if(value.hasOwnProperty(prop)) {
                        desc[prop] = value[prop];
                    }
                }
            }
            // Fill in defaults
            if(desc.type == "machine_profiles" && !desc.manufacturer) desc.manufacturer = "generic";
            if(desc.type == "print_profiles"   && !desc.brand)        desc.brand        = "generic";
            if(["machine_profiles", "print_profiles"].includes(desc.type) && !desc.url) {
                desc.url = section + "/" + key + ".toml";
            }
            if(desc.type == "print_profiles"   && !desc.brand)        desc.brand        = "generic";
            if(desc.manufacturer == "*") delete desc.manufacturer;
            if(desc.brand == "*")        delete desc.brand;
            if(desc.type == "machine_profiles" && !desc.extruders) desc.extruders = 1;
            // Make URL absolute
            if(desc.url) {
                desc.url = new URL(desc.url, baseUrl).toString();
            }
            return desc;
        }

        const profiles = [];
        let fetchError = false;
        for(const url of ProfileLibrary.urlList) {
            const baseUrl = new URL(url, document.location);
            let data, conf;
            try {
                console.log("Loading profile list from", baseUrl.toString());
                data = await fetchText(baseUrl);
            } catch(e) {
                console.warn("Unable to load profiles from", url)
                console.error(e)
                fetchError = true;
                continue;
            }
            try {
                conf = toml.parse(data);
            } catch(e) {
                alert(e.toString() + "\n\nFile: " + url + "\nLine: " + e.line + "\nColumn: " + e.column);
                console.log(e);
                continue;
            }
            for(const [sectionName, section] of Object.entries(conf)) {
                // Pull out any default constraints from the section
                const defaults = {};
                for(const s of ProfileLibrary.constraints) {
                    if(section.hasOwnProperty(s)) {
                        defaults[s] = section[s];
                        delete section[s];
                    }
                }
                // Process remaining entries
                for (const [key, value] of Object.entries(section)) {
                    profiles.push(makeProfileDescriptor(sectionName, key, value, baseUrl, defaults));
                }
            }
        }
        if(fetchError) alert("Unable to load from one or more profile URLs.\nTo correct this problem, adjust \"Advanced Features -> Data Sources\"");

        ProfileLibrary.profiles = profiles;
        return profiles;
    }

    static getDescriptor(type, id) {
        for(const profile of ProfileLibrary.profiles) {
            if(profile.type === type && profile.id === id) {
                return profile;
            }
        }
        console.error("Unable to find profile", id);
    }

    static getProfiles() {
        return ProfileLibrary.profiles;
    }
}

class ProfileManager {
    static getSection(section) {
        return ProfileManager.profile[section];
    }

    // Parses a TOML string and returns the slicer settings.
    static importConfiguration(str, baseUrl) {
        let config, result;
        try {
            config = toml.parse(str);
        } catch (e) {
            const file = baseUrl ? baseUrl.split("/").pop() : "Saved Profile";
            alert(e.toString() + "\n\nFile: " + baseUrl.split("/").pop() + "\nLine: " + e.line + "\nColumn: " + e.column);
            console.log(e);
            return;
        }

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

        // Grab the slicer settings
        if(config.settings) {
            result = config.settings;
            delete config.settings;
        }

        // Merge data from the config with data that may already exist in the ProfileManager object
        mergeProperties(ProfileManager.profile, config);
        return result;
    }

    // Writes out the current profile as a TOML formatted string
    static _getProfileStr(options) {
        const toml = new TOMLWriter();
        if(ProfileManager.profile) {
            toml.writeProperties(ProfileManager.profile, ["metadata", "based_on", "usb", "wireless", "scripts"]);
        }
        slicer.saveSettings(toml, options);
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
        if(typeof(Storage) === "undefined") return;

        const stored_config = localStorage.getItem("startup_config");
        if(!stored_config) return;

        console.log("Loaded settings from local storage");
        try {
            ProfileManager.clear();
            return ProfileManager.importConfiguration(stored_config);
        } catch (e) {
            alert("Unable to load profile from last session");
            console.error(e);
        }
   }

    static onUnloadHandler() {
        console.log("Saved setting to local storage");
        localStorage.setItem("startup_config", ProfileManager._getProfileStr());
    }

    /**
     * Loads a specific print profile. These profiles are stored as TOML files.
     */
    static async loadPresets(type, value) {
        if(value === "") return;
        const desc = ProfileLibrary.getDescriptor(type, value);
        if(!desc) throw("Unable to locate descriptor for " + type);
        const url = desc.url;
        if(!url) throw("Unable to locate url for " + type);
        const data = await fetchText(url);
        console.log("Loaded", type, " from", url);
        return ProfileManager.importConfiguration(data, url);
    }

    static clear() {
        ProfileManager.profile = {};
    }

    static exportConfiguration(options) {
        return TOMLWriter.alignComments(ProfileManager._getProfileStr(options));
    }

    static setBasedOn(data) {
        ProfileManager.profile.based_on = data;
    }
}

ProfileManager.profile = {};
ProfileLibrary.defaultProfileLists = [
    "config/syndaver/profile_list.toml",
    "config/profiles/profile_list.toml"
];
ProfileLibrary.constraintsMap = {
    "manufacturer" : "machine_manufacturers",
    "machine"      : "machine_profiles",
    "upgrade"      : "machine_upgrades",
    "toolhead"     : "machine_toolheads",
    "brand"        : "material_brands",
    "quality"      : "print_quality"
}
ProfileLibrary.constraints = Object.keys(ProfileLibrary.constraintsMap);