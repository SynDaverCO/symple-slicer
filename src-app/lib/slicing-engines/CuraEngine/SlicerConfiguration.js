/**
 * WebSlicer
 * Copyright (C) 2020  SynDaver Labs, Inc.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

/**
 * The ConfigurationIterator iterates through a cura definitions file
 * and calls the individual parse methods to do additional work.
 */
class ConfigurationIterator {

    parseNode         (key, node)            {}
    parseCategory     (key, category, depth) {}
    parseValue        (key, expr)            {}
    parseEnabled      (key, expr)            {}
    parseResolve      (key, expr)            {}
    parseDefaultValue (key, value)           {}
    parseMinVal       (key, value)           {}
    parseMinWarn      (key, value)           {}
    parseMaxWarn      (key, value)           {}

    parseOption(key, option, depth) {
        this.parseNode(key, option);
        if(option.hasOwnProperty("value"))
            this.parseValue(key, option.value);
        if(option.hasOwnProperty("enabled"))
            this.parseEnabled(key, option.enabled);
        if(option.hasOwnProperty("resolve"))
            this.parseResolve(key, option.resolve);
        if(option.hasOwnProperty("minimum_value"))
            this.parseMinVal(key, option.minimum_value);
        if(option.hasOwnProperty("minimum_value_warning"))
            this.parseMinWarn(key, option.minimum_value_warning);
        if(option.hasOwnProperty("maximum_value_warning"))
            this.parseMaxWarn(key, option.maximum_value_warning);
        this.parseDefaultValue(key, option.default_value);
    }

    parseChildren(json, depth) {
        depth = (depth || 0) + 1;
        for (const [key, value] of Object.entries(json)) {
            if(value.type == "category")
                this.parseCategory(key, value, depth);
            else
                this.parseOption(key, value, depth);
            if(value.hasOwnProperty("children"))
                this.parseChildren(value.children, depth);
        }
    }

    parse(json) {
        this.parseChildren(json.settings);
    }
}

/**
 * The SlicerConfiguration class is used for generating settings for the
 * CuraEngine. It parses the Ultimaker supplied "fdmprinter.def.json" and
 * "fdmextruder.def.json" to resolve dependencies among the various
 * settings.
 */
class SlicerConfiguration {
    constructor(path) {
        this.defs       = new CuraDefinitions(path);
        this.defs.onLoaded = () => {
            this.settings.postLoad();
            this.onLoaded();
        }
        this.clear();
    }

    clear() {
        this.hash = new CuraMultiHash();
        this.settings = new CuraSettings(this.defs, this.hash);
        this.settings.onLoaded = () => {this.onLoaded();}
        this.settings.onSettingsChanged = this.processSettingsChanged.bind(this);
    }

    isMultipleValues(key) {
        return (this.defs.getProperty(key, "settable_per_extruder") || this.defs.getProperty(key, "settable_per_mesh")) &&
               (!this.defs.hasProperty(key,"limit_to_extruder") || this.settings.evaluateProperty(key, 'limit_to_extruder') < 0);
    }

    processSettingsChanged(key) {
        const nExtruders = this.hash.length;
        let values, enabled, resolved, changed, invalid;

        if(this.isMultipleValues(key)) {
            values = this.settings.getValueList(key);
            enabled = this.hash.getFlagList(key, CuraHash.ENABLED_FLAG);
            changed = this.hash.getFlagList(key, CuraHash.CHANGED_FLAG);
            invalid = this.hash.getFlagList(key, CuraHash.INVALID_FLAG);
            resolved = Array(nExtruders).fill(false);
        } else {
            const whichExtruder = this.defs.hasProperty(key, 'limit_to_extruder') ? this.settings.evaluateProperty(key, 'limit_to_extruder') : 0;
            const allEqual = this.hash.equalOnAllExtruders(key);
            const canResolve = this.defs.hasProperty(key, 'resolve');
            const cantResolve  = !allEqual && !canResolve;
            values   = Array(nExtruders).fill(this.settings.resolveValue(key));
            enabled  = Array(nExtruders).fill(false);
            changed  = Array(nExtruders).fill(false);
            invalid  = Array(nExtruders).fill(false);
            resolved = Array(nExtruders).fill(!allEqual && canResolve);
            enabled[whichExtruder] = this.hash.getFlagList(key, CuraHash.ENABLED_FLAG)[whichExtruder];
            changed[whichExtruder] = this.hash.getFlagList(key, CuraHash.CHANGED_FLAG)[whichExtruder];
            invalid[whichExtruder] = this.hash.getFlagList(key, CuraHash.INVALID_FLAG)[whichExtruder] || cantResolve;
        }
        this.onSettingsChanged(key, {values, enabled, resolved, changed, invalid});
    }

    onSettingsChanged(key, attr) {
    }

    /**
     * Called when all configurations have been loaded and are ready
     */
    onLoaded() {
    }

    getCommandLineArguments(models) {
        return CuraCommandLine.buildCommandLine(this.settings, models);
    }

