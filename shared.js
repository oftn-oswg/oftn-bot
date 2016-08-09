// This is for common functions defined in many bots at once
var Sandbox = require("./lib/sandbox");
var FeelingLucky = require("./lib/feelinglucky");
var Gist = require("./lib/paste/gist");

function parse_regex_literal (text) {
	var regexparsed = text.match(/s\/((?:[^\\\/]|\\.)*)\/((?:[^\\\/]|\\.)*)\/([gi]*)$/);
	if (!regexparsed) {
		throw new SyntaxError("Syntax is `s/expression/replacetext/gi`.");
	}

	var regex = new RegExp(regexparsed[1], regexparsed[3]);
	return [regex, regexparsed[2].replace(/\\\//g, '/')];
}


function cleanReply(text, result){
	text = text
		.split('\n')
		.map(function(x){
			return x.trim()
				.replace(/[\n\t]|\s\s+/g, ' ')
				.replace(/\s\s+/g, ' ');
		})
		.join(' ');

	var prefix = result.success ? '(okay)' : '(error)';
	text = prefix + ' ' + text;
	return text;
}

function factoidFindHelper(bot, context, text, suppressSearch) {
	try {
		var results;
		var factoid = bot.factoids.find(text, true);

		if (results = factoid.match(bot.executeRegex)) {
			context.channel.send_reply(context.channel, results[0] + " @" + context.intent.name, {color: true});
			Shared.execute_js.apply(bot, [context, factoid].concat(results.slice(1)));
		} else {
			context.channel.send_reply(context.intent, factoid, {color: true});
		}
	} catch(e) {
		if (!suppressSearch) {
			var reply = ["Could not find `"+text+"`."];
			var found = bot.factoids.search(text);

			found = found.map(function(item) {
				return "\x033"+item+"\x0F";
			});

			if (found.length) {
				reply = ["Found:"];
				if (found.length > 1) {
					found[found.length-1] = "and "+found[found.length-1];
				}
				reply.push(found.join(found.length-2 ? ", " : " "));
			}

			context.channel.send_reply(context.intent, reply.join(" "), {color: true});
		}
	}
}

var Shared = module.exports = {

	google: function(context, text) {
		FeelingLucky(text + " -site:w3schools.com", function(data) {
			if (data) {
				context.channel.send_reply (context.intent,
					"\x02"+data.title+"\x0F \x032< "+data.url+" >\x0F", {color: true});
			} else {
				context.channel.send_reply (context.sender, "No search results found.");
			}
		});
	},


	execute_js: function(context, text, command, code) {
		var engine;
		var person = context.sender;

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
		case "|>": /* Multi-line input */
			person.js = person.js || {timeout: null, code: []};
			/* Clear input buffer after a minute */
			clearTimeout (person.js.timeout);
			person.js.timeout = setTimeout (function() {
				person.js.code.length = 0;
				context.channel.send_reply (context.sender, "Your `|>` line input has been cleared. (1 minute)");
			}, 1000 * 60);
			person.js.code.push (code);
			return;
		case "h>":
		case "hs>":
			engine = Sandbox.Haskell; break;
		case ">>>":
		case "v>":
		case "v8>":
			// context.channel.send_reply(context.intent, "v8 temporarily disabled, please use js> instead."); return;
			engine = Sandbox.V8; break;
		case "n>":
			engine = Sandbox.Node; break;
		case "b>":
			engine = Sandbox.Babel; break;
		default:
			engine = Sandbox.SpiderMonkey; break;
		}

		if (person.js && person.js.code.length) {
			code = person.js.code.join("\n") + "\n" + code;
			person.js.code.length = 0;
			clearTimeout (person.js.timeout);
		}

		this.sandbox.run(engine, 4000, code, function(result) {
			var reply;
			if (result.text) result.text = result.text.replace(/\r\n?/g, '\n');
			if (result.reason) result.reason = result.reason.replace(/\r\n?/g, '\n');

			try {
				/*	If theres an error, show that.
					If not, show the type along with the result */
				if (result.isJSEval) {
					if (result.reason) {
						reply = result.reason;
					} else if (!result.success) {
						reply = result.text;
					} else {
						reply = result.text;
					}

					if (reply.length > 100) {
						var visibleReply = reply.slice(0, 80);
						var formattedCode = code;

						function markdownEscape(str){
							return str.replace(/```/g, '{triple backticks escaped}');
						}

						var gistFile = "";
						gistFile += "For this code:";
						gistFile += "\n\n";
						gistFile += "```js\n";
						gistFile += markdownEscape(formattedCode);
						gistFile += "\n";
						gistFile += "```";
						gistFile += "\n\n";
						gistFile += "This was the "
							+ (result.success ? 'output' : 'error')
							+ ':';
						gistFile += "\n\n";
						gistFile += "```";
						gistFile += "\n";
						gistFile += markdownEscape(result.text);
						gistFile += "\n";
						gistFile += "```";
						gistFile += "\n\n";

						Gist.createGist(gistFile, {
							filename: result.success ? "result.md" : "error.md",
							description: "result of " + context.sender.name + "'s code"
						})
						.then(function(url){
							var fullReply = cleanReply(visibleReply, result) + " ... " + url;
							context.channel.send_reply(context.intent, fullReply, {truncate: false});
						})
						.catch(function(err){
							var fullReply = cleanReply(visibleReply, result) + " ... <unable to create gist url>";
							context.channel.send_reply(context.intent, fullReply, {truncate: false});
						});
					} else {
						context.channel.send_reply(context.intent, cleanReply(reply, result), {truncate: true});
					}
					return;
				}

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
	},

	learn: function(context, text) {

		try {
			var parsed = text.match(/^(alias)?\s*("[^"]*"|.+?)\s*(=~?)\s*(.+)$/i);
			if (!parsed) {
				throw new SyntaxError(
					"Syntax is `learn ( [alias] foo = bar | foo =~ s/expression/replace/gi )`.");
			}

			var alias = !!parsed[1];
			var factoid = parsed[2];
			var operation = parsed[3];
			var value = parsed[4];

			if (factoid.charAt(0) === '"') {
				factoid = JSON.parse(factoid);
			}

			if (alias) {
				var key = this.factoids.alias(factoid, value, context.sender.name);
				context.channel.send_reply(context.sender,
					"Learned `"+factoid+"` => `"+key+"`.");
				return;
			}

			/* Setting the text of a factoid */
			if (operation === "=") {
				this.factoids.learn(factoid, value, context.sender.name);
				context.channel.send_reply(context.sender, "Learned `"+factoid+"`.");
				return;

			/* Replacing the text of a factoid based on regular expression */
			} else if (operation === "=~") {
				var regexinfo = parse_regex_literal (value);
				var regex = regexinfo[0];
				var old = this.factoids.find(factoid, false);
				var result = old.replace(regex, regexinfo[1]);

				if (old === result) {
					context.channel.send_reply(context.sender, "Nothing changed.");
				} else {
					this.factoids.learn(factoid, result, context.sender.name, value);
					context.channel.send_reply(context.sender, "Changed `"+factoid+
						"` to: "+result);
				}
				return;

			}

		} catch (e) {
			context.channel.send_reply(context.sender, e);
		}
	},

	forget: function(context, text) {
		try {
			this.factoids.forget(text, context.sender.name);
			context.channel.send_reply(context.sender, "Forgot '"+text+"'.");
		} catch(e) {
			context.channel.send_reply(context.sender, e);
		}
	},


	commands: function(context, text) {
		var commands = this.get_commands();
		var trigger = this.__trigger;
		context.channel.send_reply (context.intent,
			"Valid commands are: " + trigger + commands.join(", " + trigger));
	},

	find: function(context, text) {
		factoidFindHelper(this, context, text);
	},

	findPlus: function(context, text, suppressSearch) {
		factoidFindHelper(this, context, text, suppressSearch);
	},

	topic: function(context, text) {

		try {

			if (text) {

				if (text === "revert") {
					var oldtopic = context.channel.oldtopic;
					if (oldtopic) {
						set_topic (oldtopic);
						return;
					} else {
						throw new Error("No topic to revert to.");
					}
				}

				try {
					var template = this.factoids.find("topic", true);
					var data = JSON.parse (text);
					template = template.replace (/{([a-z]+)}/g, function (match, name) {
						return data.hasOwnProperty(name) ? data[name] : "";
					});
					set_topic (template);
				} catch (e) {
					var regexinfo = parse_regex_literal(text);
					var regex = regexinfo[0];

					var topic = context.channel.topic.replace(regex, regexinfo[1]);
					if (topic === context.channel.topic) throw new Error("Nothing changed.");

					set_topic (topic.replace(/\n/g, ' '));
					//context.channel.set_topic(topic);
				}
			} else {
				context.channel.send_reply(context.intent, context.channel.topic);
			}
		} catch (e) {
			context.channel.send_reply(context.sender, e);
		}

		function set_topic (topic) {
			context.channel.oldtopic = context.channel.topic;
			context.client.get_user("ChanServ")
				.send("TOPIC "+context.channel.name+" "+topic);
		}
	},

	reauthenticate: function(context, text) {
		context.client.authenticate();
	}


};
