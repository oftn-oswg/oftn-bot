var File = require("fs");
var URL = require("url");
var Util = require("util");
var HTTP = require("http");
var Path = require("path");
var Sandbox = require("./lib/sandbox");
var QueryStr = require('querystring');
var FactoidServer = require("./lib/factoidserv");
var FeelingLucky = require("./lib/feelinglucky");

var Bot = require("./lib/irc");


var ΩF_0Bot = function(profile) {
	this.sandbox = new Sandbox(Path.join(__dirname, "oftnbot-utils.js"));
	this.factoids = new FactoidServer(Path.join(__dirname, "oftnbot-factoids.json"));

	Bot.call(this, profile);
	this.set_log_level(this.LOG_ALL);
	this.set_command_identifier("!"); // Exclamation
	
	this.start_github_server(9370);
	this.github_context = null;
};


Util.inherits(ΩF_0Bot, Bot);

ΩF_0Bot.prototype.init = function() {
	Bot.prototype.init.call(this);

	this.register_listener(/^(sm?|v8?|js?|>>?)>([^>].*)+/, this.execute_js);
	
	this.register_command("topic", this.topic);
	this.register_command("learn", this.learn, {allow_intentions: false});
	this.register_command("forget", this.forget, {allow_intentions: false});
	this.register_command("commands", this.commands);
	this.register_command("g", this.google);
	this.register_command("do", function(context, text) {
		
		if (context.channel.userlist[context.sender.name].operator) {
			var client = context.client, result;
			try {
				result = eval (text);
			} catch (e) {
				result = e;
			}
			if (typeof result !== "undefined") {
				context.channel.send (require("./oftnbot-utils.js").pretty_print(result).substr(0, 400));
			}
			return;
		} else {
			context.channel.send_reply(context.sender, "You must be an operator to use this command.");
		}
	}, {allow_intentions: false, hidden: true});

	this.register_command("countdown", function(cx, text) {
		var arg = parseInt(text);
		if (isNaN(arg)) { arg = 3; }
		arg = Math.max(0, Math.min(arg, 5));
		var i = setInterval(function() {
			if (arg > 0) {
				cx.channel.send(arg+"...");
			} else {
				cx.channel.send("Go!");
				clearInterval(i);
			}
			arg--;
		}, 1000);
	});
	
	this.register_command("ping", function(cx) {
		var millisecs = Math.random()*3600000|0;
		setTimeout(function() {
			cx.channel.send_reply(cx.sender, "Ping took "+(millisecs/1000|0)+" seconds");
		}, millisecs);
	});
	
	this.on('command_not_found', this.command_not_found);
	
	this.on('connect', function(client) {
		this.github_context = client;
	});
	
};


ΩF_0Bot.prototype.parse_regex_literal = function(text) {
	var regexparsed = text.match(/s\/((?:[^\\\/]|\\.)*)\/((?:[^\\\/]|\\.)*)\/([gi]*)$/);
	if (!regexparsed) {
		throw new SyntaxError("Syntax is `s/expression/replacetext/gi`.");
	}

	var regex = new RegExp(regexparsed[1], regexparsed[3]);
	return [regex, regexparsed[2].replace(/\\\//g, '/')];
};


ΩF_0Bot.prototype.start_github_server = function(port) {

	HTTP.createServer(function (request, response) {
		var chunks = [], channel;
		
		// Get the channel to send messages in from the URL
		channel = URL.parse(request.url).pathname.replace(/[^A-Z0-9\.]/ig, '').replace(/\./g, '#');
		if (!channel) {
			channel = "oftn";
		}
		channel = "#"+channel;
		
		request.setEncoding("utf8");
		request.on("data", function(chunk) {
			chunks.push(chunk);
		});
		
		// When the request has finished coming in.
		request.on("end", function() {
			var json = QueryStr.parse(chunks.join("")).payload, result = [], len;
			try {
				var data = JSON.parse(json);
				if (len = data.commits.length) {
					for (var i = 0; i < len; i++) {
						result.push("\x036* "+data.repository.name+"\x0F "+data.commits[i].message+" \x032<"+data.commits[i].url.slice(0, -33)+">\x0F\x031 "+data.commits[i].author.name+"\x0F");
					}
				}
			} catch (e) {
				result.push(e);
			}
			if (result.length) {
				if (this.github_context) {
					var chnl = this.github_context.get_channel(channel);
					for (var i = 0, len = result.length; i < len; i++) {
						chnl.send(result[i], {color: true});
					}
				}
			}
			response.end();
		}.bind(this));
	  
	}.bind(this)).listen(port);
	Util.puts("Github server running at port: "+port);
};

ΩF_0Bot.prototype.google = function(cx, text) {
	FeelingLucky(text, function(data) {
		if (data) {
			cx.channel.send_reply (cx.intent, 
				"\x02"+data.title+"\x0F \x032<"+data.url+">\x0F", {color: true});
		} else {
			cx.channel.send_reply (cx.sender, "No search results found.");
		}
	});
};


ΩF_0Bot.prototype.execute_js = function(cx, text, command, code) {
	var engine;
	switch (command) {
	case ">>":
	case "v8": case "v":
		engine = "v8"; break;
	case ">":
	case "sm": case "s": case "js": case "j":
		engine = "js"; break;
	default:
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

			cx.channel.send_reply(cx.intent, reply, {truncate: true});
		} catch (e) {
			cx.channel.send_reply(
				cx.intent, "Unforeseen Error: "+e.name+": "+e.message);
		}
	}, this);
};


