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

/**
 * The following are standard functions from common/ used for testing.
 **/

if (typeof ArrayBuffer !== "undefined") {

var Base64 = {

	rank: new Uint8Array([
		  62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1
		, -1, -1,  0, -1, -1, -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9
		, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25
		, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35
		, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
	]),

	alphabet: new Uint8Array([
		  65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80
		, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99,100,101,102
		,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118
		,119,120,121,122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
	]),

	encode: function(data, byteOffset, byteLength) {
		"use strict";
		
		if (Object.prototype.toString.call(data) !== "[object ArrayBuffer]")
			throw new TypeError("First argument must be an ArrayBuffer");
		
		byteOffset >>>= 0;
		byteLength = (typeof byteLength !== "undefined" ?
			byteLength >>> 0 : data.byteLength - byteOffset);
		
		var
			  alphabet = Base64.alphabet
			, input = new Uint8Array(data, byteOffset, byteLength)
			, output = new Uint8Array((byteLength / 3 + 1) * 4 | 0)
			, ip = 0
			, op = 0
			, buffer = [0, 0, 0]
			, size
			, code;
		
		while (byteLength) {
			
			size = 0;
			
			for (var a = 0; a < 3; a++) {
				if (byteLength) {
					size++;
					byteLength--;
					buffer[a] = input[ip++];
				} else {
					buffer[a] = 0;
				}
			}
			
			if (size) {
				output[op++] = alphabet[buffer[0] >> 2];
				output[op++] =
					alphabet[((buffer[0] & 0x03) << 4) |
						((buffer[1] & 0xf0) >> 4)];
				output[op++] = (size > 1 ?
					alphabet[((buffer[1] & 0x0f) << 2) |
						((buffer[2] & 0xc0) >> 6)] : 61);
				output[op++] = (size > 2 ?
					alphabet[buffer[2] & 0x3f] : 61);
			}
		}
		
		return output.subarray(0, op);
	},

	decode: function(base64) {
		"use strict";
	
		var
			  len = base64.length
			, buffer = new Uint8Array(len / 4 * 3 | 0)
			, ranks = Base64.rank
			, i = 0
			, outptr = 0
			, last = [0, 0]
			, state = 0
			, save = 0
			, rank
			, code;
	
		while (len--) {
			code = base64[i++];
			rank = ranks[code-43];
			if (rank !== 255 && rank !== void 0) {
				last[1] = last[0];
				last[0] = code;
				save = (save << 6) | rank;
				state++;
				if (state === 4) {
					buffer[outptr++] = save >>> 16;
					if (last[1] !== 61 /* padding character */) {
						buffer[outptr++] = save >>> 8;
					}
					if (last[0] !== 61 /* padding character */) {
						buffer[outptr++] = save;
					}
					state = 0;
				}
			}
		}
		return buffer.subarray(0, outptr);
	}
};


var MD5 = function(data, byteOffset, byteLength) {
	"use strict";
	
	if (Object.prototype.toString.call(data) !== "[object ArrayBuffer]")
		throw new TypeError("First argument must be an ArrayBuffer");
	
	byteOffset >>>= 0;
	byteLength = (typeof byteLength !== "undefined" ?
		byteLength >>> 0 : data.byteLength - byteOffset);
	
	var
		  checksum_h = new Uint32Array([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476])
		, input = data
		, input_trailing = byteLength & 63
		, block_offset = byteOffset
		, block_num = (byteLength + 9) / 64 + 1 | 0
		, block_i = 0
		, i_uint8
		, i, b;
	
	while (block_num--) {
	
		if (block_offset + 64 > byteLength) {
			
			i = new Uint32Array(16);
			i_uint8 = Uint8Array(i.buffer);
			
			if (input_trailing > 0) {
				i_uint8.set(Uint8Array(input, block_offset, input_trailing));
			}
			
			if (input_trailing >= 0) {
				i_uint8[input_trailing] |= 0x80;
			}
			
			if (!block_num) {
				i[14] = byteLength << 3;
			} else {
				input_trailing -= 64;
			}
			
		} else {
			i = new Uint32Array(input, block_offset, 16);
		}
		
		b = new Uint32Array(checksum_h);
		block_offset += 64;
		
		b[0] += (b[3] ^ (b[1] & (b[2] ^ b[3]))) + (i[0]  + 0xd76aa478 >>> 0); b[0] = b[0] << 7  | b[0] >>> 25; b[0] += b[1];
		b[3] += (b[2] ^ (b[0] & (b[1] ^ b[2]))) + (i[1]  + 0xe8c7b756 >>> 0); b[3] = b[3] << 12 | b[3] >>> 20; b[3] += b[0];
		b[2] += (b[1] ^ (b[3] & (b[0] ^ b[1]))) + (i[2]  + 0x242070db >>> 0); b[2] = b[2] << 17 | b[2] >>> 15; b[2] += b[3];
		b[1] += (b[0] ^ (b[2] & (b[3] ^ b[0]))) + (i[3]  + 0xc1bdceee >>> 0); b[1] = b[1] << 22 | b[1] >>> 10; b[1] += b[2];
		b[0] += (b[3] ^ (b[1] & (b[2] ^ b[3]))) + (i[4]  + 0xf57c0faf >>> 0); b[0] = b[0] << 7  | b[0] >>> 25; b[0] += b[1];
		b[3] += (b[2] ^ (b[0] & (b[1] ^ b[2]))) + (i[5]  + 0x4787c62a >>> 0); b[3] = b[3] << 12 | b[3] >>> 20; b[3] += b[0];
		b[2] += (b[1] ^ (b[3] & (b[0] ^ b[1]))) + (i[6]  + 0xa8304613 >>> 0); b[2] = b[2] << 17 | b[2] >>> 15; b[2] += b[3];
		b[1] += (b[0] ^ (b[2] & (b[3] ^ b[0]))) + (i[7]  + 0xfd469501 >>> 0); b[1] = b[1] << 22 | b[1] >>> 10; b[1] += b[2];
		b[0] += (b[3] ^ (b[1] & (b[2] ^ b[3]))) + (i[8]  + 0x698098d8 >>> 0); b[0] = b[0] << 7  | b[0] >>> 25; b[0] += b[1];
		b[3] += (b[2] ^ (b[0] & (b[1] ^ b[2]))) + (i[9]  + 0x8b44f7af >>> 0); b[3] = b[3] << 12 | b[3] >>> 20; b[3] += b[0];
		b[2] += (b[1] ^ (b[3] & (b[0] ^ b[1]))) + (i[10] + 0xffff5bb1 >>> 0); b[2] = b[2] << 17 | b[2] >>> 15; b[2] += b[3];
		b[1] += (b[0] ^ (b[2] & (b[3] ^ b[0]))) + (i[11] + 0x895cd7be >>> 0); b[1] = b[1] << 22 | b[1] >>> 10; b[1] += b[2];
		b[0] += (b[3] ^ (b[1] & (b[2] ^ b[3]))) + (i[12] + 0x6b901122 >>> 0); b[0] = b[0] << 7  | b[0] >>> 25; b[0] += b[1];
		b[3] += (b[2] ^ (b[0] & (b[1] ^ b[2]))) + (i[13] + 0xfd987193 >>> 0); b[3] = b[3] << 12 | b[3] >>> 20; b[3] += b[0];
		b[2] += (b[1] ^ (b[3] & (b[0] ^ b[1]))) + (i[14] + 0xa679438e >>> 0); b[2] = b[2] << 17 | b[2] >>> 15; b[2] += b[3];
		b[1] += (b[0] ^ (b[2] & (b[3] ^ b[0]))) + (i[15] + 0x49b40821 >>> 0); b[1] = b[1] << 22 | b[1] >>> 10; b[1] += b[2];

		b[0] += (b[2] ^ (b[3] & (b[1] ^ b[2]))) + (i[1]  + 0xf61e2562 >>> 0); b[0] = b[0] << 5  | b[0] >>> 27; b[0] += b[1];
		b[3] += (b[1] ^ (b[2] & (b[0] ^ b[1]))) + (i[6]  + 0xc040b340 >>> 0); b[3] = b[3] << 9  | b[3] >>> 23; b[3] += b[0];
		b[2] += (b[0] ^ (b[1] & (b[3] ^ b[0]))) + (i[11] + 0x265e5a51 >>> 0); b[2] = b[2] << 14 | b[2] >>> 18; b[2] += b[3];
		b[1] += (b[3] ^ (b[0] & (b[2] ^ b[3]))) + (i[0]  + 0xe9b6c7aa >>> 0); b[1] = b[1] << 20 | b[1] >>> 12; b[1] += b[2];
		b[0] += (b[2] ^ (b[3] & (b[1] ^ b[2]))) + (i[5]  + 0xd62f105d >>> 0); b[0] = b[0] << 5  | b[0] >>> 27; b[0] += b[1];
		b[3] += (b[1] ^ (b[2] & (b[0] ^ b[1]))) + (i[10] + 0x02441453 >>> 0); b[3] = b[3] << 9  | b[3] >>> 23; b[3] += b[0];
		b[2] += (b[0] ^ (b[1] & (b[3] ^ b[0]))) + (i[15] + 0xd8a1e681 >>> 0); b[2] = b[2] << 14 | b[2] >>> 18; b[2] += b[3];
		b[1] += (b[3] ^ (b[0] & (b[2] ^ b[3]))) + (i[4]  + 0xe7d3fbc8 >>> 0); b[1] = b[1] << 20 | b[1] >>> 12; b[1] += b[2];
		b[0] += (b[2] ^ (b[3] & (b[1] ^ b[2]))) + (i[9]  + 0x21e1cde6 >>> 0); b[0] = b[0] << 5  | b[0] >>> 27; b[0] += b[1];
		b[3] += (b[1] ^ (b[2] & (b[0] ^ b[1]))) + (i[14] + 0xc33707d6 >>> 0); b[3] = b[3] << 9  | b[3] >>> 23; b[3] += b[0];
		b[2] += (b[0] ^ (b[1] & (b[3] ^ b[0]))) + (i[3]  + 0xf4d50d87 >>> 0); b[2] = b[2] << 14 | b[2] >>> 18; b[2] += b[3];
		b[1] += (b[3] ^ (b[0] & (b[2] ^ b[3]))) + (i[8]  + 0x455a14ed >>> 0); b[1] = b[1] << 20 | b[1] >>> 12; b[1] += b[2];
		b[0] += (b[2] ^ (b[3] & (b[1] ^ b[2]))) + (i[13] + 0xa9e3e905 >>> 0); b[0] = b[0] << 5  | b[0] >>> 27; b[0] += b[1];
		b[3] += (b[1] ^ (b[2] & (b[0] ^ b[1]))) + (i[2]  + 0xfcefa3f8 >>> 0); b[3] = b[3] << 9  | b[3] >>> 23; b[3] += b[0];
		b[2] += (b[0] ^ (b[1] & (b[3] ^ b[0]))) + (i[7]  + 0x676f02d9 >>> 0); b[2] = b[2] << 14 | b[2] >>> 18; b[2] += b[3];
		b[1] += (b[3] ^ (b[0] & (b[2] ^ b[3]))) + (i[12] + 0x8d2a4c8a >>> 0); b[1] = b[1] << 20 | b[1] >>> 12; b[1] += b[2];

		b[0] += (b[1] ^ b[2] ^ b[3]) + (i[5]  + 0xfffa3942 >>> 0); b[0] = b[0] << 4  | b[0] >>> 28; b[0] += b[1];
		b[3] += (b[0] ^ b[1] ^ b[2]) + (i[8]  + 0x8771f681 >>> 0); b[3] = b[3] << 11 | b[3] >>> 21; b[3] += b[0];
		b[2] += (b[3] ^ b[0] ^ b[1]) + (i[11] + 0x6d9d6122 >>> 0); b[2] = b[2] << 16 | b[2] >>> 16; b[2] += b[3];
		b[1] += (b[2] ^ b[3] ^ b[0]) + (i[14] + 0xfde5380c >>> 0); b[1] = b[1] << 23 | b[1] >>>  9; b[1] += b[2];
		b[0] += (b[1] ^ b[2] ^ b[3]) + (i[1]  + 0xa4beea44 >>> 0); b[0] = b[0] << 4  | b[0] >>> 28; b[0] += b[1];
		b[3] += (b[0] ^ b[1] ^ b[2]) + (i[4]  + 0x4bdecfa9 >>> 0); b[3] = b[3] << 11 | b[3] >>> 21; b[3] += b[0];
		b[2] += (b[3] ^ b[0] ^ b[1]) + (i[7]  + 0xf6bb4b60 >>> 0); b[2] = b[2] << 16 | b[2] >>> 16; b[2] += b[3];
		b[1] += (b[2] ^ b[3] ^ b[0]) + (i[10] + 0xbebfbc70 >>> 0); b[1] = b[1] << 23 | b[1] >>>  9; b[1] += b[2];
		b[0] += (b[1] ^ b[2] ^ b[3]) + (i[13] + 0x289b7ec6 >>> 0); b[0] = b[0] << 4  | b[0] >>> 28; b[0] += b[1];
		b[3] += (b[0] ^ b[1] ^ b[2]) + (i[0]  + 0xeaa127fa >>> 0); b[3] = b[3] << 11 | b[3] >>> 21; b[3] += b[0];
		b[2] += (b[3] ^ b[0] ^ b[1]) + (i[3]  + 0xd4ef3085 >>> 0); b[2] = b[2] << 16 | b[2] >>> 16; b[2] += b[3];
		b[1] += (b[2] ^ b[3] ^ b[0]) + (i[6]  + 0x04881d05 >>> 0); b[1] = b[1] << 23 | b[1] >>>  9; b[1] += b[2];
		b[0] += (b[1] ^ b[2] ^ b[3]) + (i[9]  + 0xd9d4d039 >>> 0); b[0] = b[0] << 4  | b[0] >>> 28; b[0] += b[1];
		b[3] += (b[0] ^ b[1] ^ b[2]) + (i[12] + 0xe6db99e5 >>> 0); b[3] = b[3] << 11 | b[3] >>> 21; b[3] += b[0];
		b[2] += (b[3] ^ b[0] ^ b[1]) + (i[15] + 0x1fa27cf8 >>> 0); b[2] = b[2] << 16 | b[2] >>> 16; b[2] += b[3];
		b[1] += (b[2] ^ b[3] ^ b[0]) + (i[2]  + 0xc4ac5665 >>> 0); b[1] = b[1] << 23 | b[1] >>>  9; b[1] += b[2];

		b[0] += (b[2] ^ (b[1] | ~b[3])) + (i[0]  + 0xf4292244 >>> 0); b[0] = b[0] << 6  | b[0] >>> 26; b[0] += b[1];
		b[3] += (b[1] ^ (b[0] | ~b[2])) + (i[7]  + 0x432aff97 >>> 0); b[3] = b[3] << 10 | b[3] >>> 22; b[3] += b[0];
		b[2] += (b[0] ^ (b[3] | ~b[1])) + (i[14] + 0xab9423a7 >>> 0); b[2] = b[2] << 15 | b[2] >>> 17; b[2] += b[3];
		b[1] += (b[3] ^ (b[2] | ~b[0])) + (i[5]  + 0xfc93a039 >>> 0); b[1] = b[1] << 21 | b[1] >>> 11; b[1] += b[2];
		b[0] += (b[2] ^ (b[1] | ~b[3])) + (i[12] + 0x655b59c3 >>> 0); b[0] = b[0] << 6  | b[0] >>> 26; b[0] += b[1];
		b[3] += (b[1] ^ (b[0] | ~b[2])) + (i[3]  + 0x8f0ccc92 >>> 0); b[3] = b[3] << 10 | b[3] >>> 22; b[3] += b[0];
		b[2] += (b[0] ^ (b[3] | ~b[1])) + (i[10] + 0xffeff47d >>> 0); b[2] = b[2] << 15 | b[2] >>> 17; b[2] += b[3];
		b[1] += (b[3] ^ (b[2] | ~b[0])) + (i[1]  + 0x85845dd1 >>> 0); b[1] = b[1] << 21 | b[1] >>> 11; b[1] += b[2];
		b[0] += (b[2] ^ (b[1] | ~b[3])) + (i[8]  + 0x6fa87e4f >>> 0); b[0] = b[0] << 6  | b[0] >>> 26; b[0] += b[1];
		b[3] += (b[1] ^ (b[0] | ~b[2])) + (i[15] + 0xfe2ce6e0 >>> 0); b[3] = b[3] << 10 | b[3] >>> 22; b[3] += b[0];
		b[2] += (b[0] ^ (b[3] | ~b[1])) + (i[6]  + 0xa3014314 >>> 0); b[2] = b[2] << 15 | b[2] >>> 17; b[2] += b[3];
		b[1] += (b[3] ^ (b[2] | ~b[0])) + (i[13] + 0x4e0811a1 >>> 0); b[1] = b[1] << 21 | b[1] >>> 11; b[1] += b[2];
		b[0] += (b[2] ^ (b[1] | ~b[3])) + (i[4]  + 0xf7537e82 >>> 0); b[0] = b[0] << 6  | b[0] >>> 26; b[0] += b[1];
		b[3] += (b[1] ^ (b[0] | ~b[2])) + (i[11] + 0xbd3af235 >>> 0); b[3] = b[3] << 10 | b[3] >>> 22; b[3] += b[0];
		b[2] += (b[0] ^ (b[3] | ~b[1])) + (i[2]  + 0x2ad7d2bb >>> 0); b[2] = b[2] << 15 | b[2] >>> 17; b[2] += b[3];
		b[1] += (b[3] ^ (b[2] | ~b[0])) + (i[9]  + 0xeb86d391 >>> 0); b[1] = b[1] << 21 | b[1] >>> 11; b[1] += b[2];
		
		checksum_h[0] += b[0];
		checksum_h[1] += b[1];
		checksum_h[2] += b[2];
		checksum_h[3] += b[3];
	}
	
	return new Uint8Array(checksum_h.buffer);
};


var UTF8 = {

	encode: function(string) {
		var
			  value = String(string)
			, inputlength = value.length
			, code
			, codehi
			, character
			, bytes = 0
			, buffer
			, ip = 0
			, op = 0
			, size
			, first;
		
		// First we need to perform a check to see the string is valid, and
		// compute the total length of the encoded data
		
		while (inputlength--) {
			code = value.charCodeAt(ip++);
			
			if (code >= 0xDC00 && code <= 0xDFFF) {
				throw new Error(
					"Invalid sequence in conversion input");
					
			} else if (code >= 0xD800 && code <= 0xDBFF) {
				if (inputlength < 1) {
					throw new Error(
						"Partial character sequence at end of input");
						
				} else {
					codehi = value.charCodeAt(ip++);
					if ((codehi < 0xDC00) || (codehi > 0xDFFF)) {
						throw new Error(
							"Invalid sequence in conversion input");
							
					} else {
						character = ((codehi) - 0xd800) * 0x400 +
						      (code) - 0xdc00 + 0x10000;
					}
					inputlength--;
				}
			} else {
				character = code;
			}
			bytes += ((character) < 0x80 ? 1 :
				((character) < 0x800 ? 2 :
					((character) < 0x10000 ? 3 :
						((character) < 0x200000 ? 4 :
							((character) < 0x4000000 ? 5 : 6)))));
		}
		
		// Now we know the string is valid and we re-iterate.
		
		buffer = new Uint8Array(bytes);
		inputlength = value.length;
		ip = 0;
		
		while (inputlength--) {
			code = value.charCodeAt(ip++);
			
			if (code >= 0xD800 && code <= 0xDBFF) {
				codehi = value.charCodeAt(ip++);
				character = ((codehi) - 0xd800) * 0x400 +
				      (code) - 0xdc00 + 0x10000;
				inputlength--;
			} else {
				character = code;
			}
			
			size = 0;

			if (character < 0x80) {
				first = 0;
				size = 1;
			} else if (character < 0x800) {
				first = 0xc0;
				size = 2;
			} else if (character < 0x10000) {
				first = 0xe0;
				size = 3;
			} else if (character < 0x200000) {
				first = 0xf0;
				size = 4;
			} else if (character < 0x4000000) {
				first = 0xf8;
				size = 5;
			} else {
				first = 0xfc;
				size = 6;
			}

			for (var i = op + size - 1; i > op; i--) {
				buffer[i] = (character & 0x3f) | 0x80;
				character >>= 6;
			}
			buffer[op] = character | first;
			op += size;

		}
		
		return buffer;
		
	},
	
	get_utf8_char: function(data, index) {
		var
			  code = data[index]
			, size = 0
			, min_code = 0;
			
		if (code < 0x80) {
		
		} else if (code < 0xc0) {
			throw new Error("Invalid byte sequence in conversion input");
			
		} else if (code < 0xe0) {
			size = 2;
			code &= 0x1f;
			min_code = 1 << 7;
			
		} else if (code < 0xf0) {
			size = 3;
			code &= 0x0f;
			min_code = 1 << 11;
			
		} else if (code < 0xf8) {
			size = 4;
			code &= 0x07;
			min_code = 1 << 16;
			
		} else if (code < 0xfc) {
			size = 5;
			code &= 0x03;
			min_code = 1 << 21;
			
		} else if (code < 0xfe) {
			size = 6;
			code &= 0x01;
			min_code = 1 << 26;
			
		} else {
			throw new Error("Invalid byte sequence in conversion input");
		}
		
		for (i = 1; i < size; i++) {
			ch = data[index+i];
			
			if (ch === void 0) {
				throw new Error("Partial character sequence at end of input");
			}

			if ((ch & 0xc0) != 0x80) {
				throw new Error("Invalid byte sequence in conversion input");
			}

			code <<= 6;
			code |= (ch & 0x3f);
		}

		if (code < min_code) {
			throw new Error("Invalid byte sequence in conversion input");
		}
		
		return code;
	},
	
	decode: function(data) {
		throw new Error("Utf8.decode is not implemented");
	}
	
};

global.MD5 = MD5;
global.UTF8 = UTF8;
global.Base64 = Base64;

}

