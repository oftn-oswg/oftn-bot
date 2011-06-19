// utils.js: Script used by all JS engines to interface with the v8bot.

// Grab new global object, using GlobalObject if available, set by SpiderMonkey
// It is not possible to use a normal object as a global object in SpiderMonkey
var global = typeof GlobalObject !== "undefined" ? GlobalObject : {};
var consoledata = [];
var timerdata = {};

global.console = {};
global.console.log = function log() {
	for( var i = 0, l = arguments.length; i < l; i++ ) {
		consoledata.push(utils.pretty_print(arguments[i]));
	}
};

global.console.time = function time(name) {
	timerdata[name || "default"] = Date.now();
};
global.console.timeEnd = function timeEnd(name) {
	name = name || "default";
	global.console.log(name+": "+(Date.now() - timerdata[name])+"ms");
};

global.print = global.alert = global.console.log;

/* fake version() */
if (typeof GlobalObject !== "undefined") {
	global.version = function version() { return "1.8.5"; };
} else {
	global.version = function version() { return process.versions.v8; };
}


function constant_multiply(n) {
	n |= 0;
	if (n === 0) return '0';
	var bits = n.toString(2).split("").map(function(b){return b=='1'}).reverse();
	var addops = [];
	for (var i = bits.length-1; i >= 0; i--) {
		if (bits[i]) addops.push(i?"(a << "+i+")":"a");
	}
	return addops.join(" + ");
}

function constant_divide(n) {
	n |= 0;
	if (n === 0) {
		throw new Error("Cannot divide by zero!");
	} else if (n === 1) {
		return "a";
	} else if ((n & (n - 1)) === 0) {
		// If n is power of two
		return n?"(a << "+(Math.log(n) + 1 |0)+")":"a";
	} else {
		n = (1/n*65535) | 0;
		var bits = n.toString(2).split("").map(function(b){return b=='1'}).reverse();
		bits[0] = true; // I don't exactly know how I came to add this, but it works
		var addops = [];
		for (var i = bits.length-1; i >= 0; i--) {
			if (bits[i]) addops.push(i?"(a << "+i+")":"a");
		}
		return "("+addops.join(" + ")+") >> 16";
	}
}

function numbers_that_add_and_subtract_to (sum, dif)
{
	var b = (sum - dif) / 2;
	var a = dif + b;
	return [a, b];
}

function numbers_that_add_and_multiply_to (sum, product)
{
	var a = (sum + Math.sqrt(sum*sum - 4*product)) / 2;
	if (isNaN(a)) throw new Error("No real solution");
	return [a, sum - a];
}


global.constant_multiply = constant_multiply;
global.constant_divide = constant_divide;
global.numbers_that_add_and_subtract_to = numbers_that_add_and_subtract_to;
global.numbers_that_add_and_multiply_to = numbers_that_add_and_multiply_to;

global.obfuscate = function obfuscate(val) {
	val = String(val);
	return val.replace(/[a-z]{4,}/ig, function(s) {
		return s.charAt(0)+Array.prototype.slice.call(s, 1, -1).reverse().join("")+s.charAt(s.length-1);
	});
};

global.strip_color = function strip_color(text) {
	text = String(text);
	return text.replace(/\x03\d{0,2},?\d{1,2}|[\x02\x06\x07\x16\x17\x1b\x1d\x1f\x0f]/g, '');
};

global.braille = function braille(text) {
	"use strict";
	
	text = String(text);
	var i = 0,
		result = [],
		err = [],
		len = text.length,
		ch,
		alphanum = "⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵";
		
	while (i < len) {
		ch = text.charCodeAt(i++);
		if (ch >= 65 && ch <= 90) {
			result.push("⠠" + alphanum[ch - 65]);
		} else if (ch >= 97 && ch <= 122) {
			result.push(alphanum[ch - 97]);
		} else if (ch >= 48 && ch <= 57) {
			result.push("⠼");
			do {
				result.push(ch === 48 ? alphanum[10] : alphanum[ch - 49]);
				ch = text.charCodeAt(i++);
			} while (ch >= 48 && ch <= 57);
			i--;
		} else {
			switch (ch) {
			case 32:
				result.push(" "); break;
			case 39:
				result.push("⠄"); break;
			case 46:
				result.push("⠲"); break;
			case 44:
				result.push("⠂"); break;
			case 59:
				result.push("⠆"); break;
			case 33:
				result.push("⠖"); break;
			case 45:
				result.push("⠤"); break;
			default:
				err.push(String.fromCharCode(ch));
			}
		}
	}
	if (err.length) {
		global.console.log("Could not convert: " + err.join(""));
	}
	return result.join("");
};





