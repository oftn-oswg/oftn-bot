var File = require('fs');
var Util = require("util");
var Sandbox = require("./lib/sandbox");
var FactoidServer = require("./lib/factoidserv").FactoidServer;

var IRCLib   = require("./lib/irc");
var IRCBot   = IRCLib.IRCBot;
var IRCUtils = IRCLib.Utilities;

var V8Bot = function(profile) {
	this.sandbox = new Sandbox();
	this.factoids = new FactoidServer('./factoids/factoids.json');

	IRCBot.call(this, profile);
	this.set_log_level(this.LOG_ALL);
	this.set_command_identifier("!"); // Exclamation
	this.load_ecma_ref();
};

Util.inherits(V8Bot, IRCBot);

V8Bot.prototype.init = function() {
	IRCBot.prototype.init.call(this);

	// >> command to execute javascript code
	this.register_listener(/^(>>>?)([^>].*)+/, function(cx, text, command, code) {
		var engine = (command === ">>>" ? "v8" : "js");
		this.sandbox.run(engine, 2000, code, function(result) {
			var reply;

			try {
				/* If theres an error, show that.
				   If not, show the type along with the result */
				if (result.error !== null) {
					reply = result.error;
				} else {
					if (result.data.type !== "undefined") {
						reply = (result.data.obvioustype ? "" :
							"("+result.data.type+") ") + result.result;
					} else {
						reply = "undefined (Nothing returned)";
					}
				}
				
				if (typeof result.data.console !== "undefined") {
					// Add console log output
					if (result.data.console.length) {
						reply += "; Console: "+result.data.console.join(", ");
					}
				}

				this.send_truncated(cx.channel, reply, cx.intent.name+": ");
			} catch (e) {
				cx.channel.send(
					cx.intent.name+": Unforseen Error: "+e.name+": "+e.message);
			}
		}, this);
	});

	this.register_listener(/^(\S+)(\+\+|--);?$/,
		function(cx, text, nick, operation) {
		if (operation === "++") {
			if (nick.toLowerCase() !== "c") {
				cx.channel.send(cx.sender.name + ": Even if " + nick +
					" deserves any beer, I don't have any to spare.");
			} else {
				cx.channel.send(cx.sender.name + ": C doesn't deserve beer.");
			}
		} else {
			channel.send_action(
				"steals a beer a from " + nick + ", since we're taking 'em.");
		}
	});

	// Generates a randomly-sized dick each time
	this.register_command("dick", function(cx, text) {
		var reply = "8"+(new Array(1+((Math.random()*9)|0)).join("="))+"D";
		cx.channel.send(cx.intent.name+": "+reply);
	});

	// Generates an ascii unicorn
	this.register_command("cornify", function(cx, text) {
		cx.channel.send(cx.intent.name+": `^nn~");
	});

	// Generates kirby
	this.register_command("kirby", function(cx, text) {
		cx.channel.send(cx.intent.name+": <(n_n<) <(n_n)> (>n_n)>");
	});

	// Raw irc command
	this.register_command("raw", function(cx, text) {
		if (cx.sender.name === "eboyjr") {
			cx.client.raw(text);
		} else {
			cx.channel.send(cx.sender.name +
				": You need to be eboyjr to send raw commands.");
		}
	});

	// ECMA-262 Reference
	this.register_command("ecma", function(cx, text) {
		try {

		if (typeof this.ecma_ref === "undefined") {
			cx.channel.send(cx.sender.name + ": The ECMA-262 reference is not loaded.");
			return;
		}

		var chain = text.replace(/[^A-Z0-9_.]/gi, '').split(".");
		var len = chain.length;
		if (!len) {
			cx.channel.send(cx.sender.name + ": No arguments");
			return;
		}
		var result;
		newaccess: for (var i = 0; i < len; i++) {
			if (i === 0) {
				if (typeof this.ecma_ref[chain[i]] !== "undefined") {
					result = this.ecma_ref[chain[i]];
					continue newaccess;
				}
				cx.channel.send(
					cx.sender.name + ": Unexpected '" + chain[i] +
					"'; Expected built-in ECMA-262 object (" +
					Object.keys(this.ecma_ref).sort().join(", ") +
					")");
				return;
			}
			if (typeof result.properties !== "undefined") {
				if (typeof result.properties[chain[i]] !== "undefined") {
					result = result.properties[chain[i]];
					continue newaccess;
				}
			}
			cx.channel.send(
				cx.sender.name+": "+chain.splice(0, i+1).join(".")+" is not defined.");
			return;
		}
		var string = chain.join(".");
		var reply  = [];

		// Summary
		if (typeof result.summary !== "undefined")
			reply.push(result.summary);
		else reply.push("No summary available.");

		// Syntax
		if (typeof result.syntax !== "undefined")
			reply.push("Syntax: "+result.syntax);

		// Parameters
		if (typeof result.parameters !== "undefined") {
			var parameters = [];
			parameters.push("Parameters:");
			for (var i in result.parameters) {
				parameters.push(i+" = "+result.parameters[i]+";");
			}
			reply.push(parameters.join(" "));
		}

		// Returns
		if (typeof result.returns !== "undefined") {
			reply.push("Returns: "+result.returns+".");
		}

		cx.channel.send(cx.intent.name+": "+string+": "+reply.join(" || "));

		} catch (e) { cx.channel.send(cx.sender.name+": "+e.name+": "+e.message); }
	});

	// Evalutates regular expressions
	this.register_command("re", function(cx, msg) {

		var parseRegex = (~msg.indexOf("@") ? /(.*)\s+@\s+(\S+)$/.exec(msg) : msg);
		if (Array.isArray(parseRegex) && parseRegex.length > 1) {
			parseRegex = parseRegex[1];
		}

		var mre = /^(.*)\s(?:m|(?=\/))([^\w\s\\])((?:\\.|(?!\2)[^\\])*)\2([a-z]*)\s*$/.exec(parseRegex);
		var sre = /^(.*)\ss([^\w\s\\])((?:\\.|(?!\2)[^\\])*)\2((?:\\.|(?!\2)[^\\])*)\2([a-z]*)\s*$/.exec(parseRegex);

		if (mre && mre.length >= 4) {
			var s = mre[1], r = mre[3], f = mre[4], out = [], m;

			if (~f.toLowerCase().indexOf("g")) {
				var gRegex = RegExp(r, f);
				out = s.match(gRegex).join(", ") || "No matches found.";
			} else {
				var regOut = RegExp(r, f).exec(s);
				if (regOut) out = regOut.join(", ");
				else out = "No matches found.";
			}

			cx.channel.send(cx.intent.name+": "+out);
		} else if (sre && sre.length >= 4) {
			var s = sre[1], r = sre[3], u = sre[4], f = sre[5], out = [], m;

			var gRegex = RegExp(r, f);
			out = s.replace(gRegex,u);

			cx.channel.send(cx.intent.name+": "+out);
		} else {
			cx.channel.send(cx.sender.name+": Invalid syntax: Usage: `re text /regex/flags");
		}
	});

	// About
	this.register_command("about", function(cx, text) {
		cx.channel.send(cx.intent.name + ": "+cx.client.nick +
			" is an IRC bot written mostly in Javascript using Google's v8 Javascript engine and Node.js. Credits: eboyjr, eisd, Tim_Smart, gf3, MizardX, inimino. Source: https://github.com/eboyjr/vbotjr/");
	});

	// What is the topic
	this.register_command("topic", function(cx) {
		cx.channel.send(cx.intent.name+": "+cx.channel.topic);
	});

	// Quit
	this.register_command("quit", function(cx) {
		if (cx.sender.name == "eboyjr") this.quit();
	});
	
	this.register_command("help", function(cx) {
		cx.channel.send(cx.intent.name + ": Use the `>>` command for the SpiderMonkey JavaScript interpreter, and use the `>>>` command for the V8 JavaScript interpreter.");
	});
	
	this.register_command("learn", function(cx, text) {
		var eq = text.indexOf('=');
		
		if (~eq) {
			var factoid = IRCUtils.trim(text.substr(0, eq));
			var content = IRCUtils.trim(text.substr(eq+1));
	
			this.factoids.learn(factoid, content);
			cx.channel.send(cx.sender.name + ": Learned '"+factoid+"'.");
			return;
		}
		
		cx.channel.send(cx.sender.name + ": Error: Syntax is learn foo = bar");
	});
	
	this.register_command("forget", function(cx, text) {
		var factoid = text;
		
		if (this.factoids.forget(factoid)) {
			cx.channel.send(cx.sender.name + ": Forgot '"+factoid+"'.");
		} else {
			cx.channel.send(cx.sender.name + ": Error: '"+factoid+"' was not a factoid.");
		}
	});

	this.on('command_not_found', function(cx, text) {
		
		var fc = this.factoids.find(text);
		if (typeof fc !== "undefined") {
			cx.channel.send(cx.intent.name+": "+fc);
		} else {
			var reply = [cx.sender.name+": '"+text+"' is not recognized."],
			    found = this.factoids.search(text);
			
			if (found.length) {
				if (found.length > 1) found[found.length-1] = "or "+found[found.length];
				reply.push("Did you mean: "+found.join(", ")+"?");
			}
			
			reply.push("Valid commands are: "+this.get_commands().join(", "));
			cx.channel.send(reply.join(" "));
		}
	});
	
};

V8Bot.prototype.load_ecma_ref = function() {
	var filename = "/var/www/node/vbotjr/ecma-ref.js";
	Util.puts("Loading ECMA-262 reference...");
	var bot = this;
	File.readFile(filename, function (err, data) {
		if (err) Util.puts(Util.inspect(err));
		try {
			bot.ecma_ref = eval('('+data+')');
		} catch (e) {
			Util.puts("ECMA-262 Error: "+e.name+": "+e.message);
		}
	});
	if (typeof this.ecma_ref_watching === "undefined") {
		this.ecma_ref_watching = true;
		File.watchFile(filename, function (curr, prev) {
			Util.puts("ECMA-262 reference file has changed.");
			bot.load_ecma_ref();
		});
	}
};

(new V8Bot([{
	host: "irc.freenode.net",
	port: 6667,
	nick: "vbotjr",
	password: null,
	user: "eboyjr",
	real: "A v8bot overhaul",
	channels: ["##eboyjr"]
}])).init();
