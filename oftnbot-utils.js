// utils.js: Script used by all JS engines to interface with the bot.
var consoledata = [];
var timerdata = {};

global.console = {};
global.console.log = function log() {
	for( var i = 0, l = arguments.length; i < l; i++ ) {
		consoledata.push(utils.pretty_print(arguments[i]));
	}
};

global.console.time = function time(name) {
	timerdata[name || "default"] = +Date.now();
};
global.console.timeEnd = function timeEnd(name) {
	name = name || "default";
	global.console.log(name+": "+(Date.now() - timerdata[name])+"ms");
};

global.print = global.alert = global.console.log;

global.version = typeof version === "undefined" ? "unknown" : version;

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
				if (str.length > 300) {
					return str.substr(0, 298)+"\u2026}";
				} else {
					return str;
				}
			case "object":
			
				// Only way to get internal [[Class]] property
				var type = Object.prototype.toString.call(value).slice(8, -1);
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
					
					case "Uint8Array":
					case "Uint16Array":
					case "Uint32Array":
					case "Int8Array":
					case "Int16Array":
					case "Int32Array":
					case "Float32Array":
					case "Float64Array":
						return "(object) <"+Array.prototype.map.call(value, function(b) {return (b < 16 ? "0" : "") + b.toString(16)}).join(" ")+">";
					case "ArrayBuffer":
						return "(object) <"+Array.prototype.map.call(Uint8Array(value), function(b) {return (b < 16 ? "0" : "") + b.toString(16)}).join(" ")+">";
				}
					
				try {

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

					return braces[0]+array.join(", ")+braces[1];
				} catch (e) {
					return "(Semanticless: "+e.message+")";
				} finally {
					seen.pop();
				}
			case "xml":
				// Weird syntax!! D:
				return eval("XML.prettyPrinting = false; XML.prototype.function::toXMLString.call(value)");
			}
			return "(unknown)";
		})(value, depth);
	},
	/**
	 * Format string value so it is readable. This replaces unprintable
	 * characters with equivalents JavaScript can parse.
	 * Quotes are escaped, but the surrounding quotes are chosen so that the
	 * least escaping has to be done.
	 **/
	string_format: function(value) {
		
		// First we need to find which quote character to use by comparing the
		// number of times each occurs in the string.
		
		var quotes_dbl = (value.match(/"/g) || []).length;
		var quotes_sgl = (value.match(/'/g) || []).length;
		var quote = quotes_sgl <= quotes_dbl ? "'" : '"';
		var quote_code = quote.charCodeAt(0);
		
		// Next, we create a new array of substrings which contain escaped or
		// unescaped strings.
		
		var i = 0, code, code2, len = value.length, result = "";
		while (i < len) {
			code = value.charCodeAt(i++);
			switch (code) {
			case 8:  result += "\\b"; break;
			case 9:  result += "\\t"; break;
			case 10: result += "\\n"; break;
			case 11: result += "\\v"; break;
			case 12: result += "\\f"; break;
			case 13: result += "\\r"; break;
			case 34: /* double quote */
			case 39: /* single quote */
				result += 
					(code === quote_code ? '\\' : '') +
						String.fromCharCode(code); break;
			case 92: result += "\\\\"; break;
			default:
				if ((code < 32) || (code > 0xfffd) ||
					(code >= 0x7f && code <= 0x9f) ||
					(code >= 0xDC00 && code <= 0xDFFF)) {
					result += "\\u" + 
						(code <= 0xf ? "000" :
							(code <= 0xff ? "00" :
								(code <= 0xfff ? "0" : ""))) + code.toString(16).toUpperCase();
				} else if (code >= 0xD800 && code <= 0xDBFF) {
					if (len < 1) {
						result += "\\u"+code.toString(16).toUpperCase();
					} else {
						code2 = value.charCodeAt(i++);
						if ((code2 < 0xDC00) || (code2 > 0xDFFF)) {
							result += "\\u"+code.toString(16).toUpperCase();
							i--;
						} else {
							result += String.fromCharCode(code, code2);
						}
					}
				} else {
					result += String.fromCharCode(code);
				}
			}
		}
		
		return quote+result+quote;
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
			error: error ?
				(error.lineNumber ? "Line " + error.lineNumber + ": " : "" ) +
					error.name+": "+error.message : null,
			result: this.pretty_print(result)
		});
	}
};


// The built-ins in this context should not be changed.
Object.freeze(Function.prototype);
Object.freeze(Boolean.prototype);
Object.freeze(Object.prototype);
Object.freeze(RegExp.prototype);
Object.freeze(String.prototype);
Object.freeze(Array.prototype);
Object.freeze(Date.prototype);
Object.freeze(Object);
Object.freeze(Array);

/**
 * The main run function.
 * Accepts a function that executes the code and returns a value,
 * with the specified argument used as a global object
 * Returns a string of json
 **/

exports.run = function(execute) {
	var result, error;
	try {
		result = execute();
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
