// utils.js: Script used by all JS engines to interface with the v8bot.

/**
 * Pretty-prints a Javascript value for viewing.
 * Identifies circular references
 **/
var utils = {
	pretty_print: function(value, depth) {

		if (typeof depth === "undefined") {
			depth = 5;
		} else if (!depth) {
			return "\u2026"; // Ellipsis
		}
		if (value === null) return "null";

		var seen = [];

		return (function(value, depth) {

			switch (typeof value) {
			case "string": return this.string_format(value);
			case "number":
			case "boolean": return value.toString();
			case "function":

				if (value.name && value.name !== "anonymous") {
					return "(function) "+value.name;
				}

				var type = Object.prototype.toString.call(value);
				if (type === "[object RegExp]")
					return RegExp.prototype.toString.call(value);

				// Collapse whitespace
				var str;
				str = Function.prototype.toString.call(value).replace(/\s+/g, " ");
				if (str.length > 48) {
					return str.substr(0, 46)+"\u2026}";
				} else {
					return str;
				}
			case "object":

				if (Array.isArray(value)) {
					if (~seen.indexOf(value)) return "(Circular)";
					seen.push(value);

					var array = [];
					for( var i = 0, len = value.length; i < len; i++ ) {
						array.push(arguments.callee(value[i], depth-1));
					}

					seen.pop();
					return "["+array.join(", ")+"]";

				} else {
					// Only way to get internal [[Class]] property
					var type = Object.prototype.toString.call(value);
					type = type.substring(8, type.length-1);
					switch (type) {
						case "Date":
							return "(object) " +
								Date.prototype.toString.call(value);
						case "Boolean":
							return "(object) " +
								Boolean.prototype.toString.call(value);
						case "Number":
							return "(object) " +
								Number.prototype.toString.call(value);
						case "String":
							return "(object) " +
								this.string_format(
									String.prototype.toString.call(value));
					}

					if (~seen.indexOf(value)) return "(Circular)";
					seen.push(value);

					var array = [];
					for (var i in value) {
						if (Object.prototype.hasOwnProperty.call(value, i)) {
							array.push(i+": "+arguments.callee(value[i], depth-1));
						}
					}

					seen.pop();
					return "{"+array.join(", ")+"}";
				}
			case "undefined":
				return "undefined";
			}
			return "(unknown)";
		})(value, depth);
	},
	/**
	 * Format string value so it is readable. This replaces control
	 * characters with their hex equivalent in Javascript notation.
	 * Quotes are not escaped for readability. Only double quotes are placed
	 * around it, so it's easy to see that it is a string.
	 **/
	string_format: function(value) {
		return "\""+value.replace(/[\u0000-\u001f\u007f-\u009f\ufffe-\uffff]/g,
			function(v) {
			var escaped, code = v.charCodeAt(0);
			switch (code) {
			case 0: escaped = "\\0"; break;
			case 8: escaped = "\\b"; break;
			case 9: escaped = "\\t"; break;
			case 10: escaped = "\\n"; break;
			case 12: escaped = "\\f"; break;
			case 13: escaped = "\\r"; break;
			default:
				escaped = "\\" + (code>=256?"u":"x") + (code<=16?"0":"") +
					code.toString(16).toUpperCase();
				break;
			}
			return escaped;
		})+"\"";
	},
	type_is_obvious: function(value) {
		switch (typeof value) {
			case "function":
				var type = Object.prototype.toString.call(value);
				type = type.substring(8, type.length-1);
				if (type === "RegExp") {
					return false;
				}
			case "undefined": return true;
			case "number":
			case "boolean":
			case "string": return false;
			case "object":
				var type = Object.prototype.toString.call(value);
				type = type.substring(8, type.length-1);
				switch (type) {
				case "Date":
				case "Number":
				case "Boolean":
				case "String": return true;
				}
		}
		return false;
	},
	generate: function(result, error, sandbox) {
		return JSON.stringify({
			data: {
				type: typeof result,
				console: sandbox.console.data,
				obvioustype: this.type_is_obvious(result)
			},
			error: error ? error.name+": "+error.message : null,
			result: this.pretty_print(result)
		});
	}
};

// Grab new global object, using GlobalObject if available, set by SpiderMonkey
var global = (typeof GlobalObject !== "undefined") ? GlobalObject : {};


global.console = {};
//Object.defineProperty(global.console, "data", {value: [], writable: true});
global.console.data = [];
global.console.log = function() {
	for( var i = 0, l = arguments.length; i < l; i++ ) {
		global.console.data.push(utils.pretty_print(arguments[i]));
	}
};
global.print = global.console.log;
global.alert = global.console.log;

global.kirby = function() { return "<(n_n<) <(n_n)> (>n_n)>"; };
global.util = {};
global.util.ranges = function() {
	var a = [], start, end, step;
	for (var i = 0, len = arguments.length; i < len; i++) {
		if (Array.isArray(arguments[i])) {
			if (arguments[i].length >= 2) {
				start = +arguments[i][0]; end = +arguments[i][1];
				step = +(arguments[i][2] || 1);
				if (step <= 0)
					throw new TypeError("Step value for argument " +
						(i+1) + " cannot be <= 0");
				if (start < end)
					for (;start <= end;start+=step) a.push(start);
				else if (start > end)
					for (;start >= end;start-=step) a.push(start);
			} else {
				throw new TypeError("Expected argument " + (i+1) +
					" to have length of 2 or more: [start, end, step]");
			}
		} else {
			a.push(arguments[i]);
		}
	}
	return a;
};

/**
 * The main run function.
 * Accepts a function that executes the code and returns a value,
 * with the specified argument used as a global object
 * Returns a string of json
 **/
exports.run = function(execute) {
	var result, error;
	try {
		result = execute(global);
	} catch(e) {
		if (typeof e.name !== "undefined" &&
			typeof e.message !== "undefined") {
			error = e;
			error.name = e.name; // Weird bug
		} else {
			if (typeof e === "string" && e.match(/\brock\b/)) {
				error = {name: "ParentingError", message: "Haven't you ever been told to never throw rocks?"};
			} else {
				error = {name: "Uncaught value", message: utils.pretty_print(e)};
			}
		}
	}
	return utils.generate(result, error, global);
};
