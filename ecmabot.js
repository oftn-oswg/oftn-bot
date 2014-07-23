var file = require('fs');
var path = require('path');
var util = require("util");
var http = require("http");

var Sandbox = require("./lib/sandbox");
var FactoidServer = require("./lib/factoidserv");
var FeelingLucky = require("./lib/feelinglucky");
var CanIUseServer = require("./lib/caniuse");

var Bot = require("./lib/irc");
var Shared = require("./shared");


var JSBot = function(profile) {
	this.sandbox = new Sandbox(path.join(__dirname, "ecmabot-utils.js"));
	this.factoids = new FactoidServer(path.join(__dirname, "ecmabot-factoids.json"));
	this.caniuse_server = new CanIUseServer;
	this.executeRegex = /^((?:sm|v8|js|>>?|\|)>)([^>].*)+/;

	Bot.call(this, profile);
	this.set_log_level(this.LOG_ALL);
	this.set_trigger("!"); // Exclamation
};


util.inherits(JSBot, Bot);


JSBot.prototype.init = function() {
	Bot.prototype.init.call(this);

	this.register_listener(this.executeRegex, Shared.execute_js);

	//this.register_listener(/^(\S+)(\+\+|--);?$/, this.do_beers);

	this.register_command("g", Shared.google, {
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

	this.register_command("caniuse", this.caniuse, {
		help: "Search the caniuse.com database. Usage: !caniuse webgl"});
	this.register_command("ciu", "caniuse");

	this.register_command("find", Shared.find);

	this.register_command("help", this.help);
	
	this.register_command("klingon", function (context) {
		var quotes = ["\"This code is a piece of crap! You have no honor!\"",
		"\"A TRUE Klingon warrior does not comment his code!\"",
		"\"By filing this bug you have questioned my family honor. Prepare to die!\"",
		"\"You question the worthiness of my Code?! I should kill you where you stand!\"",
		"\"Our competitors are without honor!\"",
		"\"Specs are for the weak and timid!\"",
		"\"Perhaps it IS a good day to Die! I say we ship it!\"",
		"\"My program has just dumped Sto'Vo'Kor!\"",
		"\"Behold, the keyboard of Kah-less! The greatest Klingon code warrior that ever lived!\"",
		"\"I have challenged the entire ISO-9000 review team to a round of Bat-Leth practice on the holodeck. They will not concern us again.\"",
		"\"C++? That is for children. A Klingon Warrior uses only machine code, keyed in on the front panel switches in raw binary.\"",
		"\"Debugging? Klingons do not debug. Bugs are good for building character in the user.\"",
		"\"Defensive programming? Never! Klingon programs are always on the offense. Yes, Offensive programming is what we do best.\"",		"\"Klingon multitasking systems do not support \"time-sharing\". When a Klingon program wants to run, it challenges the scheduler in hand-to-hand combat and owns the machine.\"",
		"\"Klingon function calls do not have 'parameters' - they have 'arguments' - and they ALWAYS WIN THEM.\"",
		"\"You humans call this thing a 'cursor' and you move it with 'mouse'! Bah! A Klingon would not use such a device. We have a Karaghht-Gnot - which is best translated as \"An Aiming Daggar of 16x16 pixels\" and we move it using a Gshnarrrf which is a creature from the Klingon homeworld which posesses just one, (disproportionately large) testicle...which it rubs along the ground.....uh do we really need to talk about this?\"",
		"\"I am without honor...my children are without honor... My father coded at the Battle of Khitomer...and...and...he... HE ALLOWED HIMSELF TO BE MICROMANAGED.\" <shudder>",
		"\"Klingons do not make software 'releases'. Our software 'escapes'. Typically leaving a trail of wounded programmers in it's wake.\"",
		"\"Microsoft is actually a secret Ferengi-Klingon alliance designed to cripple the Federation. The Ferengi are doing the marketing and the Klingons are writing the code.\"",
		"\"Klingons do not believe in indentation - except perhaps in the skulls of their program managers.\""];
		context.channel.send_reply(context.sender, quotes[Math.floor(quotes.length*Math.random())]);
	});
	
	this.register_command("auth", Shared.reauthenticate, {
		allow_intentions: false,
		help: "Attempt to re-authenticate with NickServ."});

	this.register_command("learn", Shared.learn, {
		allow_intentions: false,
		help: "Add factoid to bot. Usage: !learn ( [alias] foo = bar | foo =~ s/expression/replace/gi )"});

	this.register_command("forget", Shared.forget, {
		allow_intentions: false,
		help: "Remove factoid from bot. Usage: !forget foo"});

	this.register_command("commands", Shared.commands);

	this.on('command_not_found', this.command_not_found);

	this.load_ecma_ref();

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
		return Shared.findPlus.call(this, context, command);
	}

	Shared.google (context, "site:developer.mozilla.org "+text);
};


JSBot.prototype.command_not_found = function(context, text) {
	Shared.findPlus.call(this, context, text, !context.priv);
};

// JSON.stringify([].slice.call(document.querySelectorAll('#toc-full a')).map(function(v) {return {title: v.firstChild.textContent, id: v.href.replace(/.+#/, '')};}));
// Use that to generate the required JSON from es5.github.io with Firefox

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
				"Found: " + item.title + " <http://es5.github.io/#" + item.id + ">");
			return;
		}
	}

	throw new Error("Could not find text '"+text+"' in the ECMAScript 5.1 Table of Contents.");

	} catch (e) { context.channel.send_reply(context.sender, e); }
};


JSBot.prototype.load_ecma_ref = function() {
	var filename = path.join(__dirname, "ecmabot-reference.json");
	util.puts("Loading ECMA-262 reference...");
	var bot = this;
	file.readFile(filename, function (err, data) {
		if (err) util.puts(util.inspect(err));
		try {
			bot.ecma_ref = JSON.parse(data);
		} catch (e) {
			util.puts("ECMA-262 Error: "+e.name+": "+e.message);
		}
	});
	if (typeof this.ecma_ref_watching === "undefined") {
		this.ecma_ref_watching = true;
		file.watchFile(filename, function (curr, prev) {
			util.puts("ECMA-262 reference file has changed.");
			bot.load_ecma_ref();
		});
	}
};

JSBot.prototype.caniuse = function(context, text) {
	try {
		var text = this.caniuse_server.search(text);
		context.channel.send_reply(context.intent, text, {color: true});
	} catch(e) {
		context.channel.send_reply(context.sender, e);
	}
};

var profile = require("./ecmabot-profile.js");
(new JSBot(profile)).init();
