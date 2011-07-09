var File = require('fs');
var Path = require('path');
var Util = require("util");
var HTTP = require("http");
var Sandbox = require("./lib/sandbox");
var FactoidServer = require("./lib/factoidserv");
var FeelingLucky = require("./lib/feelinglucky");

var Bot = require("./lib/irc");


var JSBot = function(profile) {
	this.sandbox = new Sandbox(Path.join(__dirname, "ecmabot-utils.js"));
	this.factoids = new FactoidServer(Path.join(__dirname, "ecmabot-factoids.json"));

	Bot.call(this, profile);
	this.set_log_level(this.LOG_ALL);
	this.set_trigger("!"); // Exclamation
};


Util.inherits(JSBot, Bot);


JSBot.prototype.init = function() {
	Bot.prototype.init.call(this);
	
	this.register_listener(/^((?:sm?|v8?|js?|>>?)>)([^>].*)+/, this.execute_js);
	
	//this.register_listener(/^(\S+)(\+\+|--);?$/, this.do_beers);
	
	this.register_listener(/\bi(?:\u0027| wi)?ll try\b/i,
		this.there_is_no_try);
	
	this.register_command("g", this.g, {
		help: "Run this command with a search query to return the first Google result. Usage: !g kitten images"});
	
	this.register_command("google", this.google, {
		help: "Returns a link to a Google search page of the search term. Usage: !google opencourseware computational complexity"});
	
	this.register_command("mdn", this.mdn, {
		help: "Search the Mozilla Developer Network. Usage: !mdn bitwise operators"});
	this.register_command("mdc", "mdn");
		
	this.register_command("ecma", this.ecma, {
		help: "Lookup a section from the ECMAScript spec. Usage: !ecma null value"});
	
	this.register_command("re", this.re, {
		help: "Usage: !re Your text here /expression/gi || FLAGS: (g: global match, i: ignore case)"});
	
	this.register_command("find", this.find);
	
	this.register_command("help", this.help);
	
	this.register_command("learn", this.learn, {
		allow_intentions: false,
		help: "Add factoid to bot. Usage: !learn ( [alias] foo = bar | foo =~ s/expression/replace/gi )"});
		
	this.register_command("forget", this.forget, {
		allow_intentions: false,
		help: "Remove factoid from bot. Usage: !forget foo"});
	
	this.register_command("commands", this.commands);
	
	this.on('command_not_found', this.command_not_found);
	
	this.load_ecma_ref();
	
};


JSBot.prototype.g = function(context, text) {

	if (!text) {
		context.channel.send_reply (context.sender, this.get_command_help("g"));
		return;
	}
	
	FeelingLucky(text, function(data) {
		if (data) {
			context.channel.send_reply (context.intent, 
				"\x02"+data.title+"\x0F \x032<"+data.url+">\x0F", {color: true});
		} else {
			context.channel.send_reply (context.sender, "No search results found.");
		}
	});
};


JSBot.prototype.google = function(context, text) {

	if (!text) {
		context.channel.send_reply (context.sender, this.get_command_help("google"));
		return;
	}
	
	context.channel.send_reply (context.intent, "Google search: \""+text+"\" <http://www.google.com/search?q="+encodeURIComponent(text)+">");
};


JSBot.prototype.there_is_no_try = function(context, text) {
	var hours = 1000*60*60;
	var now = +new Date();

	if (now > arguments.callee.last_invocation + 3*hours ||
		typeof arguments.callee.last_invocation === "undefined") {

		context.channel.send_reply(context.sender, "Do or do not; there is no try. --Yoda");
		arguments.callee.last_invocation = now;

	}
};


