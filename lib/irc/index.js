var Util = require("util");
var Client = require("./client").Client;
var Events = require("events");

/**
 * Events:
 *   'command_not_found': function (channel, user, command);
 **/
var Bot = module.exports = function(profile) {

	this.__profile = profile;
	this.__listening = [];

	// Used to identify message as command for bot
	this.__command_ident = '!';

	this.__log_level = this.LOG_NONE;
	
	this.__commands = {};
	this.__commands_regex = null;
	this.__command_ident_changed = true;

	/*this.nickname_regex =
		/^[A-Z\x5B-\x60\x7B-\x7D][-0-9A-Z\x5B-\x60\x7B-\x7D]{0,16}$/i;*/
};

Util.inherits(Bot, Events.EventEmitter);

Bot.prototype.init = function() {
	// Connect to each IRC server
	for (var i = 0, len = this.__profile.length; i < len; i++) {
		var client = new Client(this.__profile[i]);
		client.on("welcome", this.listeners.welcome.bind(this));
		client.on("join", this.listeners.join.bind(this));
		client.on("message", this.listeners.message.bind(this));
		client.on("pm", this.listeners.pm.bind(this));
		
		Bot.prototype.log.call(this, this.LOG_CONNECT, client.host, "Connecting...");
		client.connect();
	}
};

Bot.prototype.LOG_NONE = 0; // No logging
Bot.prototype.LOG_CONNECT = 1; // Log server connections
Bot.prototype.LOG_JOIN = 2; // Log channel joins/parts
Bot.prototype.LOG_COMMANDS = 4; // Log messages triggering commands
Bot.prototype.LOG_LISTENS = 8; // Log messages matching listeners
Bot.prototype.LOG_OUTGOING = 16; // Log anything the bot sends
Bot.prototype.LOG_INCOMING = 32; // Log anything the bot receives
Bot.prototype.LOG_ALL = 64; // Log everything

Bot.prototype.log = function(level, message) {

	var d = new Date(), h = d.getHours(), m = d.getMinutes(),
		time = (h?h%12:12)+":"+(m<10?"0"+m:m)+(h>11?"pm":"am");

	if (arguments.length > 2)
		message = Array.prototype.slice.call(arguments, 1).join(" ");
	if (this.__log_level == this.LOG_ALL || (level & this.__log_level))
		Util.puts(time+" "+message);
};

Bot.prototype.set_log_level = function(level) {
	this.__log_level = level;
};

/**
 * Listens for message matching the specified regex and calls the callback
 * function with:
 *
 * callback(context, text, 1st subpattern, 2nd subpattern, ...);
 **/
Bot.prototype.register_listener = function(regex, callback, options) {
	this.__listening.push({
		regex: regex,
		callback: callback,
		options: Utilities.merge({
			allow_intentions: true // Parse `@ nick` after message
		}, options)
	});
};

/**
 * Add a new command to listen for: callback is called with (context, result)
 *  - result: the text that comes after the command
 **/
Bot.prototype.register_command = function(command, callback, options) {
	
	this.__commands[command.toLowerCase()] =
		new CommandListener(callback, Utilities.merge({
			allow_intentions: true, // Parse `@ nick` after message
			hidden: false // Show command in results from get_commands()
		}, options));
};

/**
 * compile_commands: Compiles a RegExp object
 * ahead-of-time to listen for commands.
 **/
Bot.prototype.compile_command_listener = function() {

	if (this.__command_ident_changed) {

		var identifier = Utilities.escape_regex(this.__command_ident);
		this.__commands_regex = new RegExp("^\\s*"+identifier+"\\s*((\\S+)\\s*(.*))$");

	}
};


Bot.prototype.parse_intent = function(str) {
	var parsed = str.match(/^(.*?)\s*@\s*([A-Z\x5B-\x60\x7B-\x7D][-0-9A-Z\x5B-\x60\x7B-\x7D]{0,16})$/i);
	if (!parsed) return false;
	return {
		intent: parsed[2],
		result: parsed[1]
	};
};


Bot.prototype.get_commands = function() {
	var array = [];
	for (var i in this.__commands) {
		if (this.__commands.hasOwnProperty(i)) {
			if (!this.__commands[i].options.hidden) array.push(i);
		}
	}
	return array.sort();
};

// Set the character that you use to signal a command to the bot
Bot.prototype.set_command_identifier = function(c) {
	this.__command_ident = c;
	this.__command_ident_changed = true;
};


