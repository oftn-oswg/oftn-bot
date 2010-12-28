{
	"Array": {
		"properties": {
			"isArray": {},
			"prototype": {
				"properties": {
					"pop": {},
					"push": {},
					"reverse": {},
					"shift": {},
					"sort": {},
					"splice": {},
					"unshift": {},
					"concat": {},
					"join": {},
					"slice": {},
					"toString": {},
					"indexOf": {},
					"lastIndexOf": {},
					"filter": {},
					"forEach": {},
					"every": {},
					"map": {},
					"some": {},
					"reduce": {},
					"reduceRight": {},
					"constructor": {},
					"index": {},
					"input": {},
					"length": {}
				}
			}
		}
	},
	"Boolean": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"toString": {},
					"valueOf": {}
				}
			}
		}
	},
	"Date": {
		"properties": {
			"now": {},
			"parse": {},
			"UTC": {},
			"prototype": {
				"properties": {
					"constructor": {},
					"getDate": {},
					"getDay": {},
					"getFullYear": {},
					"getHours": {},
					"getMilliseconds": {},
					"getMinutes": {},
					"getMonth": {},
					"getSeconds": {},
					"getTime": {},
					"getTimezoneOffset": {},
					"getUTCDate": {},
					"getUTCDay": {},
					"getUTCFullYear": {},
					"getUTCHours": {},
					"getUTCMilliseconds": {},
					"getUTCMinutes": {},
					"getUTCMonth": {},
					"getUTCSeconds": {},
					"getYear": {"summary": "Deprecated"},
					"setDate": {},
					"setFullYear": {},
					"setHours": {},
					"setMilliseconds": {},
					"setMinutes": {},
					"setMonth": {},
					"setSeconds": {},
					"setTime": {},
					"setUTCDate": {},
					"setUTCFullYear": {},
					"setUTCHours": {},
					"setUTCMilliseconds": {},
					"setUTCMinutes": {},
					"setUTCMonth": {},
					"setUTCSeconds": {},
					"setYear": {"summary": "Deprecated"},
					"toDateString": {},
					"toJSON": {},
					"toGMTString": {},
					"toLocaleDateString": {},
					"toLocaleString": {},
					"toLocaleTimeString": {},
					"toString": {},
					"toTimeString": {},
					"toUTCString": {},
					"valueOf": {}
				}
			}
		}
	},
	"Error": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"message": {},
					"name": {}
				}
			}
		}
	},
	"EvalError": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"message": {},
					"name": {}
				}
			}
		}
	},
	"Function": {
		"summary": "Creates and initialises a new Function object. The function call is equivalent to the object creation expression with the same arguments.",
		"syntax": "new Function([param, ] body)",
		"parameters": {
			"param": "A string identifier representing a formal parameter",
			"body": "A string of executable code"
		},
		"returns": "A function",
		"properties": {
			"length": { "summary": "The number of arguments the Function function expects, always 1." },
			"prototype": {
				"properties": {
					"constructor": {},
					"length": { "summary": "The number of arguments the function expects. The prototype length is defined to be 0." },
					"apply": {},
					"bind": {},
					"call": {},
					"toString": {
						"summary": "An implementation-dependent representation of the function is returned. This representation has the syntax of a FunctionDeclaration. The use and placement of white space, line terminators, and semicolons within the representation String is implementation-dependent.",
						"syntax": "Function.prototype.toString.call(F)",
						"parameters": {
							"F": "A function object"
						},
						"returns": "A string representation of the function"
					}
				}
			}
		}
	},
	"Object": {
		"summary": "When called with an argument that is not null or undefined, encapsulates primitives as an object. Otherwise, it creates a new Object.",
		"properties": {
			"length": { "summary": "The number of arguments the Object function expects, always 1." },
			"getPrototypeOf": {
				"summary": "Returns the prototype object for the specified object.",
				"syntax": "Object.getPrototypeOf(O)",
				"parameters": {
					"O": "An object value"
				},
				"returns": "The [[Prototype]] internal property of O"
			},
			"getOwnPropertyDescriptor": {
				"summary": "Gets information about a property of an object including 'enumerable' and 'configurable'. For properties with data descriptors, returns 'value', and 'writable'. For properties with accessor descriptors, returns 'get' and 'set'.",
				"syntax": "Object.getOwnPropertyDescriptor(O, P)",
				"parameters": {
					"O": "An object value",
					"P": "A string representing the property of O"
				},
				"returns": "An object"
			},
			"getOwnPropertyNames": {
				"summary": "Returns an array of named own properties of an object.",
				"syntax": "Object.getOwnPropetyNames(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "An array"
			},
			"create": {
				"summary": "Creates a new object with a specified prototype.",
				"syntax": "Object.create(O [, Properties])",
				"parameters": {
					"O": "Specified prototype object",
					"Properties": "Optional own properties" 
				},
				"returns": "A new object with O as its prototype and optionally the properties specified by Properties"
			},
			"defineProperty": {
				"summary": "Used to add an own property and/or update the attributes of an existing own property of an object.",
				"syntax": "Object.defineProperty(O, P, Attributes)",
				"parameters": {
					"O": "An object",
					"P": "The property name",
					"Attributes": "A property descriptor object"
				},
				"returns": "A reference to O"
			},
			"defineProperties": {
				"summary": "Used to add own properties and/or update the attributes of existing own properties of an object.",
				"syntax": "Object.defineProperties(O, Properties)",
				"parameters": {
					"O": "An object",
					"Properties": "An object where the own property names represent the properties of O, and the corresponding values represent the property descriptor object"
				},
				"returns": "A reference to O"
			},
			"seal": {
				"summary": "For each own property of an object, sets the property descriptor's configurable property to false. Also, sets the internal extensible property to false.",
				"syntax": "Object.seal(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "A reference to O"
			},
			"freeze": {
				"summary": "Similar to Object.seal, but also sets the properties' descriptor's writable property to false.",
				"syntax": "Object.freeze(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "A reference to O"
			},
			"preventExtensions": {
				"summary": "Sets the internal extensible property of an object to false.",
				"syntax": "Object.preventExtensions(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "A reference to O"
			},
			"isSealed": {
				"summary": "Returns false if any own property of an object is configurable, otherwise true.",
				"syntax": "Object.isSealed(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "True if object is sealed, false otherwise."
			},
			"isFrozen": {
				"summary": "Returns false if any own property of an object is configurable or writable, otherwise true.",
				"syntax": "Object.isFrozen(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "True if object is frozen, false otherwise."
			},
			"isExtensible": {
				"summary": "Returns the boolean value of the internal extensible property of an object.",
				"syntax": "Object.isExtensible(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "True if object is extensible, false otherwise."
			},
			"keys": {
				"summary": "Similar to Object.getOwnPropertyNames, but only returns enumerable properties.",
				"syntax": "Object.keys(O)",
				"parameters": {
					"O": "An object"
				},
				"returns": "An array"
			},
			"prototype": {
				"extensible": true,
				"properties": {
					"constructor": { "summary": "Defined initially to be the built-in Object constructor." },
					"toString": {
						"summary": "Returns the result of concatenating \"[object \", plus the internal class property of `this`, plus \"]\".",
						"syntax": "Object.prototype.toString.call(O)",
						"parameters": {
							"O": "An object"
						},
						"returns": "A string representation of O"
					},
					"toLocaleString": {
						"summary": "Returns the result of calling toString on an object. This function is provided to give all Objects a generic toLocaleString interface, even though not all may use it. Currently, Array, Number, and Date provide their own locale-sensitive toLocaleString methods.",
						"syntax": "Object.prototype.toLocaleString.call(O)",
						"parameters": {
							"O": "An object"
						},
						"returns": "A string representation of O"
					},
					"valueOf": {
						"summary": "Returns `this` as an object.",
						"syntax": "Object.prototype.valueOf.call(O)",
						"parameters": {
							"O": "An object"
						},
						"returns": "An object representation of O"
					},
					"hasOwnProperty": {
						"summary": "Checks if `this` has the specified own property.",
						"syntax": "Object.prototype.hasOwnProperty.call(O, V)",
						"parameters": {
							"O": "An object",
							"V": "A string representing a property of O"
						},
						"returns": "A boolean, true if O has the own poperty V, false otherwise"
					},
					"isPrototypeOf": {
						"summary": "Checks if `this` is the prototype object of an object",
						"syntax": "Object.prototype.isPrototypeOf.call(O, V)",
						"parameters": {
							"O": "A prototype object",
							"V": "An object"
						},
						"returns": "A boolean, true if O is the prototype object of V, false otherwise"
					},
					"propertyIsEnumerable": {
						"summary": "Checks if a property of `this` is enumerable.",
						"syntax": "Object.prototype.propertyIsEnumerable.call(O, P)",
						"parameters": {
							"O": "An object",
							"P": "A string representing the property of an object"
						},
						"returns": "A boolean, true if the property P of O is enumerable"
					}
				}
			}
		}
	},
	"RangeError": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"message": {},
					"name": {}
				}
			}
		}
	},
	"ReferenceError": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"message": {},
					"name": {}
				}
			}
		}
	},
	"RegExp": {},
	"String": {
		"fromCharCode": {},
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"length": {},
					"charAt": {},
					"charCodeAt": {},
					"concat": {},
					"indexOf": {},
					"lastIndexOf": {},
					"localeCompare": {},
					"match": {},
					"replace": {},
					"search": {},
					"slice": {},
					"split": {},
					"substr": {},
					"substring": {},
					"toLocaleLowerCase": {},
					"toLocaleUpperCase": {},
					"toLowerCase": {},
					"toString": {},
					"toUpperCase": {},
					"trim": {},
					"trimLeft": {},
					"trimRight": {},
					"valueOf": {}
				}
			}
		}
	},
	"SyntaxError": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"message": {},
					"name": {}
				}
			}
		}
	},
	"TypeError": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"message": {},
					"name": {}
				}
			}
		}
	},
	"URIError": {
		"properties": {
			"prototype": {
				"properties": {
					"constructor": {},
					"message": {},
					"name": {}
				}
			}
		}
	},
	"decodeURI": {},
	"decodeURIComponent": {},
	"encodeURI": {},
	"encodeURIComponent": {},
	"eval": {
		"summary": "Executes a string of code. If `typeof code` is not \"string\", no code is executed; the argument is simply returned.",
		"syntax": "eval(code)",
		"parameters": {
			"code": "A string of code to run"
		},
		"returns": "The value that the code evalutates to"
	},
	"isFinite": {
		"summary": "Returns false if the argument coerces to NaN, +\u221E, or −\u221E, and otherwise returns true.",
		"syntax": "isFinite(number)",
		"parameters": {
			"number": "The number being tested"
		},
		"returns": "A boolean, true if number coerces to NaN, +\u221E, or −\u221E, false otherwise"
	},
	"isNaN": {
		"summary": "Returns true if the argument coerces to NaN, and otherwise returns false. A reliable way for ECMAScript code to test if a value `x` is a NaN is an expression of the form `x !== x`. The result will be true if and only if `x` is a NaN.",
		"syntax": "isNaN(number)",
		"parameters": {
			"number": "The number being tested for being NaN"
		},
		"returns": "A boolean, true if the argument is NaN, false otherwise"
	},
	"parseFloat": {
		"summary": "Interprets the string argument as a decimal literal in base 10. Returns NaN on error.",
		"syntax": "parseFloat(string)",
		"parameters": {
			"string": "A string value",
		},
		"returns": "The parsed decimal number"
	},
	"parseInt": {
		"summary": "Interprets the string argument as an integer. Leading white space in string is ignored. If radix is undefined or 0, it is assumed to be 10 except when the string begins with the character pairs 0x or 0X, in which case a radix of 16 is assumed.",
		"syntax": "parseInt(string, [radix])",
		"parameters": {
			"string": "A string value",
			"radix": "Optional base to parse string as"
		},
		"returns": "The parsed integer"
	},
	"Infinity": { "summary": "Number value that is the positive infinite Number value." },
	"Math": {
		"summary": "The Math object is a single object that has some named properties, some of which are functions. It is not possible to use the Math object as a constructor with the new operator.",
		"properties": {
			"E": { "summary": "The Number value for e, the base of the natural logarithms, which is approximately 2.7182818284590452354." },
			"LN10": { "summary": "The Number value for the natural logarithm of 10, which is approximately 2.302585092994046." },
			"LN2": { "summary": "The Number value for the natural logarithm of 2, which is approximately 0.6931471805599453." },
			"LOG2E": { "summary": "The Number value for the base-2 logarithm of e, the base of the natural logarithms; this value is approximately 1.4426950408889634." },
			"LOG10E": { "summary": "The Number value for the base-10 logarithm of e, the base of the natural logarithms; this value is approximately 0.4342944819032518." },
			"PI": { "summary": "The Number value for \u03C0, the ratio of the circumference of a circle to its diameter, which is approximately 3.1415926535897932." },
			"SQRT1_2": { "summary": "The Number value for the square root of \u00BD, which is approximately 0.7071067811865476." },
			"SQRT2": { "summary": "The Number value for the square root of 2, which is approximately 1.4142135623730951." },
			"abs": {
				"summary": "Absolute value.",
				"syntax": "Math.abs(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "A number value which has the same magnitude as x, but has positive sign"
			},
			"acos": {
				"summary": "Arc cosine.",
				"syntax": "Math.acos(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "An implementation-dependent approximation to the arc cosine of x. The result is expressed in radians and ranges from +0 to +\u03C0."
			},
			"asin": {
				"summary": "Arc sine.",
				"syntax": "Math.asin(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "An implementation-dependent approximation to the arc sine of x expressed in radians and ranges from −\u03C0/2 to +\u03C0/2"
			},
			"atan": {
				"summary": "Arc tangent.",
				"syntax": "Math.atan(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "An implementation-dependent approximation to the arc tangent of x expressed in radians and ranges from −\u03C0/2 to +\u03C0/2"
			},
			"atan2": {
				"summary": "Angle in radians between the positive x-axis of a plane and a point",
				"syntax": "Math.atan2(y, x)",
				"parameters": {
					"y": "A number value",
					"x": "A number value"
				},
				"returns": "An implementation-dependent approximation to the arc tangent of the quotient y/x of the arguments y and x, where the signs of y and x are used to determine the quadrant of the result expressed in radians and ranges from −\u03C0 to +\u03C0"
			},
			"ceil": {
				"summary": "Round up to the nearest integer.",
				"syntax": "Math.ceil(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "The smallest (closest to −\u221E) Number value that is not less than x and is equal to a mathematical integer"
			},
			"cos": {
				"summary": "Cosine.",
				"syntax": "Math.cos(x)",
				"parameters": {
					"x": "A number value, expressed in radians"
				},
				"returns": "An implementation-dependent approximation to the cosine of x"
			},
			"exp": {
				"summary": "Exponential function.",
				"syntax": "Math.exp(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "An implementation-dependent approximation to the exponential function of x (e raised to the power of x, where e is the base of the natural logarithms)"
			},
			"floor": {
				"summary": "Round down to the nearest integer.",
				"syntax": "Math.floor(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "The greatest (closest to +\u221E) Number value that is not greater than x and is equal to a mathematical integer"
			},
			"log": {
				"summary": "Natural logarithm.",
				"syntax": "Math.log(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "An implementation-dependent approximation to the natural logarithm of x"
			},
			"max": {
				"summary": "Maximum supplied value. If any value if NaN, the result is NaN. With no arguments, the result is -\u221E.",
				"syntax": "Math.max([value, \u2026])",
				"parameters": {
					"value": "A number value"
				},
				"returns": "The largest of the supplied arguments"
			},
			"min": {
				"summary": "Minimum supplied value. If any value if NaN, the result is NaN. With no arguments, the result is +\u221E.",
				"syntax": "Math.min([value, \u2026])",
				"parameters": {
					"value": "A number value"
				},
				"returns": "The smallest of the supplied arguments"
			},
			"pow": {
				"summary": "Raises a number to the specified power.",
				"syntax": "Math.pow(x, y)",
				"parameters": {
					"x": "A number value",
					"y": "A number value"
				},
				"returns": "An implementation-dependent approximation to the result of raising x to the power of y"
			},
			"random": {
				"summary": "Generates a random or pseudo-random number that is \u2265 0 but < 1. ",
				"syntax": "Math.random()",
				"returns": "A random number"
			},
			"round": {
				"summary": "Round to the nearest integer. If two integer values are equally close to x, the result is the value that is closer to \u221E.",
				"syntax": "Math.round(x)",
				"parameters": {
					"x": "A number value"
				},
				"returns": "The Number value that is closest x and is equal to a mathematical integer"
			},
			"sin": {
				"summary": "Sine.",
				"syntax": "Math.sin(x)",
				"parameters": {
					"x": "A number value, expressed in radians",
				},
				"returns": "An implementation-dependent approximation to the sine of x"
			},
			"sqrt": {
				"summary": "Square root.",
				"syntax": "Math.sqrt(x)",
				"parameters": {
					"x": "A number value",
				},
				"returns": "An implementation-dependent approximation to the square root of x"
			},
			"tan": {
				"summary": "Tangent.",
				"syntax": "Math.tan(x)",
				"parameters": {
					"x": "A number value, expressed in radians",
				},
				"returns": "Returns an implementation-dependent approximation to the tangent of x"
			}
		}
	},
	"NaN": { "summary": "Number value that is a IEEE 754 “Not-a-Number” value. To ECMAScript code, all values of NaN are indistinguishable from one another. Use the isNaN function to check if a value is NaN." },
	"undefined": { "summary": "Defined to be undefined. Any value that has not been assigned a value has the value undefined. Use the typeof operator to check for this value." }
}