ΩF_0Bot.prototype.topic = function(cx, text) {
	try {
		if (text) {
			var regexinfo = this.parse_regex_literal(text);
			var regex = regexinfo[0];
		
			var topic = cx.channel.topic.replace(regex, regexinfo[1]);
			if (topic === cx.channel.topic) throw new Error("Nothing changed.");
		
			cx.client.get_user("ChanServ").send("TOPIC "+cx.channel.name+" "+topic.replace(/\n/g, ''));
			//cx.channel.set_topic(topic);
		} else {
			cx.channel.send_reply(cx.intent, cx.channel.topic);
		}
	} catch (e) {
		cx.channel.send_reply(cx.sender, e);
	}
};


ΩF_0Bot.prototype.learn = function(cx, text) {

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
			cx.channel.send_reply(cx.sender,
				"Learned `"+factoid+"` => `"+key+"`.");
			return;
		}

		/* Setting the text of a factoid */ 
		if (operation === "=") {
			this.factoids.learn(factoid, value);
			cx.channel.send_reply(cx.sender, "Learned `"+factoid+"`.");
			return;

		/* Replacing the text of a factoid based on regular expression */
		} else if (operation === "=~") {
			var regexinfo = this.parse_regex_literal (value);
			var regex = regexinfo[0];
			var old = this.factoids.find(factoid, false);
			var result = old.replace(regex, regexinfo[1]);

			if (old === result) {
				cx.channel.send_reply(cx.sender, "Nothing changed.");
			} else {
				this.factoids.learn(factoid, result);
				cx.channel.send_reply(cx.sender, "Changed `"+factoid+
					"` to: "+result);
			}
			return;

		}

	} catch (e) {
		cx.channel.send_reply(cx.sender, e);
	}
};


ΩF_0Bot.prototype.forget = function(cx, text) {
	try {
		this.factoids.forget(text);
		cx.channel.send_reply(cx.sender, "Forgot '"+text+"'.");
	} catch(e) {
		cx.channel.send_reply(cx.sender, e);
	}
};


ΩF_0Bot.prototype.commands = function(cx, text) {
	cx.channel.send_reply (cx.sender, "Valid commands are: "+this.get_commands().join(", "));
};


ΩF_0Bot.prototype.command_not_found = function(cx, text) {

	try {
		cx.channel.send_reply(cx.intent, this.factoids.find(text, true));
	} catch(e) {
		console.log(e.name, e.message);
	
		var reply = ["'"+text+"' is not recognized."],
		    found = this.factoids.search(text);
		
		if (found.length) {
			if (found.length > 1) found[found.length-1] = "or "+found[found.length-1];
			reply.push("Did you mean: "+found.join(", ")+"?");
		}
		
		reply.push("See !commands for a list of commands.");
		cx.channel.send_reply(cx.intent, reply.join(" "));
	}
};

var profile = require("./oftnbot-profile.js");
new ΩF_0Bot(profile).init();
