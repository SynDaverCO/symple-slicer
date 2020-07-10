/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
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

/**
 * The SlicerConfiguration class is used for generating settings for the
 * engine.
 */
class SlicerConfiguration {
    constructor(path) {
        var filename = "defaults.json";
        fetchJSON(path + filename, this.onDataReady.bind(this, filename), this.onDataError.bind(this, filename));
    }

    onDataError(filename) {
        console.log("Error: Cannot load", filename);
    }

    onDataReady(filename, json) {
        this.config = json;
        this.onLoaded();
    }

    onValueChanged(key, value) {
    }

    onAttributeChanged(key, attributes) {
    }

    /**
     * Called when all configurations have been loaded and are ready
     */
    onLoaded() {
        console.log("onLoaded called");
    }

    getCommandLineArguments(filenames) {
    }

    /**
     * Returns the attributes associated with a setting for initializing the UI.
     */
    getSettingDescriptor(key) {
        return this.config[key];
    }

    /**
     * This loads the default settings.
     */
    loadDefaults(force) {
    }

    /**
     * Sets a setting to a new value. This will also cause changes to
     * propagate to other settings which might depend on this setting.
     */
    set(key, value) {
    }

    /**
     * Returns the current value of a setting
     */
    get(key) {
    }

    loadProfileStr(attr) {
    }

    saveProfileStr(attr) {
    }
}
