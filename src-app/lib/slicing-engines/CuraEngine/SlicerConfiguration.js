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
        this.verbose    = false;

        this.values     = {};
        this.flags      = {};
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

    onValueChanged(key, value) {
    }
    
    onAttributeChanged(key, attributes) {
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
        this.postprocessJSON();
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

    /**
     * This function is called after all JSON files are loaded to
     * initialize the other data structures and to check the expressions
     * for syntax errors.
     */
    postprocessJSON() {
        for(const [key, node] of Object.entries(this.nodes)) {
            this.var_regex[key] = new RegExp('\\b' + key + '\\b');
            this.values[key]    = node.default_value;
            this.flags[key]     = 0;
        }

        // Do a syntax check on all expressions

        var checkSyntax = (key, node, prop) => {
            if(node.hasOwnProperty(prop)) {
                this.evaluatePythonExpression(key, node[prop]);
            }
        }

        for(const [key, node] of Object.entries(this.nodes)) {
            checkSyntax(key, node, "value");
            checkSyntax(key, node, "resolve");
            checkSyntax(key, node, "enabled");
            checkSyntax(key, node, "minimum_value");
            checkSyntax(key, node, "minimum_value_warning");
            checkSyntax(key, node, "maximum_value_warning");
        }
    }

    getCommandLineArguments(filenames) {
        var arg_list = [];
        arg_list.push("slice");
        arg_list.push("-v");
        for(const [key, value] of Object.entries(this.values)) {
            arg_list.push("-s");
            var str_value;
            switch(typeof value) {
                case "boolean":
                case "object":
                case "number":
                    str_value = value.toString();
                    break;
                case "string":
                    if(key == "machine_start_gcode" || key == "machine_end_gcode") {
                        str_value = this.doVariableSubstitutions(value);
                    } else {
                        str_value = value;
                    }
                    break;
                default:
                    console.log("Warning: Unrecognized type", typeof value, "for", key);
                    str_value = value.toString();
            }
            arg_list.push(key + '=' + str_value);
        }
        arg_list.push("-o");
        arg_list.push("output.gcode");
        for(const f of filenames) {
            if (this.oneAtATime()) arg_list.push("-g");
            arg_list.push("-l");
            arg_list.push(f);
            if (this.oneAtATime()) arg_list.push("--next");
        }
        return arg_list;
    }

    oneAtATime() {
        return this.values.hasOwnProperty("print_sequence") && this.values["print_sequence"] == "one_at_a_time";
    }

    /**
     * Do variable substitutions in start and end gcode
     */
     doVariableSubstitutions(gcode) {
        return gcode.replace(/{\w+}/g, variable => {
            var key = variable.substring(1,variable.length - 1);
            if(this.values.hasOwnProperty(key)) {
                if(this.isEnabled(key)) {
                    return this.values[key];
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
            const previousValue = this.values[key];
            if(node.hasOwnProperty('default_value')) {
                this.values[key] = node.default_value;
            }
            this.recomputeValue(key);
            var affected = force ? SlicerConfiguration.VALUE_AFFECTED | SlicerConfiguration.FLAGS_AFFECTED : 0;
            if(previousValue != this.values[key]) {
                affected |= SlicerConfiguration.VALUE_AFFECTED;
            }
            affectedSettings[key] = this.recomputeFlags(key, affected);
            this.setFlag(key, SlicerConfiguration.CHANGED_FLAG, false);
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
     * Print summary of affected settings and dispatch indirect change events.
     */
    postProcessAffectedSettings(affectedSettings) {
        for(const key of Object.keys(affectedSettings).sort()) {
            if (affectedSettings[key] & SlicerConfiguration.VALUE_AFFECTED) {
                var val = this.values[key];
                if(this.verbose)
                    console.log("--> Changed", key, "to", val);
                this.onValueChanged(key, val);
            }
            if (affectedSettings[key] & SlicerConfiguration.FLAGS_AFFECTED) {
                var enabled = this.isEnabled(key);
                if(this.verbose)
                    console.log("-->        ", key, "is now", enabled ? "enabled" : "disabled");
                this.onAttributeChanged(key, {enabled: enabled});
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
                if(this.verbose)
                    console.log("Changed", key, "to", val);
                this.onValueChanged(key, val);
                this.setFlag(key, SlicerConfiguration.CHANGED_FLAG, true);
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
                var whatChanged = 0;
                if((this.nodeDependsOn(dependent, key, "value") ||
                   this.nodeDependsOn(dependent, key, "resolve")) &&
                   excluding.indexOf(dependent) == -1) {
                    whatChanged = this.recomputeValue(dependent, whatChanged);
                }
                whatChanged = this.recomputeFlags(dependent, whatChanged);
                if(whatChanged) {
                    changes[dependent] = (changes[dependent] || 0) | whatChanged;
                    this.propagateChanges(dependent, excluding, changes);
                }
            }
        );
        return changes;
    }

    /**
     * Recomputes the value of a setting, returns "affected" with updated bits.
     */
    recomputeValue(key, affected) {
        var node = this.nodes[key];
        var val  = node.hasOwnProperty('value')   ? this.evaluatePythonExpression(key, node.value) :
                   node.hasOwnProperty('resolve') ? this.evaluatePythonExpression(key, node.resolve) :
                   this.values[key];
        if (this.values[key]    != val) {affected |= SlicerConfiguration.VALUE_AFFECTED; this.values[key] = val;}
        return affected;
    }
    
    /**
     * Recomputes the flags of a setting, returns "affected" with updated bits.
     */
    recomputeFlags(key, affected) {
        var node = this.nodes[key];
        var en   = node.hasOwnProperty('enabled') ? this.evaluatePythonExpression(key, node.enabled) : true;
        if (this.isEnabled(key) != en)  {affected |= SlicerConfiguration.FLAGS_AFFECTED; this.setFlag(key, SlicerConfiguration.ENABLED_FLAG, en);}
        return affected;
    }

    /**
     * Checks to see if a setting is enabled.
     */
    isEnabled(key) {
        return this.getFlag(key, SlicerConfiguration.ENABLED_FLAG);
    }

    /**
     * Gets the state of a flag for a key
     */
    getFlag(key, bit) {
        return !!(this.flags[key] & bit);
    }

    /**
     * Sets the state of a flag for a key
     */
    setFlag(key, bit, state) {
        this.flags[key] =  (this.flags[key] & ~bit) | (state ? bit : 0);
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

        return SlicerConfiguration.removeDuplicates(dependencies);
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

        return SlicerConfiguration.removeDuplicates(dependents);
    }
    
    /**
     * Returns true if a thisSetting's property depends on anotherSetting
     */

     nodeDependsOn(thisSetting, anotherSetting, prop) {
         var node = this.nodes[thisSetting];
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
            abs:                     (x)          => Math.abs(x),
            sum:                     (list)       => list.reduce((total, num) => total + num),
            any:                     (list)       => list.reduce((total, num) => total || num),
            all:                     (list)       => list.reduce((total, num) => total && num),
            map:                     (fun,list)   => list.map(fun),
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
     * Dumps all the settings into a writer object
     *
     * Attributes:
     *   unchanged    - Whether to include unchanged settings in the config file
     *   descriptions - Whether to annotate the file with descriptions
     *   choices      - Whether to annotate the file with units and choices
     */
    dumpSettings(writer, attr) {
        for(const key of Object.keys(this.nodes).sort()) {
            let value   = this.values[key];
            let enabled = this.getFlag(key, SlicerConfiguration.CHANGED_FLAG);

            if(!enabled && attr && !attr.unchanged) {
                continue;
            }

            // Generate the comments

            let comments = "";

            if(attr && attr.choices) {
                if(this.nodes[key].hasOwnProperty("unit")) {
                    comments = this.nodes[key].unit;
                }
                if(this.nodes[key].hasOwnProperty("options")) {
                    comments = Object.keys(this.nodes[key].options).join(", ");
                }
            }

            if(attr && attr.descriptions) {
                if(comments) {
                    comments = "(" + comments + ") ";
                }
                if(this.nodes[key].hasOwnProperty("description")) {
                    comments += this.nodes[key].description.replace("\n"," ");
                }
            }

            writer.writeValue(key, value, comments, enabled);
        }
    }
}

// Static constants

SlicerConfiguration.ENABLED_FLAG  = 1; // Set if a value is enabled in the UI
SlicerConfiguration.CHANGED_FLAG  = 2; // Set if a value was changed from the default

SlicerConfiguration.VALUE_AFFECTED = 1;
SlicerConfiguration.FLAGS_AFFECTED = 2;