JSBot.prototype.do_beers = function(context, text, nick, operation) {
	/**
	 * /(\S+)\s*(?:(\+\+|--)|=\s*(?:\1)\s*(\+|-)\s*1);?/
	 * TODO: More advanced beer management
	 **/
	if (operation === "++") {
		if (nick.toLowerCase() !== "c") {
			context.channel.send_reply(context.sender, "Even if " + nick +
				" deserves any beer, I don't have any to spare.");
		} else {
			context.channel.send_reply(context.sender, "C doesn't deserve beer.");
		}
	} else {
		context.channel.send_action(
			"steals a beer a from " + nick + ", since we're taking 'em.");
	}
};


JSBot.prototype.execute_js = function(context, text, command, code) {
	var engine;
	
	/* This should be temporary. */
	if (!context.priv) {
		if (command === "v8>" && context.channel.userlist["v8bot"]) {
			return;
		}
		if (command === "js>" && context.channel.userlist["gbot2"]) {
			return;
		}
	}
	
	switch (command) {
	case ">>>":
	case "v>":
	case "v8>":
		engine = Sandbox.V8; break;
	default:
		engine = Sandbox.SpiderMonkey; break;
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

			context.channel.send_reply(context.intent, reply, {truncate: true});
		} catch (e) {
			context.channel.send_reply(
				context.intent, "Unforeseen Error: "+e.name+": "+e.message);
		}
	}, this);
};


JSBot.prototype.re = function(context, msg) {
	// Okay first we need to check for the regex literal at the end
	// The regular expression to match a real js regex literal
	// is too long, so we need to use a simpler one.
	var regexmatches, regexliteral = /\/((?:[^\\\/]|\\.)*)\/([gi]*)$/;
	
	if (regexmatches = msg.match(regexliteral)) {
		try {
			var regexpobj = new RegExp(regexmatches[1], regexmatches[2]);
		} catch (e) {
			/* We have an invalid regular expression */
			context.channel.send_reply(context.sender, e.message);
			return;
		}
		
		var texttomatch = msg.slice(0, -regexmatches[0].length).trim();
		var result = texttomatch.match(regexpobj);
		if (result === null) {
			context.channel.send_reply(context.intent, "No matches found.");
			return;
		}

		var reply = [];
		for (var i = 0, len = result.length; i < len; i++) {
			reply.push(typeof result[i] !== "undefined" ?
				"'"+result[i]+"'" :
				"[undefined]");
		}
		
		context.channel.send_reply(context.intent, "Matches: "+reply.join(", "), {truncate: true});
	} else {
		context.channel.send_reply(context.sender, this.get_command_help("re"));
	}
};


