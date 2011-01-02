var Util = require("util");
var IRCClient = require("./client").IRCClient;
var Events = require("events");
var Script = process.binding("evals").Script;

/**
 * Events:
 *   'command_not_found': function (channel, user, command);
 **/
var IRCBot = exports.IRCBot = function(profile) {
	this.profile = profile;
	this.clients = [];
	this.listening = [];
	this.commands = [];

	// Used to identify message as command for bot
	this.command_ident = '!';

	// Length limits on outputs
	this.maximum = {
		lines: 5,
		length: 382,
		message: "\u2026 [Output truncated.]"
	};

	this.log_level = this.LOG_NONE;

	/*this.nickname_regex =
		/^[A-Z\x5B-\x60\x7B-\x7D][-0-9A-Z\x5B-\x60\x7B-\x7D]{0,16}$/i;*/
};

Util.inherits(IRCBot, Events.EventEmitter);

IRCBot.prototype.init = function() {
	// Connect to each IRC server
	for (var i = 0, len = this.profile.length; i < len; i++) {
		var client = new IRCClient(this.profile[i]);
		client.on("welcome", this.listeners.welcome.bind(this));
		client.on("join", this.listeners.join.bind(this));
		client.on("message", this.listeners.message.bind(this));
		client.on("pm", this.listeners.pm.bind(this));
		
		this.log(this.LOG_CONNECT, client.host, "Connecting...");
		client.connect();
	}
};

IRCBot.prototype.LOG_NONE = 0; // No logging
IRCBot.prototype.LOG_CONNECT = 1; // Log server connections
IRCBot.prototype.LOG_JOIN = 2; // Log channel joins/parts
IRCBot.prototype.LOG_COMMANDS = 4; // Log messages triggering commands
IRCBot.prototype.LOG_LISTENS = 8; // Log messages matching listeners
IRCBot.prototype.LOG_OUTGOING = 16; // Log anything the bot sends
IRCBot.prototype.LOG_INCOMING = 32; // Log anything the bot receives
IRCBot.prototype.LOG_ALL = 64; // Log everything

IRCBot.prototype.log = function(level, message) {
	if (arguments.length > 2)
		message = Array.prototype.slice.call(arguments, 1).join(" ");
	if (this.log_level == this.LOG_ALL || (level & this.log_level))
		Util.puts(message);
};

IRCBot.prototype.set_log_level = function(level) {
	this.log_level = level;
};

/**
 * Listens for message matching the specified regex and calls the callback
 * function with:
 *
 * callback(context, text, 1st subpattern, 2nd subpattern, ...);
 **/
IRCBot.prototype.register_listener = function(regex, callback) {
	this.listening.push({
		regex: regex,
		callback: callback
	});
};

/**
 * Add a new command to listen for: callback is called with (context, result)
 *  - result: the text that comes after the command
 **/
IRCBot.prototype.register_command = function(command, callback) {
	this.commands.push({
		command: command.toLowerCase(),
		callback: callback
	});
};

IRCBot.prototype.get_commands = function() {
	var array = [];
	for (var i = 0, len = this.commands.length; i < len; i++) {
		array.push(this.commands[i].command);
	}
	return array.sort();
};

// Set the character that you use to signal a command to the bot
IRCBot.prototype.set_command_identifier = function(c) {
	this.command_ident = c;
};

// The maximum number of lines to output before truncating
IRCBot.prototype.set_maximum_lines = function(lines) {
	this.maximum.lines = lines;
};

// The number of characters to truncate the output to
IRCBot.prototype.set_maximum_output_length = function(length) {
	this.maximum.length = length;
};

// The message used to show that the output had been truncated
IRCBot.prototype.set_maximum_truncate_message = function(message) {
	this.maximum.message = message;
};