/**
 * Pretty-prints a Javascript value for viewing.
 * Identifies circular references
 **/
var utils = {
	pretty_print: function(value, depth) {
		if (typeof depth === "undefined") {
			depth = 5;
		}

		var seen = [];

		return (function(value, depth) {
			if (!depth) { return "\u2026"; /* Ellipsis */}
			if (value === null) return "null";
			
			//return typeof value;

			switch (typeof value) {
			case "undefined": return "undefined";
			case "string": return utils.string_format(value);
			case "number":
			case "boolean": return value.toString();
			case "function":

				if (value.name && value.name !== "anonymous") {
					return "(function) "+value.name;
				}

				if (Object.prototype.toString.call(value) === "[object RegExp]")
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
			
				if (value.developers === value) return "<http://www.youtube.com/watch?v=KMU0tzLwhbE>";
			
				// Only way to get internal [[Class]] property
				var type = Object.prototype.toString.call(value);
				type = type.slice(8, -1);
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
					case "RegExp": // Sometimes a RegExp is not a function
						return RegExp.prototype.toString.call(value);
					case "String":
						return "(object) " +
							utils.string_format(
								String.prototype.toString.call(value));
				}

				if (~seen.indexOf(value)) return "(Circular)";
				seen.push(value);
				
				var array = [], braces, props, prepend_key;

				if (Array.isArray(value)) {
					braces = "[]";
					props = [];
					prepend_key = false;
					for( var i = 0, len = value.length; i < len; i++ ) {
						props.push(i);
					}
				} else {
					braces = "{}";
					props = Object.getOwnPropertyNames(value).sort();
					prepend_key = true;
				}
				
				for( var i = 0, len = props.length; i < len; i++ ) {
					var desc = Object.getOwnPropertyDescriptor(value, props[i]);
					var string;
					if (typeof desc === "undefined" || desc.hasOwnProperty("value")) {
						string = (prepend_key ? props[i]+": " : "") +
							arguments.callee(value[props[i]], depth-1);
					} else {
						var getset = [];
						if (typeof desc.get !== "undefined") getset.push("Getter");
						if (typeof desc.set !== "undefined") getset.push("Setter");
						string = (prepend_key ? props[i]+": " : "") +
							"("+getset.join("/")+")";
					}
					array.push(string);
				}

				seen.pop();
				return braces[0]+array.join(", ")+braces[1];
			case "xml":
				// Weird syntax!! D:
				return eval("XML.prettyPrinting = false; XML.prototype.function::toXMLString.call(value)");
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
		return "'"+value.replace(/[\u0000-\u001f\u007f-\u009f\ufffe-\uffff]/g,
			function(v) {
			var escaped, code = v.charCodeAt(0);
			switch (code) {
			case 0: escaped = "\\0"; break;
			case 8: escaped = "\\b"; break;
			case 9: escaped = "→"; break;
			case 10: escaped = "↵"; break;
			case 12: escaped = "\\f"; break;
			case 13: escaped = "\\r"; break;
			default:
				escaped = "\\" + (code>=256?"u":"x") + (code<=16?"0":"") +
					code.toString(16).toUpperCase();
				break;
			}
			return escaped;
		})+"'";
	},
	type_is_obvious: function(value) {
		switch (typeof value) {
			case "function":
				var type = Object.prototype.toString.call(value);
				type = type.slice(8, -1);
				if (type === "RegExp") {
					return false;
				}
			case "undefined": return true;
			case "number":
			case "boolean":
			case "string": return false;
			case "object":
				var type = Object.prototype.toString.call(value);
				type = type.slice(8, -1);
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
				console: consoledata,
				obvioustype: this.type_is_obvious(result)
			},
			error: error ? error.name+": "+error.message : null,
			result: this.pretty_print(result)
		});
	}
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
			error = {name: "Uncaught value", message: utils.pretty_print(e)};
		}
	}
	return utils.generate(result, error, global);
};
exports.pretty_print = utils.pretty_print;
exports.string_format = utils.string_format;