    /**
     * Returns the attributes associated with a setting for initializing the UI.
     */
    getSettingDescriptor(key) {
        return this.defs.getDescriptor(key);
    }

    /**
     * This loads the default settings. If alwaysNotify is true, the change
     * callbacks will be triggered even if a particular setting did not change.
     */
    loadDefaults(alwaysNotify) {
        this.clear();
        this.settings.loadDefaults(alwaysNotify);
    }

    /**
     * Forces all callbacks to be triggered as if all settings were changed.
     */
    forceRefresh() {
        this.settings.forceRefresh();
    }

    /**
     * Sets one or more settings to new values. This will also
     * propagate to other enabled settings that depend on the
     * settings that just changed.
     */
    setMultiple(settings, extruder = 0) {
        this.hash.setExtruder(extruder);
        this.settings.setMultiple(settings);
    }

    /**
     * Sets a setting to a new value. This will also cause changes to
     * propagate to other settings which might depend on this setting.
     */
    set(key, value, extruder = 0) {
        if(isNaN(value)) {
            return this.unset(key, extruder);
        }
        if(this.isMultipleValues(key)) {
            const settings = {};
            settings[key] = value;
            this.hash.setExtruder(extruder);
            this.settings.setMultiple(settings);
        } else {
            this.settings.setAcross(key, value);
        }
    }

    unset(key, extruder = 0) {
        if(this.isMultipleValues(key)) {
            this.hash.setExtruder(extruder);
            this.settings.unset(key);
        } else {
            this.settings.unsetAcross(key);
        }
    }

    /**
     * Returns the current value of a setting
     */
    get(key, extruder = 0) {
        this.hash.setExtruder(extruder);
        return this.hash.get(key);
    }

    saveSettings(writer, options) {
        this.settings.saveSettings(writer, options);
    }

    loadSettings(settings, options) {
        this.settings.loadSettings(settings, options);
    }
}

class CuraHash {
    constructor() {
        this.values     = {};
        this.flags      = {};
    }

    throwIfMissing(key) {
        if(!this.values.hasOwnProperty(key)) {
            //throw "Error: Attempt to use " + key + " which is undefined"
            console.warn("Error: Attempt to use " + key + " which is undefined");
            return 0;
        } else {
            return this.values[key];
        }
    }

    // Sets a value, returns true if the value was changed.
    set(key, value) {
        if(this.values.hasOwnProperty(key) && this.values[key] === value) {
            return false;
        }
        this.values[key] = value;
        return true;
    }

    get(key) {
        this.throwIfMissing(key);
        return this.values[key];
    }

    has(key) {
        return this.values.hasOwnProperty(key);
    }

    hasFlag(key, bit) {
        this.throwIfMissing(key);
        return !!(this.flags[key] & bit);
    }

    setFlag(key, bit) {
        if(!this.flags.hasOwnProperty(key)) {
            this.flags[key] = bit;
            return true;
        }
        if(this.flags[key] & bit) return false;
        this.flags[key] |= bit;
        return true;
    }

    clearFlag(key, bit) {
        if(!this.flags.hasOwnProperty(key)) {
            this.flags[key] = 0;
            return true;
        }
        if(!(this.flags[key] & bit)) return false;
        this.flags[key] &= ~bit;
        return true;
    }

    clone() {
        const clone = new CuraHash();
        clone.values = Object.assign({}, this.values);
        clone.flags = Object.assign({}, this.flags);
        return clone;
    }
}

// Static constants

CuraHash.ENABLED_FLAG  = 1; // Set if a value is enabled in the UI
CuraHash.CHANGED_FLAG  = 2; // Set if a value was changed from the default
CuraHash.INVALID_FLAG  = 4; // Set if a value is in an error state
CuraHash.MUST_NOTIFY   = 8; // Set if the setting was changed, but a notification has not yet been sent

class CuraMultiHash {
    constructor() {
        this.clear();
    }

    clear() {
        this.extruders      = [new CuraHash()];
        this.activeExtruder = 0;
    }

    setExtruder(extruder) {
        if(extruder >= this.extruders.length) {
            console.error("Cannot select extruder", extruder);
        }
        this.activeExtruder = extruder;
    }

    // Clones the first extruder so we have a new one in the hash
    duplicateExtruder() {
        this.activeExtruder = this.extruders.push(this.extruders[this.activeExtruder].clone()) - 1;
    }

    set(key, value) {
        return this.extruders[this.activeExtruder].set(key,value);
    }

    get(key) {
        return this.extruders[this.activeExtruder].get(key);
    }

    has(key) {
        return this.extruders[this.activeExtruder].has(key);
    }

    hasFlag(key, bit) {
        return this.extruders[this.activeExtruder].hasFlag(key, bit);
    }

    setFlag(key, bit) {
        return this.extruders[this.activeExtruder].setFlag(key, bit);
    }

    clearFlag(key, bit) {
        return this.extruders[this.activeExtruder].clearFlag(key, bit);
    }

