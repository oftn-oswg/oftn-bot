var File = require('fs');
var Util = require("util");
var Sandbox = require("./lib/sandbox");
var SandboxUtils = require("./lib/sandbox/utils");
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

	this.register_listener(/^(>>>?)([^>].*)+/, this.execute_js);
	this.register_listener(/^(\S+)(\+\+|--);?$/, this.do_beers);
	this.register_listener(/\bi(?:\u0027| wi)?ll try\b/i,
		this.there_is_no_try);
		
	this.register_command("dick", function(cx, text) {
		var reply = "8"+(new Array(1+((Math.random()*9)|0)).join("="))+"D";
		cx.channel.send(cx.intent.name+": "+reply);
	});
	
	this.register_command("raw", function(cx, text) {
		if (cx.sender.name === "eboyjr") {
			cx.client.raw(text);
		} else {
			cx.channel.send(cx.sender.name +
				": You need to be eboyjr to send raw commands.");
		}
	});
	
	this.register_command("ecma", this.ecma);
	this.register_command("re", this.re);
	this.register_command("about", this.about);
	this.register_command("topic", this.topic);
	this.register_command("quit", this.quit_command);
	this.register_command("help", this.help);
	this.register_command("learn", this.learn);
	this.register_command("forget", this.forget);
	this.on('command_not_found', this.command_not_found);
	
};


V8Bot.prototype.there_is_no_try = function(cx, text) {
	var hours = 1000*60*60;
	var now = +new Date();

	if (now > arguments.callee.last_invocation + 3*hours ||
		typeof arguments.callee.last_invocation === "undefined") {

		cx.channel.send(cx.sender.name +
			": Do or do not... there is no `try`. -- Yoda");
		arguments.callee.last_invocation = now;

	}
};


V8Bot.prototype.do_beers = function(cx, text, nick, operation) {
	/**
	 * /(\S+)\s*(?:(\+\+|--)|=\s*(?:\1)\s*(\+|-)\s*1);?/
	 * More advanced beer management
	 **/
	if (operation === "++") {
		if (nick.toLowerCase() !== "c") {
			cx.channel.send(cx.sender.name + ": Even if " + nick +
				" deserves any beer, I don't have any to spare.");
		} else {
			cx.channel.send(cx.sender.name + ": C doesn't deserve beer.");
		}
	} else {
		cx.channel.send_action(
			"steals a beer a from " + nick + ", since we're taking 'em.");
	}
};


V8Bot.prototype.execute_js = function(cx, text, command, code) {
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
			
			if (Array.isArray(result.data.console)) {
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
};


V8Bot.prototype.re = function(cx, msg) {
	// Okay first we need to check for the regex literal at the end
	// The regular expression to match a real js regex literal
	// is too long, so we need to use a simpler one.
	var regexmatches, regexliteral = /\/((?:[^\\\/]|\\.)*)\/([gi]*)$/;
	
	if (regexmatches = msg.match(regexliteral)) {
		try {
			var regexpobj = new RegExp(regexmatches[1], regexmatches[2]);
		} catch (e) {
			/* We have an invalid regular expression */
			cx.channel.send(cx.sender.name+": "+e.message);
			return;
		}
		
		var texttomatch = IRCUtils.trim(msg.substr(0, msg.length-regexmatches[0].length));
		var result = texttomatch.match(regexpobj);
		if (result === null) {
			cx.channel.send(cx.intent.name+": No matches found.");
			return;
		}
		
		var reply = [];
		for (var i = 0, len = result.length; i < len; i++) {
			reply.push(SandboxUtils.string_format(result[i]));
		}
		this.send_truncated(cx.channel, "Matches: "+reply.join(", "),
			cx.intent.name+": ");
	} else {
		cx.channel.send(cx.sender.name+
			": Invalid syntax || USAGE: `re Your text here /expression/flags || FLAGS: (g: global match, i: ignore case)");
	}
};


V8Bot.prototype.about = function(cx, text) {
	cx.channel.send(cx.intent.name + ": "+cx.client.nick +
		" is an IRC bot written entirely in Javascript using Google's v8 Javascript engine and Node.js. Credits: eboyjr, eisd, Tim_Smart, gf3, MizardX, inimino. Source: https://github.com/eboyjr/vbotjr/");
};


V8Bot.prototype.topic = function(cx) {
	cx.channel.send(cx.intent.name+": "+cx.channel.topic);
};


V8Bot.prototype.quit_command = function(cx) {
	if (cx.sender.name == "eboyjr") this.quit();
};


V8Bot.prototype.help = function(cx) {
	cx.channel.send(cx.intent.name + ": Use the `>>` command for the SpiderMonkey JavaScript interpreter, and use the `>>>` command for the V8 JavaScript interpreter.");
};


V8Bot.prototype.learn = function(cx, text) {
	var eq = text.indexOf('=');
	
	if (~eq) {
		if (text.substr(0, 5).toLowerCase() === "alias") {
			var factoid = IRCUtils.trim(text.substr(5, eq-5));
			var alias = IRCUtils.trim(text.substr(eq+1));

			try {
				var key = this.factoids.alias(factoid, alias);
				if (key) {
					cx.channel.send(cx.sender.name +
						": Learned `"+factoid+"` => `"+key+"`.");
				} else {
					cx.channel.send(cx.sender.name +
						": There is no `"+alias+"`.");
				}
			} catch (e) {
				cx.channel.send(cx.sender.name+": "+e);
			}
			return;
		}
	
		var factoid = IRCUtils.trim(text.substr(0, eq));
		var content = IRCUtils.trim(text.substr(eq+1));

		this.factoids.learn(factoid, content);
		cx.channel.send(cx.sender.name + ": Learned `"+factoid+"`.");
		return;
	}
	
	cx.channel.send(cx.sender.name + ": Error: Syntax is `learn [alias] foo = bar`.");
};


V8Bot.prototype.forget = function(cx, text) {
	var factoid = text;
	
	if (this.factoids.forget(factoid)) {
		cx.channel.send(cx.sender.name + ": Forgot '"+factoid+"'.");
	} else {
		cx.channel.send(cx.sender.name + ": Error: '"+factoid+"' was not a factoid.");
	}
};


V8Bot.prototype.command_not_found = function(cx, text) {
	
	var fc = this.factoids.find(text);
	if (fc) {
		cx.channel.send(cx.intent.name+": "+fc);
	} else {
		var reply = [cx.sender.name+": '"+text+"' is not recognized."],
		    found = this.factoids.search(text);
		
		if (found.length) {
			if (found.length > 1) found[found.length-1] = "or "+found[found.length-1];
			reply.push("Did you mean: "+found.join(", ")+"?");
		}
		
		reply.push("Valid commands are: "+this.get_commands().join(", "));
		cx.channel.send(reply.join(" "));
	}
};


V8Bot.prototype.ecma = function(cx, text) {
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
