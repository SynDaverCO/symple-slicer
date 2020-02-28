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
 * The CuraConfigurationIterator iterates through a cura definitions file
 * and calls the individual parse methods to do additional work.
 */
class CuraConfigurationIterator {

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

const VALUE_CHANGED  = 1;
const ENABLE_CHANGED = 2;
    
/**
 * The CuraConfiguration class is used for generating settings for the
 * CuraEngine. It parses the Ultimaker supplied "fdmprinter.def.json" and
 * "fdmextruder.def.json" to resolve dependencies among the various
 * settings.
 */
class CuraConfiguration {
    constructor(path) {
        this.resourcesToLoad = 0;
        this.loadCuraJSONDefinitions(path + "fdmprinter.def.json");
        this.loadCuraJSONDefinitions(path + "fdmextruder.def.json");
        this.loadCuraJSONDefinitions(path + "fdmprinter_errata.def.json");

        this.values     = {};
        this.enabled    = {};
        this.nodes      = {};
        this.var_regex  = {};
    }
    
    /**
     * Called when all configurations have been loaded and are ready
     */
    onLoaded() {
    }

    /**
     * This function loads a Cura structured definition file.
     */
    loadCuraJSONDefinitions(filename) {
        this.resourcesToLoad++;
        fetchJSON(filename,  this.onDataReady.bind(this), this.onDataError.bind(this, filename));
    }

    onDataError(filename) {
        console.log("Error: Cannot load", filename);
    }

    /**
     * This function is called to process the JSON file once it is loaded.
     */
    onDataReady(json) {
        // First pass: Populate the values with the defaults and fill in the node lookup table.

        var cfg = new CuraConfigurationIterator();
        cfg.parseNode = (key, node) => {
            this.nodes[key]  = node;
            this.values[key] = node.default_value;
            this.enabled[key] = false;
        };
        cfg.parse(json);

        // Second pass: Verify that all expressions can be executed

        var preprocessSetting = this.evaluatePythonExpression.bind(this);

        var cfg = new CuraConfigurationIterator();
        cfg.parseNode = (key, node) => {
            this.var_regex[key] = new RegExp('\\b' + key + '\\b');
        }

        cfg.parseValue   = preprocessSetting;
        cfg.parseResolve = preprocessSetting;
        cfg.parseEnabled = preprocessSetting;
        cfg.parseMinVal  = preprocessSetting;
        cfg.parseMaxWarn = preprocessSetting;
        cfg.parseMinWarn = preprocessSetting;
        cfg.parse(json);

        if(--this.resourcesToLoad == 0) {
            console.log("All resources loaded");
            this.onLoaded();
        }
    }

    getCommandLineArguments(filenames) {
        var arg_list = [];
        arg_list.push("slice");
        arg_list.push("-v");
        for(const [key, value] of Object.entries(this.values)) {
            arg_list.push("-s");
            arg_list.push(key + '=' + value + '');
        }
        for(const f of filenames) {
            arg_list.push("-l");
            arg_list.push(f);
        }
        arg_list.push("-o");
        arg_list.push("output.gcode");
        return arg_list;
    }

    /**
     * Returns the attributes associated with a setting for initializing the UI.
     */
    getSettingDescriptor(key) {
        return this.nodes[key];
    }

    /**
     * This loads the default settings.
     */
    loadDefaults(force) {
        // Settings propagation may be modify a setting multiple
        // times, so log unique changes for postprocessing. 
        var affectedSettings = {};
        for(const [key, node] of Object.entries(this.nodes)) {
            if(node.hasOwnProperty('default_value') && (force || this.values[key] != node.default_value)) {
                this.values[key] = node.default_value;
                affectedSettings[key] = VALUE_CHANGED;
            }
        }
        for(const key of Object.keys(this.nodes)) {
            this.propagateChanges(key, [], affectedSettings);
        }
        this.postProcessAffectedSettings(affectedSettings);
    }

    /**
     * Remove duplicates from a list
     */
    static removeDuplicates(list) {
        return [...new Set(list)]
    }

    /**
     * Dispatch an event if there is a listener. Supported events:
     *
     *   onValueChanged(key, val, indirect) - A setting was changed
     *   onStateChanged(key, enabled)       - The enabled state of a value changed
     */
    dispatchChangeEvent(methodName, key, ...args) {
        var node = this.nodes[key];
        if (node && node.hasOwnProperty(methodName)) {
            node[methodName](key, ...args);
        }
    }

    /**
     * Print summary of affected settings and dispatch indirect change events.
     */
    postProcessAffectedSettings(affectedSettings) {
        for(const key of Object.keys(affectedSettings).sort()) {
            if (affectedSettings[key] & VALUE_CHANGED) {
                var val = this.values[key];
                console.log("--> Changed", key, "to", val);
                this.dispatchChangeEvent('onValueChanged', key, val);
            }
            if (affectedSettings[key] & ENABLE_CHANGED) {
                var enabled = this.enabled[key];
                console.log("-->        ", key, "is now", enabled ? "enabled" : "disabled");
                this.dispatchChangeEvent('onStateChanged', key, enabled);
            }
        }
    }