    equalOnAllExtruders(key) {
        for(var i = 1; i < this.extruders.length; i++) {
            if(JSON.stringify(this.extruders[0].get(key)) != JSON.stringify(this.extruders[i].get(key)))
                return false;
        }
        return true;
    }

    getValueList(key) {
        return this.extruders.map(extruder => extruder.get(key));
    }

    getFlagList(key, bit) {
        return this.extruders.map(extruder => extruder.hasFlag(key, bit));
    }

    get length() {
        return this.extruders.length;
    }
}

class CuraSettings {
    constructor(definitions, hash) {
        this.verbose = false;
        this.defs    = definitions;
        this.hash    = hash;
    }

    onSettingsChanged(key) {
    }

    /**
     * Called when all configurations have been loaded and are ready
     */
    onLoaded() {
    }

    /**
     * This function is called after all JSON files are loaded to
     * initialize the other data structures and to check the expressions
     * for syntax errors.
     */
    postLoad() {
        for(const [key, node] of this.defs.entries()) {
            this.hash.set(key, node.default_value);
        }

        // Do a syntax check on all expressions

        var checkSyntax = (key, node, prop) => {
            if(node.hasOwnProperty(prop)) {
                this.evaluateProperty(key, prop);
            }
        }

        for(const [key, node] of this.defs.entries()) {
            checkSyntax(key, node, "value");
            checkSyntax(key, node, "resolve");
            checkSyntax(key, node, "enabled");
            checkSyntax(key, node, "minimum_value");
            checkSyntax(key, node, "minimum_value_warning");
            checkSyntax(key, node, "maximum_value_warning");
        }

        // WORKAROUND: In CuraEngine 1.4.2, if "support_enable" is specified per extruder, it
        //             will cause an error. This has been reported upstream:
        //             https://github.com/Ultimaker/CuraEngine/issues/1763
        this.defs.setProperty('support_enable', 'settable_per_mesh', false);
    }

    /**
     * Do variable substitutions in start and end gcode
     */
     doVariableSubstitutions(gcode) {
        return gcode.replace(/{\w+}/g, variable => {
            var key = variable.substring(1,variable.length - 1);
            if(this.hash.has(key)) {
                if(this.hash.hasFlag(key,CuraHash.ENABLED_FLAG)) {
                    return this.hash.get(key);
                } else {
                    console.log("Use of not-enabled value in start/end gcode", key);
                }
            } else {
                console.log("Use of undefined value in start/end gcode", key);
                return key;
            }
        });
     }

    /**
     * This loads the default settings.
     */
    loadDefaults() {
        // Set the default values
        for(const [key, node] of this.defs.entries()) {
            if(node.hasOwnProperty('default_value')) {
                this.hash.set(key, node.default_value);
            }
            this.hash.setFlag(key, CuraHash.MUST_NOTIFY);
            this.hash.clearFlag(key, CuraHash.CHANGED_FLAG);
            this.hash.clearFlag(key, CuraHash.INVALID_FLAG);
        }
        // Recompute all values
        for(const key of this.defs.keys().sort()) {
            this.recomputeFlags(key);
            this.recomputeValue(key);
        }
        for(const key of this.defs.keys().sort()) {
            this.propagateChanges(key);
        }
        this.notifyListenersOfChanges();
    }

    /**
     * Causes all settings to be marked as changed and the change callbacks to be called.
     */
    forceRefresh() {
        for(const key of this.defs.keys().sort()) {
            this.hash.setFlag(key, CuraHash.MUST_NOTIFY);
        }
        this.notifyListenersOfChanges();
    }

    /**
     * Print summary of affected settings and dispatch indirect change events.
     */
    notifyListenersOfChanges() {
        for(const key of this.defs.keys()) {
            if (this.hash.hasFlag(key, CuraHash.MUST_NOTIFY)) {
                const val = this.hash.get(key);
                if(this.verbose)
                    console.log("--> Changed", key, "to", val);
                this.hash.clearFlag(key, CuraHash.MUST_NOTIFY);
                this.onSettingsChanged(key);
            }
        }
    }

    /**
     * Sets a setting across all extruders. This is done
     * in such a way that it introduces no inconsitencies
     * during propagation.
     */
    setAcross(key, value) {
        // ...first change values
        for(var e = 0; e < this.hash.length; e++) {
            this.hash.setExtruder(e);
            this.hash.setFlag(key, CuraHash.CHANGED_FLAG);
            if(this.hash.set(key, value)) {
                this.hash.setFlag(key, CuraHash.MUST_NOTIFY);
            }
        }
        // ...now propagate changes
        for(var e = 0; e < this.hash.length; e++) {
            this.hash.setExtruder(e);
            this.propagateChanges(key);
        }
        // ...finally notify listeners.
        for(var e = 0; e < this.hash.length; e++) {
            this.hash.setExtruder(e);
            this.notifyListenersOfChanges();
        }
    }