JSBot.prototype.parse_regex_literal = function(text) {
	var regexparsed = text.match(/s\/((?:[^\\\/]|\\.)*)\/((?:[^\\\/]|\\.)*)\/([gi]*)$/);
	if (!regexparsed) {
		throw new SyntaxError("Syntax is `s/expression/replacetext/gi`.");
	}

	var regex = new RegExp(regexparsed[1], regexparsed[3]);
	return [regex, regexparsed[2].replace(/\\\//g, '/')];
};


JSBot.prototype.learn = function(context, text, command) {

	try {
		var parsed = text.match(/^(alias)?\s*(.+?)\s*(=~?)\s*(.+)$/i);
		if (!parsed) {
			return context.channel.send_reply(context.sender, this.get_command_help(command));
		}

		var alias = !!parsed[1];
		var factoid = parsed[2];
		var operation = parsed[3];
		var value = parsed[4];

		if (alias) {
			var key = this.factoids.alias(factoid, value);
			context.channel.send_reply(context.sender,
				"Learned `"+factoid+"` => `"+key+"`.");
			return;
		}

		/* Setting the text of a factoid */ 
		if (operation === "=") {
			this.factoids.learn(factoid, value);
			context.channel.send_reply(context.sender, "Learned `"+factoid+"`.");
			return;

		/* Replacing the text of a factoid based on regular expression */
		} else if (operation === "=~") {
			var regexinfo = this.parse_regex_literal (value);
			var regex = regexinfo[0];
			var old = this.factoids.find(factoid, false);
			var result = old.replace(regex, regexinfo[1]);

			if (old === result) {
				context.channel.send_reply(context.sender, "Nothing changed.");
			} else {
				this.factoids.learn(factoid, result);
				context.channel.send_reply(context.sender, "Changed `"+factoid+
					"` to: "+result);
			}
			return;

		}

	} catch (e) {
		context.channel.send_reply(context.sender, e);
	}
};


JSBot.prototype.forget = function(context, text, comment) {

	if (!text) {
		return context.channel.send_reply(context.sender, this.get_command_help(command));
	}
	
	try {
		this.factoids.forget(text);
		context.channel.send_reply(context.sender, "Forgot '"+text+"'.");
	} catch(e) {
		context.channel.send_reply(context.sender, e);
	}
};

JSBot.prototype.commands = function(context, text) {
	var commands = this.get_commands();
	var trigger = this.__trigger;
	context.channel.send_reply (context.intent,
		"Valid commands are: " + trigger + commands.join(", " + trigger));
};


JSBot.prototype.find = function(context, text) {

	try {
		context.channel.send_reply(context.intent, this.factoids.find(text, true));
	} catch(e) {
		var reply = ["No factoid/command named `"+text+"`."],
		    found = this.factoids.search(text);
		
		if (found.length) {
			if (found.length > 1) found[found.length-1] = "or "+found[found.length-1];
			reply.push("Did you mean: "+found.join(", ")+"?");
		}
		
		reply.push("See !commands for a list of commands.");
		context.channel.send_reply(context.sender, reply.join(" "));
	}
};


JSBot.prototype.help = function(context, text) {

	try {
		if (!text) {
			return this.command_not_found (context, "help");
		}
		
		context.channel.send_reply(context.intent, this.get_command_help(text));
	} catch(e) {
		context.channel.send_reply(context.sender, e);
	}
};


JSBot.prototype.mdn = function(context, text, command) {
	if (!text) {
		return this.command_not_found (context, command);
	}

	this.g (context, "site:developer.mozilla.org "+text);
};


JSBot.prototype.command_not_found = function(context, text) {

	if (context.priv) {
		return this.find(context, text);
	}
	
	try {
		context.channel.send_reply(context.intent, this.factoids.find(text, true));
	} catch(e) {
		// Factoid not found, do nothing.
	}
};

// JSON.stringify([].slice.call(document.querySelectorAll('#toc-full a')).map(function(v) {return {title: v.firstChild.textContent, id: v.href.replace(/.+#/, '')};}));
// Use that to generate the required JSON from es5.github.com with Firefox

JSBot.prototype.ecma = function(context, text) {
	try {

	if (typeof this.ecma_ref === "undefined") {
		context.channel.send_reply(context.sender, "The ECMA-262 reference is not loaded.");
		return;
	}

	text = text.toLowerCase();
	var ref = this.ecma_ref, ch = text.charCodeAt(0);
	
	// If text begins with a number, the search must match at the beginning of the string
	var muststart = ch >= 48 && ch <= 57; 
	
	for (var i = 0, len = ref.length; i < len; i++) {
		var item = ref[i], title = item.title.toLowerCase();
		if (muststart ? title.substring(0, text.length) === text : ~title.indexOf(text)) {
			context.channel.send_reply(context.intent,
				"Found: " + item.title + " <http://es5.github.com/#" + item.id + ">");
			return;
		}
	}

	throw new Error("Could not find text '"+text+"' in the ECMAScript 5.1 Table of Contents.");

	} catch (e) { context.channel.send_reply(context.sender, e); }
};


JSBot.prototype.load_ecma_ref = function() {
	var filename = Path.join(__dirname, "ecmabot-reference.json");
	Util.puts("Loading ECMA-262 reference...");
	var bot = this;
	File.readFile(filename, function (err, data) {
		if (err) Util.puts(Util.inspect(err));
		try {
			bot.ecma_ref = JSON.parse(data);
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

var profile = require("./ecmabot-profile.js");
(new JSBot(profile)).init();