    /**
     * Sets one or more settings to new values. This will also
     * propagate to other enabled settings that depend on the
     * settings that just changed.
     */
    setMultiple(settings) {
        var excluding = Object.keys(settings).sort();
        // Settings propagation may be modify a setting multiple
        // times, so log unique changes for postprocessing. 
        var affectedSettings = {};
        for(const key of excluding) {
            var val = settings[key];
            if(this.values[key] != val) {
                this.values[key] = val;
                this.propagateChanges(key, excluding, affectedSettings);
                console.log("Changed", key, "to", val);
                this.dispatchChangeEvent('onValueChanged', key, val);
            }
        }
        this.postProcessAffectedSettings(affectedSettings);
    }

    /**
     * Sets a setting to a new value. This will also cause changes to
     * propagate to other settings which might depend on this setting.
     */
    set(key, value) {
        var settings = {};
        settings[key] = value;
        this.setMultiple(settings);
    }
    
    /**
     * Returns the current value of a setting
     */
    get(key) {
        if(this.values.hasOwnProperty(key)) {
            return this.values[key];
        } else {
            console.log("Error: Attempt to use", key, "which is undefined");
            return 0;
        }
    }

    /**
     * Recomputes the value of all settings which depend on the key, except those
     * in the exclusion list. Returns an object with bits indicating what changes
     * happened.
     */
    propagateChanges(key, excluding, changes) {
        changes = changes || {};
        this.getDependents(key).forEach(
            dependent => {
                if(excluding.indexOf(dependent) == -1) {
                    var whatChanged = this.recomputeValue(dependent);
                    changes[dependent] = (changes[dependent] || 0) | whatChanged;
                    if(whatChanged) {
                        this.propagateChanges(dependent, excluding, changes);
                    }
                }
            }
        );
        return changes;
    }

    /**
     * Recomputes the value of a setting, returns bitflags representing which attributes changed.
     */
    recomputeValue(key) {
        var node = this.nodes[key];
        var val  = node.hasOwnProperty('resolve') ? this.evaluatePythonExpression(key, node.resolve) :
                   node.hasOwnProperty('value')   ? this.evaluatePythonExpression(key, node.value) :
                   node.default_value;
        var en   = node.hasOwnProperty('enabled') ? this.evaluatePythonExpression(key, node.enabled) : true;
        var changed = 0;
        if (this.values[key]  != val) {changed |= VALUE_CHANGED;  this.values[key] = val;}
        if (this.enabled[key] != en)  {changed |= ENABLE_CHANGED; this.enabled[key] = en;}
        return changed;
    }

    /**
     * Checks to see if a setting is enabled.
     */
    isEnabled(key) {
        return this.enabled[key];
    }

    /**
     * Return a list of all settings that directly affect a setting
     */
    getDependencies(setting) {
        var node = this.nodes[setting], dependencies = [];

        function findDependencies(string) {
            for (const [key, regex] of Object.entries(this.var_regex))
                if(expr.search(regex) != -1)
                    dependencies.push(key);
        }

        if(node.hasOwnProperty('value'))   findDependencies(nodes.value);
        if(node.hasOwnProperty('resolve')) findDependencies(nodes.resolve);
        if(node.hasOwnProperty('enabled')) findDependencies(nodes.enabled);

        return CuraConfiguration.removeDuplicates(dependencies);
    }

    /**
     * Return a list of all settings that this setting directly affects
     */
    getDependents(setting) {
        var dependents = [];
        var regex = this.var_regex[setting];

        function findDependents(key, node, prop) {
            if(node.hasOwnProperty(prop) && typeof node[prop] === 'string' && node[prop].search(regex) != -1)
                dependents.push(key);
        }

        for(const [key, node] of Object.entries(this.nodes)) {
            findDependents(key, node, 'value');
            findDependents(key, node, 'resolve');
            findDependents(key, node, 'enabled');
        }

        return CuraConfiguration.removeDuplicates(dependents);
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

        // Replace Python operators with equivalent Javascript
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
    evaluatePythonExpression(key, expr) {

        if(typeof expr !== 'string')
            return expr;

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
            sum:                     (list)       => list.reduce((total, num) => total + num),
            any:                     (list)       => list.reduce((total, num) => total || num),
            all:                     (list)       => list.reduce((total, num) => total && num),
            len:                     (list)       => list.length,
            False:                   false,
            True:                    true,

            // Function defined in Cura:
            extruderValue:           (e, val)     => this.get(val),
            extruderValues:          (val)        => [this.get(val)],
            resolveOrValue:          (val)        => this.get(val),
            defaultExtruderPosition: ()           => 0
        };

        try {
            var f = new Function('obj', 'funcs', 'with(funcs) with(obj) return ' + expr);
            return f(this.values, pythonFunctions);
        } catch(err) {
            console.log("Unable to evaluate expression for", key, ": ", expr, " Error: ", err.message);
            return 0;
        }
    }

    /**
     * Loads a specific print profile. These profiles are stored as TOML files.
     */
    loadProfile(type, filename) {
        var filename = "config/" + type + "_profiles/" + filename;
        fetchText(filename,
            data => {
                var config = toml.parse(data);
                this.setMultiple(config.settings);
            },
            () => console.log("Unable to load", filename)
        );
    }
}