    _unsetKey(key) {
        if(this.defs.hasProperty(key, 'value')) {
            return this.recomputeValue(key);
        }
        else if(this.defs.hasProperty(key, 'default_value')) {
            return this.hash.set(key, this.defs.getProperty(key,'default_value'));
        }
        return false;
    }

    /**
     * Restores to default a setting across all extruders.
     * This is done in such a way that it introduces no
     * inconsitencies during propagation.
     */
    unsetAcross(key) {
        // ...first change values
        for(var e = 0; e < this.hash.length; e++) {
            this.hash.setExtruder(e);
            this.hash.clearFlag(key, CuraHash.CHANGED_FLAG);
            this._unsetKey(key);
            this.hash.setFlag(key, CuraHash.MUST_NOTIFY);
        }
        // ...now propagate changes
        for(var e = 0; e < this.hash.length; e++) {
            this.hash.setExtruder(e);
            this.propagateChanges(key);
        }
        // ...finally notify listeners.
        for(var e = 0; e < this.hash.length; e++) {
            this.hash.setExtruder(e);
            this.notifyListenersOfChanges();
        }
    }

    /**
     * Restore a setting to the defaults
     */
    unset(key) {
        this.hash.clearFlag(key, CuraHash.CHANGED_FLAG);
        this.hash.setFlag(key, CuraHash.MUST_NOTIFY);
        if(this._unsetKey(key)) {
            this.propagateChanges(key);
        }
        this.notifyListenersOfChanges();
    }

    /**
     * Sets one or more settings to new values. This will also
     * propagate to other enabled settings that depend on the
     * settings that just changed.
     */
    setMultiple(settings) {
        for(const key of Object.keys(settings)) {
            this.hash.setFlag(key, CuraHash.CHANGED_FLAG);
        }
        // Settings propagation may be modify a setting multiple
        // times, so log unique changes for postprocessing.
        for(const [key, val] of Object.entries(settings)) {
            if(this.hash.set(key, val)) {
                this.hash.setFlag(key, CuraHash.MUST_NOTIFY);
                this.propagateChanges(key);
            }
        }
        this.notifyListenersOfChanges();
    }

    /**
     * Recomputes the value of all settings which depend on the key, except those
     * marked as CHANGED_FLAG.
     */
    propagateChanges(key) {
        this.defs.getDependents(key).forEach(
            dependent => {
                if(dependent == key) return; // Prevent self-reference
                const excluded = this.hash.hasFlag(dependent, CuraHash.CHANGED_FLAG);
                const changedValue = (!excluded) && this.recomputeValue(dependent);
                const changedFlag  = this.recomputeFlags(dependent);
                if(changedValue || changedFlag) {
                    this.propagateChanges(dependent);
                }
                this.hash.setFlag(dependent, CuraHash.MUST_NOTIFY);
            }
        );
    }

    getValueList(key) {
        return this.hash.getValueList(key);
    }

    get(key) {
        return this.hash.get(key);
    }

    resolveValue(key) {
        if(this.hash.equalOnAllExtruders(key)) {
            return this.hash.get(key);
        } else if(this.defs.hasProperty(key, 'resolve')) {
            return this.evaluateProperty(key, 'resolve');
        } else {
            console.warn("No formula to resolve", key, "from", this.hash.getValueList(key));
            return this.hash.get(key);
        }
    }

    /**
     * Recomputes the value of a setting
     */
    recomputeValue(key) {
        const val  = this.defs.hasProperty(key, 'value')   ? this.evaluateProperty(key, 'value') :
                     this.defs.hasProperty(key, 'resolve') ? this.evaluateProperty(key, 'resolve') :
                     this.hash.get(key);
        return this.hash.set(key, val);
    }

    /**
     * Recomputes the flags of a setting, returns "affected" with updated bits.
     */
    recomputeFlags(key) {
        const en  = this.defs.hasProperty(key, 'enabled') ? this.evaluateProperty(key, 'enabled') : true;
        return en ? this.hash.setFlag(  key, CuraHash.ENABLED_FLAG)
                  : this.hash.clearFlag(key, CuraHash.ENABLED_FLAG);
    }

    /**
     * Evaluates a property with a local context
     */
    evaluateProperty(key, property) {
        const expr = this.defs.getProperty(key, property);
        try {
            return this.defs.evaluatePythonExpression(this, expr);
        } catch(err) {
            console.warn("Unable to evaluate", property, "for", key, ":", expr, "Error:", err.message);
            return 0;
        }
    }

