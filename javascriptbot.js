var File = require('fs');
var Util = require("util");
var HTTP = require("http");
var Sandbox = require("./lib/sandbox");
var SandboxUtils = require("./lib/sandbox/utils");
var FactoidServer = require("./lib/factoidserv").FactoidServer;

var IRCLib   = require("./lib/irc");
var IRCBot   = IRCLib.IRCBot;
var IRCUtils = IRCLib.Utilities;


var V8Bot = function(profile) {
	this.sandbox = new Sandbox();
	this.factoids = new FactoidServer(__dirname+'/lib/factoidserv/static/factoids.json');

	IRCBot.call(this, profile);
	this.set_log_level(this.LOG_ALL);
	this.set_command_identifier("!"); // Exclamation
	this.load_ecma_ref();
};


Util.inherits(V8Bot, IRCBot);


V8Bot.prototype.init = function() {
	IRCBot.prototype.init.call(this);

	this.register_listener(/^(sm?|v8?|js?|>>?)>([^>].*)+/, this.execute_js);
	this.register_listener(/^(\S+)(\+\+|--);?$/, this.do_beers);
	this.register_listener(/\bi(?:\u0027| wi)?ll try\b/i,
		this.there_is_no_try);
		
	/*this.register_command("dick", function(cx, text) {
		var reply = "8"+(Array(1+((Math.random()*9)|0)).join("="))+"D";
		cx.channel.send(cx.intent.name+": "+reply);
	}); //*/
	
	this.register_command("raw", function(cx, text) {
		if (cx.sender.name === "eboyjr") {
			cx.client.raw(text);
		} else {
			cx.channel.send(cx.sender.name +
				": You need to be eboyjr to send raw commands.");
		}
	}, {allow_indentions: false, hidden: true});
	
	this.register_command("ecma", this.ecma);
	this.register_command("re", this.re);
	this.register_command("topic", this.topic);
	this.register_command("quit", this.quit_command, {hidden: true});
	this.register_command("lmgtfy", this.lmgtfy);
	this.register_command("learn", this.learn, {allow_intentions: false});
	this.register_command("forget", this.forget, {allow_intentions: false});
	this.on('command_not_found', this.command_not_found);
	
};


V8Bot.prototype.lmgtfy = function(cx, text) {
	if (text) {
		var reply = "http://www.lmgtfy.com/?q="+encodeURIComponent(text);
		cx.channel.send(cx.intent.name+": "+reply);
	}
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
	 * TODO: More advanced beer management
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
	var engine;
	switch (command) {
	case ">>":
		engine = "v8"; break;
	case ">":
		engine = "js"; break;
	default:
	//case "v8": case "v":
	//case "sm": case "s": case "js": case "j":
		return;
	}
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
					reply = "undefined";
				}
			}
			
			if (Array.isArray(result.data.console) && result.data.console.length) {
				// Add console log output
				reply += "; Console: "+result.data.console.join(", ");
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
			reply.push(typeof result[i] !== "undefined" ?
				SandboxUtils.string_format(result[i]) :
				"[undefined]");
		}
		this.send_truncated(cx.channel, "Matches: "+reply.join(", "),
			cx.intent.name+": ");
	} else {
		cx.channel.send(cx.sender.name+
			": Invalid syntax || USAGE: `re Your text here /expression/flags || FLAGS: (g: global match, i: ignore case)");
	}
};


V8Bot.prototype.topic = function(cx) {
	cx.channel.send(cx.intent.name+": "+cx.channel.topic);
};


V8Bot.prototype.quit_command = function(cx) {
	if (cx.sender.name == "eboyjr") this.quit();
};


V8Bot.prototype.learn = function(cx, text) {

	try {
		var parsed = text.match(/^(alias)?\s*(.+?)\s*(=~?)\s*(.+)$/i);
		if (!parsed) {
			throw new SyntaxError(
				"Syntax is `learn ( [alias] foo = bar | foo =~ s/expression/replace/gi )`.");
		}

		var alias = !!parsed[1];
		var factoid = parsed[2];
		var operation = parsed[3];
		var value = parsed[4];

		if (alias) {
			var key = this.factoids.alias(factoid, value);
			cx.channel.send(cx.sender.name +
				": Learned `"+factoid+"` => `"+key+"`.");
			return;
		}

		/* Setting the text of a factoid */ 
		if (operation === "=") {
			this.factoids.learn(factoid, value);
			cx.channel.send(cx.sender.name + ": Learned `"+factoid+"`.");
			return;

		/* Replacing the text of a factoid based on regular expression */
		} else if (operation === "=~") {
			var regexparsed = value.match(/s\/((?:[^\\\/]|\\.)*)\/((?:[^\\\/]|\\.)*)\/([gi]*)$/);
			if (!regexparsed) {
				throw new SyntaxError("Syntax is `learn foo =~ s/expression/replacetext/gi`.");
			}

			var regex = new RegExp(regexparsed[1], regexparsed[3]);
			var result = this.factoids.find(factoid, false)
				.replace(regex, regexparsed[2].replace(/\\\//g, '/'));

			this.factoids.learn(factoid, result);
			cx.channel.send(cx.sender.name+": Changed `"+factoid+
				"` to: "+result);
			return;

		}

	} catch (e) {
		cx.channel.send(cx.sender.name+": "+e);
	}
};


V8Bot.prototype.forget = function(cx, text) {
	try {
		this.factoids.forget(text);
		cx.channel.send(cx.sender.name + ": Forgot '"+text+"'.");
	} catch(e) {
		cx.channel.send(cx.sender.name + ": " + e);
	}
};


V8Bot.prototype.command_not_found = function(cx, text) {

	try {
		cx.channel.send(cx.intent.name+": "+this.factoids.find(text, true));
	} catch(e) {
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
	nick: "jsbotjr",
	password: null,
	user: "javascript-bot",
	real: "v8bot clone by eboyjr",
	channels: ["##javascript", "##jsbotjr", "#inimino", "#v8bot", "#v8"]
}])).init();
