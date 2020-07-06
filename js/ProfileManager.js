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
    /**
     * The stored profile is saved in the browser's local store
     * and is used to preserve settings across multiple sessions
     */
    static hasStoredProfile() {
        return (typeof(Storage) !== "undefined") && localStorage.getItem("startup_config");
    }

    static loadStoredProfile() {
        if(typeof(Storage) === "undefined") return false;

        var stored_config = localStorage.getItem("startup_config");
        if(!stored_config) return false;

        console.log("Loaded settings from local storage");
        slicer.loadDefaults(true);
        slicer.loadProfileStr(stored_config);
        return true;
   }

    static onUnloadHandler() {
        console.log("Saved setting to local storage");
        localStorage.setItem("startup_config", slicer.saveProfileStr());
    }

    // Populate the pull down menus in the UI with a list of available profiles
    static async populateProfileMenus(printer_menu, material_menu) {
        console.log("Loading profile list");
        if(ProfileManager.hasStoredProfile()) {
            printer_menu.option("Last session settings", {id: "keep"});
            material_menu.option("Last session settings", {id: "keep"});
        }
        const data = await fetchText("config/syndaver/profile_list.toml");
        const config = toml.parse(data);
        for (let [key, value] of Object.entries(config.machine_profiles)) {
            printer_menu.option(value, {id: key});
        }
        for (let [key, value] of Object.entries(config.print_profiles)) {
            material_menu.option(value, {id: key});
        }
    }

    // Apply a selection from the menu
    static async applyPresets(printer = "keep", material = "keep") {
        if(printer !== "keep" && material !== "keep") {
            console.log("Loading slicer defaults");
            slicer.loadDefaults();
        }
        if(printer !== "keep") {
            console.log("Loading printer profile");
            await slicer.loadProfile("machine", printer + ".toml");
        }
        if(material !== "keep") {
            console.log("Loading material profile");
            await slicer.loadProfile("print", material + ".toml");
        }
        console.log("Loaded profiles");
    }

    static importConfiguration(data) {
        slicer.loadDefaults();
        slicer.loadProfileStr(data);
    }

    static exportConfiguration(options) {
        return slicer.saveProfileStr(options);
    }
}