    /**
     * Save all the settings into a writer object
     *
     * Attributes:
     *   unchanged    - Whether to include unchanged settings in the config file
     *   descriptions - Whether to annotate the file with descriptions
     *   choices      - Whether to annotate the file with units and choices
     */
    saveSettings(writer, attr) {
        function writeSetting(defs, hash, key) {
            const value   = hash.get(key);
            const uncommented = hash.hasFlag(key, CuraHash.CHANGED_FLAG);

            if(!uncommented && attr && !attr.unchanged)
                return;

            if(typeof(value) === "undefined" || value === null) {
                console.error("Found null or undefined setting while exporting TOML", key);
                return;
            }

            // Generate the comments

            let comments = "";

            if(attr && attr.choices) {
                if(defs.hasProperty(key,"unit")) {
                    comments = defs.nodes[key].unit;
                }
                if(defs.hasProperty(key,"options")) {
                    comments = Object.keys(defs.getProperty(key,'options')).join(", ");
                }
            }

            if(attr && attr.descriptions) {
                if(comments) {
                    comments = "(" + comments + ") ";
                }
                if(defs.hasProperty(key,"description")) {
                    comments += defs.getProperty(key,'description').replace("\n"," ");
                }
            }

            writer.writeValue(key, value, comments, uncommented);
        }

        // Write the settings which are equal on all extruders

        writer.writeCategory("settings");
        const extruder_settings = [];
        const keys = this.defs.keys().sort();
        this.hash.setExtruder(0);
        for(const key of keys) {
            if(this.hash.equalOnAllExtruders(key)) {
                writeSetting(this.defs, this.hash, key);
            } else {
                extruder_settings.push(key);
            }
        }

        // Write the settings which are different on extruders

        for(var e = 0; e < this.hash.length; e++) {
            writer.writeCategory("settings.extruder_" + e);
            this.hash.setExtruder(e);
            for(const key of extruder_settings) {
                writeSetting(this.defs, this.hash, key);
            }
        }
    }

    setExtruder(extruder) {
        // We might be selecting an extruder that has not been allocated
        // if that is the case, allocate it with the defaults now.
        while(extruder >= this.hash.length) {
            this.hash.duplicateExtruder();
            this.loadDefaults();
        }
        this.hash.setExtruder(extruder);
    }

    loadSettings(settings, options) {
        if(options && options.hasOwnProperty("extruder")) {
            this.setExtruder(options.extruder);
            this.setMultiple(settings);
        } else {
            this.setExtruder(0);
            this.setMultiple(settings);

            // Load configuration for specific extruders, if it exists
            for(var e = 0;; e++) {
                const prop = "extruder_" + e;
                if(!settings.hasOwnProperty(prop)) break;
                this.setExtruder(e);
                this.setMultiple(settings[prop]);
            }
        }
    }
}

/**
 * The CuraDefinitions object is responsible for reading the Cura json files and
 * interpreting the rules.
 */
class CuraDefinitions {
    constructor(path) {
        this.nodes      = {};
        this.var_regex  = {};

        if(path) {
            this.loadCuraJSONDefinitions([
                path + "fdmprinter.def.json",
                path + "fdmextruder.def.json",
                path + "fdmprinter_errata.def.json",
                path + "fdmprinter_extras.def.json"
            ]);
        }
    }

    /**
     * Called when all configurations have been loaded and are ready
     */
    onLoaded() {
    }

    loadSingleJSONDefinition(json) {
        this.configsToLoad = ["f1"];
        this.onDataReady("f1", json);
    }

    /**
     * This function initiates the download of one of more Cura structured
     * definition file. As each file is loaded, onDataReady is called.
     */
    loadCuraJSONDefinitions(fileList) {
        this.configsToLoad = fileList;
        for(const filename of fileList) {
            fetchJSON(filename)
            .then(json => this.onDataReady(filename, json))
            .catch(error => {alert(error); throw error});
        }
    }

    /**
     * This function is called for each definition file as it is loaded.
     *
     */
    onDataReady(filename, json) {
        // Replace the filename with the actual JSON data.
        this.configsToLoad[this.configsToLoad.indexOf(filename)] = json;
        // As long as there are filenames in the array, we are not done yet.
        if(this.configsToLoad.findIndex(x => typeof x === "string") != -1) {
            return;
        }
        // If we make it this far, all configuration files are finished
        // loading and we can process them in order.
        for(const config of this.configsToLoad) {
            this.processJSON(config);
        }
        console.log("All resources loaded");
        for(const [key, node] of Object.entries(this.nodes)) {
            this.var_regex[key] = new RegExp('\\b' + key + '\\b');
        }
        this.onLoaded();
    }