IRCBot.prototype.send_truncated = function(channel, reply, prefix, suffix) {
	if (typeof prefix === "undefined") prefix = "";
	if (typeof suffix === "undefined") suffix = "";

	var truncated = false;
	var realmax = this.maximum.length-this.maximum.message.length;
	if (reply.length > realmax) {
		truncated = true;
		reply = reply.substr(0, realmax)+this.maximum.message;
	}
	var splitted = reply.split(/[\r\n]+/g);
	if ((splitted.length > this.maximum.lines) && !truncated)
		splitted[this.maximum.lines-1] += this.maximum.message;
	for (var i = 0; i < this.maximum.lines && i < splitted.length; i++) {
		channel.send(prefix+splitted[i]+suffix);
	}
};

IRCBot.prototype.quit = function() {
	process.exit();
};

IRCBot.prototype.listeners = {
	disconnect: function(client) {

		this.log(this.LOG_CONNECT, client.host,
			"Disconnected, reconnecting in 15s");

		setTimeout(function(bot, client) {
			bot.log(bot.LOG_CONNECT, client.host, "Connecting...");
			client.connect();
		}, 15000, bot, client);
	},
	welcome: function(client) {
		if (client.timeout) {
			clearTimeout(client.timeout);
			client.timeout = null;
		}

		var channels = client.profile.channels;
		for (var i = 0, len = channels.length; i < len; i++) {
			this.log(this.LOG_JOIN, client.host, "Joining", channels[i]+"...");
			client.get_channel(channels[i]).join();
		}
	},
	join: function(channel) {
		this.log(this.LOG_JOIN, channel.client.host, "Joined", channel.name);
	},
	pm: function(user, text) {
		if (user.name === "eboyjr") {
			var result;
			try {
				result = eval(text);
			} catch (e) {
				result = e.name + ": " + e.message;
			}
			user.send(require("../sandbox/utils").pretty_print(result));
		} else {
			Util.puts("PM "+user.name+" said: "+text);
			user.send("This bot is still being developed. Private messaging is not supported.");
		}
	},
	message: function(channel, user, text) {
	
		var context = {
			channel: channel,
			client: channel.client,
			sender: user,
			intent: user,
			priv: false
		};

		// First let's trim the message
		trimmed = Utilities.trim(text);
		
		// Let's check if it is directed to someone
		var m;
		if (m = trimmed.match(/@\s*([-0-9A-Z\x5B-\x60\x7B-\x7D]{0,16})$/i)) {
			context.intent = channel.client.get_user(m[1]);
			trimmed = Utilities.trim(trimmed.substring(0, trimmed.length-m[0].length));
		}

		// Check if message is a bot command (begins with ident or nick mention)
		// TODO: Find a better method of doing so
		var matches = trimmed.match(
			new RegExp("^("+
				Utilities.escape_regex(this.command_ident)+"|"+
				Utilities.escape_regex(channel.client.nick)+"[,: ]*)"));
		// Util.puts(Util.inspect(matches));

		var index;
		if (matches && (index = matches[0].length)) {
			// Grab the command from the text
			var command = trimmed.substr(index).split(" ")[0].toLowerCase();
			// Loop through the registered commands
			for (var i = 0, len = this.commands.length; i < len; i++) {
				if (command === this.commands[i].command) {
					// Grab the string after the command
					var result = trimmed.substr(index + command.length + 1);
					this.commands[i].callback.call(this, context, result);
					this.log(this.LOG_COMMANDS, channel.client.host,
						channel.name, "<"+user.name+"> ran '"+command+"' with",
						result);
					return;
				}
			}
			var msg = trimmed.substr(index);
			if (msg.length) {
				this.emit('command_not_found', context, msg);
				return;
			}
		}

		// Check if message matches listeners
		for (var i = 0, len = this.listening.length; i < len; i++ ) {
			var result = trimmed.match(this.listening[i].regex);
			if (result) {
				this.listening[i].callback.apply(this,
					[context, text].concat(result.slice(1)));
				this.log(this.LOG_LISTENS, channel.client.host, channel.name,
					"<"+user.name+"> sent:", trimmed);
				return;
			}
		}
	}
};

var Utilities = exports.Utilities = {
	trim: function(text) {
		return (text || "").replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, "");
	},
	escape_regex: function(string) {
		return string.replace(/[.*+?|()\\[\\]{}\\\\]/g, "\\$&");
	}
};