var Sol = function Sol(arg, absolute) {
	var num;
	if (arguments.length === 0) {
		num = (new Date().getTime() / 86400000);
	} else if (Object.prototype.toString.call(arg) === "[object Date]") {
		num = (arg.getTime() / 86400000);
	} else if (typeof arg === "number") {
		num = arg;
	} else if (typeof arg === "string") {
		return Sol.parseSol(arg);
	} else {
		throw new TypeError("Sol constructor expects Date, number, or string argument");
	}
	this.floating = num;
	this.absolute = typeof absolute != "undefined" ? absolute : true;
};

Sol.prototype.valueOf = function() { return this.floating; };
Sol.prototype.toSolString = Sol.prototype.toString = function() {
	if (this.floating === Infinity) { return "∞ſ"; }
	if (this.floating === -Infinity) { return "-∞ſ"; }
	
	if (this.absolute) {
		var num = this.floating.toFixed(6), m = num.match(/e(\+|-)/);
		if (m) return m[1] === "+" ? "∞ſ" : "-∞ſ";
		
		var sep = num.split(".");
		var sol = sep[0].replace(/(\d)(?=(\d{3})+$)/g, "$1 ")+" ſ "+sep[1].substr(0,3)+" "+sep[1].substr(3,3);
		return sol;
	} else {
		var keys = [
			["k", 1000000000],
			["", 1000000],
			["m", 1000],
			["µ", 1]
		];
		var builder = [];
		var num = this.floating*1000000;
		for (var i = 0, len = keys.length; i < len; i++) {
			var numspecific = 0;
			if (num >= keys[i][1]) {
				numspecific = num / keys[i][1] | 0;
				num -= numspecific * keys[i][1];
			}
			if (numspecific) {
				builder.push(numspecific + keys[i][0] + "ſ");
			}
		}
		if (!builder.length) builder.push("0ſ");
		return builder.join(" ");
	}
};