    /**
     * This function is called to process each JSON files and
     * build up the configuration data structures.
     */
    processJSON(json) {
        var copyProperty = (key, to, from, prop) => {
            if(from.hasOwnProperty(prop)) {
                if(from[prop] == null && to.hasOwnProperty(prop)) {
                    if(this.verbose) {
                        console.log("Deleting", prop, "of", key);
                    }
                    delete to[prop];
                } else {
                    if(this.verbose && to.hasOwnProperty(prop)) {
                        console.log("Overriding", prop, "of", key);
                    }
                    to[prop] = from[prop];
                }
            }
        }

        var cfg = new ConfigurationIterator();
        cfg.parseNode = (key, node) => {
            var dest = this.nodes.hasOwnProperty(key) ? this.nodes[key] : {};
            copyProperty(key, dest, node, "label");
            copyProperty(key, dest, node, "description");
            copyProperty(key, dest, node, "default_value");
            copyProperty(key, dest, node, "minimum_value");
            copyProperty(key, dest, node, "minimum_value_warning");
            copyProperty(key, dest, node, "maximum_value_warning");
            copyProperty(key, dest, node, "settable_per_extruder");
            copyProperty(key, dest, node, "settable_per_mesh");
            copyProperty(key, dest, node, "settable_globally");
            copyProperty(key, dest, node, "limit_to_extruder");
            copyProperty(key, dest, node, "value");
            copyProperty(key, dest, node, "resolve");
            copyProperty(key, dest, node, "unit");
            copyProperty(key, dest, node, "type");
            copyProperty(key, dest, node, "options");
            copyProperty(key, dest, node, "enabled");
            this.nodes[key] = dest;
        };
        cfg.parse(json);
    }

    entries() {
        return Object.entries(this.nodes);
    }

    keys() {
        return Object.keys(this.nodes);
    }

    /**
     * Remove duplicates from a list
     */
    static removeDuplicates(list) {
        return [...new Set(list)]
    }

    /**
     * Returns a Set of all settings that affect a string expression
     */
    getExpressionDependencies(expr, dependencies = new Set()) {
        for (const [key, regex] of Object.entries(this.var_regex))
            if(expr.search(regex) != -1)
                    dependencies.add(key);
        return dependencies;
    }

    /**
     * Return a list of all settings that directly affect a setting
     */
    getDependencies(setting) {
        const node = this.nodes[setting], dependencies = new Set();
        if(node.hasOwnProperty('value'))   this.getExpressionDependencies(node.value, dependencies);
        if(node.hasOwnProperty('resolve')) this.getExpressionDependencies(node.resolve, dependencies);
        if(node.hasOwnProperty('enabled')) this.getExpressionDependencies(node.enabled, dependencies);
        if(node.hasOwnProperty('limit_to_extruder')) this.getExpressionDependencies(node.limit_to_extruder, dependencies);
        return dependencies;
    }

    /**
     * Return a list of all settings that this setting directly affects
     */
    getDependents(setting) {
        const dependents = new Set();
        for(const key of Object.keys(this.nodes)) {
            if(this.nodeDependsOn(key, setting, 'value'))   dependents.add(key);
            if(this.nodeDependsOn(key, setting, 'resolve')) dependents.add(key);
            if(this.nodeDependsOn(key, setting, 'enabled')) dependents.add(key);
            if(this.nodeDependsOn(key, setting, 'limit_to_extruder')) dependents.add(key);
        }
        return dependents;
    }

    /**
     * Returns true if a thisSetting's property depends on anotherSetting
     */

     nodeDependsOn(thisSetting, anotherSetting, prop) {
         const node = this.nodes[thisSetting];
         return node.hasOwnProperty(prop) && typeof node[prop] === 'string' && node[prop].search(this.var_regex[anotherSetting]) != -1;
     }

    /**
     * Takes a string and breaks out any parenthesis/braces/brackets into separate strings.
     * Returns an array containing the first string with placeholders, followed by the
     * individual subexpressions.
     *
     * Example:
     *
     *   unpackSubexpressions("true if (a == (2 *c)) else [1,2,3]")
     *
     * becomes:
     *
     *   ["true if expr_1 else expr_2", "(a == (2 *c))", "[1,2,3]"]
     */
    unpackSubexpressions(expr) {
        var depth = 0, last = 0, result = [""], finalAction = pushTemplate;

        // Adds a chunk to result[0]
        function pushTemplate() {
            result[0] += expr.slice(last, i);
            last = i;
            finalAction = pushSubexpression;
        }

        // Adds a placeholder to result[0] and appends the subexpression.
        function pushSubexpression() {
            result[0] += " expr_" + result.length + " "; // Placeholder
            result.push(expr.slice(last, i + 1));        // Subexpression
            last = i + 1;
            finalAction = pushTemplate;
        }

        for(var i = 0; i < expr.length; i++) {
            switch(expr.charAt(i)) {
                case '(':
                case '[':
                case '{':
                    if(++depth == 1) pushTemplate();
                    break;
                case ')':
                case ']':
                case '}':
                    if(--depth == 0) pushSubexpression();
                    break;
            }
        }
        finalAction();
        return result;
    }

    /**
      * This reverses the operation performed by unpackSubexpressions
      */
    packSubexpressions(subexpressions) {
        var result = subexpressions[0];
        for(var i = 1; i < subexpressions.length; i++) {
            result = result.replace(" expr_" + i + " ", subexpressions[i]);
        }
        return result;
    }