Bot.prototype.quit = function() {
	process.exit();
};

Bot.prototype.listeners = {
	disconnect: function(client) {

		Bot.prototype.log.call(this, this.LOG_CONNECT, client.host,
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
			Bot.prototype.log.call(this, this.LOG_JOIN, client.host, "Joining", channels[i]+"...");
			client.get_channel(channels[i]).join();
		}
		
		this.emit("connect", client);
	},
	join: function(channel) {
		this.emit("join", channel);
		
		Bot.prototype.log.call(this, this.LOG_JOIN, channel.client.host, "Joined", channel.name);
	},
	pm: function(user, text) {
		this.emit("pm", user, text);
	
		var context = {
			channel: user,
			client: user.client,
			sender: user,
			intent: user,
			priv: true
		};
		
		var trimmed = text.trim();
		
		// Check if message matches listeners
		for (var i = 0, len = this.__listening.length; i < len; i++ ) {
			var result = trimmed.match(this.__listening[i].regex);
			if (result) {
				this.__listening[i].callback.apply(this,
					[context, trimmed].concat(result.slice(1)));
			
				Bot.prototype.log.call(this, this.LOG_LISTENS, user.client.host,
					"PM "+user.name+":", trimmed);
				return;
			}
		}
		
		var command_matches;
		if (command_matches = text.match(/^\s*((\S+)\s*(.*))$/)) {
			var full = command_matches[1];
			var command = command_matches[2];
			var parameters = command_matches[3];
			
			Bot.prototype.log.call(this, this.LOG_LISTENS, user.client.host,
				"PM "+user.name+":", text);
			
			if (this.__commands[command] instanceof CommandListener) {
				this.__commands[command].callback.call(this, context, parameters);
			} else {
				this.emit('command_not_found', context, full);
			}
			return;
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
		
		this.emit("message", context, text);
		channel.emit("message", context, text);
		
		text = text.trim();
		
		Bot.prototype.compile_command_listener.call(this);
		
		var command_matches = text.match(this.__commands_regex);
		if (command_matches) {
			var full = command_matches[1];
			var command = command_matches[2];
			var parameters = command_matches[3];
			
			Bot.prototype.log.call(this, this.LOG_LISTENS, channel.client.host, channel.name+":",
					"<"+user.name+">", text);
					
			/**
			 * TODO: Great I spilled something.. somehow make this DRY..
			 **/
			
			if (this.__commands[command] instanceof CommandListener) {
				if (this.__commands[command].options.allow_intentions) {
					var intent_obj = Bot.prototype.parse_intent.call(this, parameters);
					if (intent_obj) {
						parameters = intent_obj.result;
						context.intent = channel.client.get_user(intent_obj.intent);
					}
				}
				this.__commands[command].callback.call(this, context, parameters);
			} else {
				var intent_obj = Bot.prototype.parse_intent.call(this, full);
				if (intent_obj) {
					full = intent_obj.result;
					context.intent = channel.client.get_user(intent_obj.intent);
				}
				this.emit('command_not_found', context, full);
			}
			return;
		}
		
		var trimmed = text.trim();
		
		// Check if message matches listeners
		for (var i = 0, len = this.__listening.length; i < len; i++ ) {
		
			if (this.__listening[i].options.allow_intentions) {
				var intent_obj = Bot.prototype.parse_intent.call(this, trimmed);
				if (intent_obj) {
					trimmed = intent_obj.result;
					context.intent = channel.client.get_user(intent_obj.intent);
				}
			}
				
			var result = trimmed.match(this.__listening[i].regex);
			if (result) {
				this.__listening[i].callback.apply(this,
					[context, trimmed].concat(result.slice(1)));
				Bot.prototype.log.call(this, this.LOG_LISTENS, channel.client.host, channel.name+":",
					"<"+user.name+">", trimmed);
				return;
			}
		}
	}
};


var CommandListener = function(callback, options) {
	this.callback = callback;
	this.options = options;
};


var Utilities = {
	escape_regex: (function() {
		var cache = {};
		return function(string) {
			if (typeof cache[string] !== "undefined") return cache[string];
			
			return cache[string] = string.replace(/[.*+?|()\\[\\]{}\\\\]/g, "\\$&");
		}
	})(),
	merge: function(defaults, options) {
		if (typeof options === "undefined") return defaults;
		var o = {};
		for (var i in defaults) {
			o[i] = typeof options[i] === "undefined" ? defaults[i] : options[i];
		}
		return o;
	}
};