Sol.prototype.toHumanString = function() {
	var num = this.floating * 86400000;
	
	var keys = [
		["year", 31536000000],
		["month", 2678400000],
		["week", 604800000],
		["day", 86400000],
		["hour", 3600000],
		["minute", 60000],
		["second", 1000],
		["millisecond", 1]
	];

	var builder = [];
	for (var i = 0, len = keys.length; i < len; i++) {
		var numspecific = 0;
		while (num >= keys[i][1]) {
			numspecific++;
			num -= keys[i][1];
		}
		if (numspecific) {
			builder.push(numspecific + " " + keys[i][0] +
				(numspecific === 1?"":"s"));
		}
	}
	if (!builder.length) builder.push("Zero.");
	return builder.join(", ");
};

Sol.parseHuman = function(text) {
	var t = 0, m;
	m = text.match(/([0-9.]+)\s*eternity/);
	if (m) {
		if (m[1] != 0) {
			this.floating = m[1]*Infinity;
			return;
		};
	}
	m = text.match(/([0-9.]+)\s*y/); if (m) { t += m[1]*31536000000; }
	m = text.match(/([0-9.]+)\s*mo/); if (m) { t += m[1]*2678400000; }
	m = text.match(/([0-9.]+)\s*w/); if (m) { t += m[1]*604800000; }
	m = text.match(/([0-9.]+)\s*d/); if (m) { t += m[1]*86400000; }
	m = text.match(/([0-9.]+)\s*h/); if (m) { t += m[1]*3600000; }
	m = text.match(/([0-9.]+)\s*m(?:$|[^os])/); if (m) { t += m[1]*60000; }
	m = text.match(/([0-9.]+)\s*s/); if (m) { t += m[1]*1000; }
	m = text.match(/([0-9.]+)\s*ms/); if (m) { t += m[1]*1; }
	
	return new Sol(t / 86400000, false);
};

Sol.parseSol = function(text) {

	var units = {
		kS: 1000000000,
		hS: 100000000,
		daS: 10000000,
		S: 1000000,
		dS: 100000,
		cS: 10000,
		mS: 1000,
		µS: 1
	};
	var t = 0;
	
	text = text.replace(/[ ,ſ]/g, function(ch) {
		return ch === "ſ" ? "S" : "";
	});
	matches = text.match(/([\d.]+)\s*(k|h|da|d|c|m|µ|)\s*S/gi);
	if (matches) {
		for (var i = 0, len = matches.length; i < len; i++) {
			var modifier = matches[i];
			var value = parseInt(modifier, 10);
			var unit = modifier.match(/(k|h|da|d|m|µ|)S/)[0];
			t += value * units[unit];
		}
	}
	return new Sol(t/1000000, false);
};
global.Sol = Sol;
exports.Sol = Sol;