    /**
     * Translates a Python expression into the equivalent JavaScript expression
     */
    translatePythonExpression(expr) {
        if(typeof expr !== 'string')
            return expr;

        // In order to handle parenthesis, break the string up into subexpressions.
        var subexpressions = this.unpackSubexpressions(expr);
        var expr = subexpressions[0];

        /**
         * Special handling for things that look like:
         *    infill_pattern not in ('concentric', 'cross', 'cross_3d', 'gyroid', 'lightning')
         *    infill_pattern not in ['concentric', 'cross', 'cross_3d', 'gyroid', 'lightning']
         */
        function fixInStatement(m, lhs, not, expr) {
            let i = parseInt(expr.substring(5)); // Find the associated subexpression
            subexpressions[i] = subexpressions[i].replace(/\((.*)\)/,"[$1]") // Replace parents with square parens
            return not + " " + expr + " .includes(" + lhs + ")";
        }

        // Replace Python operators with equivalent Javascript
        expr = expr.replace(/(\w+)\s+(not)\s+in\s+(expr_\d+ )/g, fixInStatement);
        expr = expr.replace(/([^(]*?) if (.*?) else /g, "$2 ? $1 : ");
        expr = expr.replace(/\bor\b/g,   "||");
        expr = expr.replace(/\band\b/g,  "&&");
        expr = expr.replace(/\bnot\b/g,  "!");
        expr = expr.replace(/\b\w+\b != '(\w+)' for \w+ in extruderValues (\w+) /g, "extruderValues $2 .map(p => p != '$1')");

        subexpressions[0] = expr;

        // Recurse on subexpressions
        for(var i = 1; i < subexpressions.length; i++) {
            var subexpr = subexpressions[i];
            subexpressions[i] = subexpr.charAt(0) + this.translatePythonExpression(subexpr.slice(1,subexpr.length-1)) + subexpr.charAt(subexpr.length-1);
        }

        return this.packSubexpressions(subexpressions);
    }

    /**
     * The Cura JSON files contain expressions for computing settings
     * based on the values of other settings. These expressions are
     * written in Python, but we can evaluate them by translating them
     * from Python into JavaScript and executing them with the proper
     * context.
     */
    evaluatePythonExpression(settings, expr) {
        if(typeof expr !== 'string')
            return expr;

        // Build the variable context
        const context = Object.create(null);
        for (const dep of this.getExpressionDependencies(expr)) {
            //if(settings.has(dep)) {
                context[dep] = settings.get(dep);
            //}
        }

        // Handle nested parenthesis

        expr = this.translatePythonExpression(expr);

        var pythonFunctions = {
            // Standard Python functions:
            round:                   Math.round,
            max:                     (...args) => (args.length == 1 && Array.isArray(args[0])) ? Math.max(...args[0]) : Math.max(...args),
            min:                     (...args) => (args.length == 1 && Array.isArray(args[0])) ? Math.min(...args[0]) : Math.min(...args),
            int:                     Math.trunc,
            math: {
                pi:                  Math.PI,
                ceil:                Math.ceil,
                floor:               Math.floor,
                tan:                 Math.tan,
                cos:                 Math.cos,
                sin:                 Math.sin,
                sqrt:                Math.sqrt,
                radians:             deg          => deg / 180 * Math.PI,
                degrees:             rad          => rad / Math.PI * 180
            },
            abs:                     (x)          => Math.abs(x),
            sum:                     (list)       => list.reduce((total, num) => total + num),
            any:                     (list)       => list.reduce((total, num) => total || num),
            all:                     (list)       => list.reduce((total, num) => total && num),
            map:                     (fun,list)   => list.map(fun),
            len:                     (list)       => list.length,
            False:                   false,
            True:                    true,

            // Function defined in Cura:
            extruderValue:           (e, key)     => settings.getValueList(key)[e],
            extruderValues:          (key)        => settings.getValueList(key),
            resolveOrValue:          (key)        => settings.resolveValue(key),
            defaultExtruderPosition: ()           => 0
        };

        const f = new Function('context', 'funcs', 'with(context) with(funcs) return ' + expr);
        return f(context, pythonFunctions);
    }

    hasProperty(key, property) {
        return this.nodes[key].hasOwnProperty(property);
    }

    getProperty(key, property) {
        return this.nodes[key][property];
    }

    setProperty(key, property, value) {
        this.nodes[key][property] = value;
    }

    getDescriptor(key) {
        return this.nodes[key];
    }

    static asString(type, value) {
        switch(type) {
            case 'str':
            case 'float':
            case 'int':
            case 'enum':
            case 'bool':
            case 'extruder':
            case 'optional_extruder':
                return value.toString();
            case 'polygon':
            case 'polygons':
            case '[int]':
                return JSON.stringify(value);;
                break;
            default:
                console.error("Unsupported type", type);
        }
    }
}

/**
 * The CuraCommandLine object is responsible for building a Cura command line.
 */
class CuraCommandLine {
    static buildCommandLine(settings, models) {
        const stats = {
            changed: 0,
            inactive: 0,
            defaults: 0
        };

        const defs = settings.defs;
        const hash = settings.hash;

        // Grab machine parameters
        hash.setExtruder(0);
        const one_at_a_time = CuraCommandLine.isOneAtATime(hash);
        const origin_at_zero = CuraCommandLine.isMachineCenterAtZero(hash);
        const machine_width = parseInt(hash.get("machine_width"));
        const machine_depth = parseInt(hash.get("machine_depth"));

        // Push global settings
        const arg_list = [];
        arg_list.push("slice");
        arg_list.push("-v");
        arg_list.push("-p");
        arg_list.push("-j");
        arg_list.push("fdmprinter.def.json");

        function appendParameter(key, value) {
            const valType    = defs.getProperty(key, "type")
            const stringVal  = CuraDefinitions.asString(valType, value);
            const defaultVal = CuraDefinitions.asString(valType, defs.getProperty(key, "default_value"));
            if(stringVal == defaultVal) {
                stats.defaults++;
            } else if(!hash.hasFlag(key, CuraHash.ENABLED_FLAG)) {
                stats.inactive++;
            } else {
                arg_list.push("-s");
                arg_list.push(key + '=' + stringVal);
                stats.changed++;
            }
        }

        function appendTransform(key, value) {
            arg_list.push("-s");
            arg_list.push(key + '=' + JSON.stringify(value));
        }

        const extruder_settings = {};
        const keys = defs.keys().sort();
        for(const key of keys) {
            const settable_per_extruder = defs.getProperty(key, "settable_per_extruder") || defs.getProperty(key, "settable_per_mesh");
            const settable_globally     = defs.getProperty(key, "settable_globally") || !settable_per_extruder;
            const all_equal             = hash.equalOnAllExtruders(key);

            if(settable_globally && all_equal) {
                let value = settings.get(key);
                if(key == "machine_start_gcode" || key == "machine_end_gcode") {
                    value = settings.doVariableSubstitutions(value);
                }
                appendParameter(key, value);
            } else if(settable_per_extruder) {
                extruder_settings[key] = settings.getValueList(key);
            } else if(settable_globally) {
                const value = settings.resolveValue(key);
                appendParameter(key, value);
            } else {
                console.error("Cannot apply slicer setting", key);
            }
        }

        arg_list.push("-o");
        arg_list.push("output.gcode");
        
        for(var extruder = 0; extruder < hash.length; extruder++) {
            // Push extruder specific defaults
            arg_list.push("-e" + extruder);
            arg_list.push("-j");
            arg_list.push("fdmextruder.def.json");
        }

        for(var extruder = 0; extruder < hash.length; extruder++) {
            // Push extruder specific settings
            arg_list.push("-e" + extruder);

            for(const [key, values] of Object.entries(extruder_settings)) {
                appendParameter(key, values[extruder]);
            }

            // Push models for the extruder
            for(const m of models) {
                if(m.extruder != extruder)
                    continue;

                if (one_at_a_time) arg_list.push("-g");
                var mesh_rotation_matrix, mesh_position_x, mesh_position_y, mesh_position_z;
                if(m.hasOwnProperty("transform")) {
                    // Decompose the Matrix4 into a rotation matrix and position.
                    // Notice that in THREE.js, the elements array is stored column first,
                    // so we need to transpose it prior to extracting the elements.
                    const [
                        a,b,c,x,
                        d,e,f,y,
                        g,h,i,z
                    ] = m.transform.clone().transpose().elements;
                    mesh_rotation_matrix = [[a,b,c],[d,e,f],[g,h,i]];
                    mesh_position_x      = x;
                    mesh_position_y      = y;
                    mesh_position_z      = z;
                } else {
                    mesh_rotation_matrix = [[1,0,0], [0,1,0], [0,0,1]];
                    mesh_position_x      = 0;
                    mesh_position_y      = 0;
                    mesh_position_z      = 0;
                }
                if(!origin_at_zero) {
                    mesh_position_x      -= machine_width/2;
                    mesh_position_y      -= machine_depth/2;
                }
                appendTransform("mesh_rotation_matrix", mesh_rotation_matrix);
                arg_list.push("-l");
                arg_list.push(m.filename);
                appendTransform("mesh_position_x", mesh_position_x);
                appendTransform("mesh_position_y", mesh_position_y);
                appendTransform("mesh_position_z", mesh_position_z);
                if (one_at_a_time) arg_list.push("--next");
            }
        }

        console.log("Effective slicer parameters:", stats);
        return arg_list;
    }

    static isOneAtATime(settings) {
        return settings.get("print_sequence") == "one_at_a_time";
    }

    static isMachineCenterAtZero(settings) {
        return settings.get("machine_center_is_zero") == "true";
    }
}

// Debugging Methods
var SS = SS || {};
SS.Slicer = SS.Slicer || {};

SS.Slicer.getSetting  = (key, extruder = 0) => slicer.config.hash.extruders[extruder].get(key);
SS.Slicer.getProperty = (key, property, extruder = 0) => {slicer.config.hash.setExtruder(extruder); return slicer.config.settings.evaluateProperty(key, property)};