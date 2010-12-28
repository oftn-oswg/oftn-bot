var Util = require("util");
var Net = require("net");

var $bind = function(scope, callback) {
	var binded = Array.prototype.slice.call(arguments, 2);
	return function() {
		callback.apply(scope,
			binded.concat(Array.prototype.slice.call(arguments)));
	};
};

var IRCClient = exports.IRCClient = function(profile) {
	this.profile = profile;

	this.host = this.profile.host || "localhost";
	this.port = this.profile.port || 6667;

	this.connection = null;
	this.buffer = "";
	this.encoding = "utf8";
	this.timeout = 10 * 60 * 60 * 1000;

	this.nick = this.profile.nick;
	this.user = this.profile.user || "guest";
	this.real = this.profile.real || "Guest";
	this.password = this.profile.password || null;

	this.channels = {};
	this.users = {};
}

Util.inherits(IRCClient, process.EventEmitter);

IRCClient.prototype.connect = function(nick, user, real, password) {
	var connection = Net.createConnection(this.port, this.host);
	connection.setEncoding(this.encoding);
	connection.setTimeout(this.timeout);

	for (var i in this.events) {
		connection.on(i, $bind(this, this.events[i]));
	}

	this.connection = connection;
};

IRCClient.prototype.disconnect = function(why) {
	if (this.connection.readyState !== "closed") {
		this.connection.end();
		this.emit("DISCONNECT", why);
	}
};

IRCClient.prototype.raw = function(message) {
	if (this.connection.readyState !== "open") {
		throw new Error("Cannot send with readyState: " +
			this.connection.readyState);
	}
	this.connection.write(message + "\r\n", this.encoding);
};

IRCClient.prototype.nick = function(nick) {
	if (nick.length > 16) nick = nick.substr(0, 16);
	this.nick = nick;
	this.raw("NICK "+this.nick);
};

IRCClient.prototype.parse = function(incoming) {
	var match = incoming.match(/(?:(:[^\s]+) )?([^\s]+) (.+)/);

	var msg, params = match[3].match(/(.*?) ?:(.*)/);
	if (params) {
		// Message segment
		msg = params[2];
		// Params before message
		params = params[1].split(" ");

	} else {
		params = match[3].split(" ");
	}

	var prefix = match[1];
	var command = match[2];

	var charcode = command.charCodeAt(0);
	if (charcode >= 48 && charcode <= 57 && command.length == 3) {
		command = parseInt(command, 10);
	}

	return {prefix: prefix, command: command, params: params, message: msg};
};

IRCClient.prototype.get_channel = function(name) {
	if (typeof this.channels[name] === "undefined") {
		return this.channels[name] = new IRCChannel(this, name);
	}
	return this.channels[name];
};

IRCClient.prototype.get_user = function(name) {
	if (typeof this.users[name] === "undefined") {
		return this.users[name] = new IRCUser(this, name);
	}
	return this.users[name];
};

IRCClient.prototype.events = {
	connect: function() {
		if ("string" === typeof this.password) {
			this.raw("PASS "+this.password);
		}
		this.raw("NICK "+this.nick);
		this.raw("USER "+this.user+" 0 * :"+this.real);
	},
	data: function(chunk) {
		this.buffer += chunk;

		while (this.buffer) {
			var offset = this.buffer.indexOf("\r\n");
			if (offset < 0) {
				return;
			}

			var message = this.buffer.substr(0, offset);
			this.buffer = this.buffer.substr(offset + 2);

			this.emit('raw', message);
			message = this.parse(message);

			if (message !== false) {
				switch (message.command) {
				case "PING":
					this.raw("PONG :"+message.message);
					break;
				case "NICK":
					//this.nick = message.message;
					this.emit("nick", message.message);
					break;
				case "JOIN":
					var channel_name = message.message;
					var channel = this.get_channel(channel_name);
					var user = this.get_user(
						IRCUser.parse_prefix(message.prefix).name);
					if (user.name !== this.nick) {
						this.emit("user_join", user, channel);
					} else {
						this.emit("join", channel);
					}
					break;
				case "TOPIC": // Topic changed
					var channel_name = message.params[0];
					this.get_channel(channel_name).topic = message.message;
				case "PRIVMSG":
					var user = this.get_user(
						IRCUser.parse_prefix(message.prefix).name);
					var text = message.message;
					if (message.params[0] == this.nick) {
						this.emit("pm", user, text);
					} else {
						var channel = this.get_channel(message.params[0]);
						this.emit("message", channel, user, text);
					}
					break;
				case 1: // RPL_WELCOME
					this.emit("welcome", this);
					break;
				case 5: //RPL_BOUNCE
					break;
				case 331: // RPL_NOTOPIC
					var channel_name = message.params[1];
					this.get_channel(channel_name).topic = null;
				case 332: // RPL_TOPIC
					var channel_name = message.params[1];
					this.get_channel(channel_name).topic = message.message;
				}
			}
		}
	},
	/*eof: function() {
		this.disconnect("End of file");
	},
	timeout: function() {
		this.disconnect("Timeout");
	},*/
	end: function() {
		this.emit('disconnect');
	}
};

var IRCChannel = exports.IRCChannel = function(client, name) {
	this.client = client;
	this.name = name;
	this.topic = null;
	//Util.puts(client.host+" CHANNEL "+name+" created.");
};

IRCChannel.prototype.toString = function() {
	return this.name;
};

IRCChannel.prototype.send = function(message) {

	// First we split the message by each line
	var lines = message.split(/[\r\n]/g);
	for( var i = 0, len = lines.length; i < len; i++ ) {

		// Then we remove all characters that are considered bad. (< 32)
		lines[i] = lines[i].replace(/[\x00-\x1f]/g, "");
		if(lines[i].length)
			this.client.raw("PRIVMSG " + this.name + " :" + lines[i]);

	}
};

IRCChannel.prototype.send_action = function(message) {

	var ctcp = String.fromCharCode(1);

	// First we split the message by each line
	var lines = message.split(/[\r\n]/g);
	for( var i = 0, len = lines.length; i < len; i++ ) {

		// Then we remove all characters that are considered bad. (< 32)
		lines[i] = lines[i].replace(/[\x00-\x1f]/g, "");
		if(lines[i].length) {
			if (i === 0)
				this.client.raw("PRIVMSG " + this.name + " :" + ctcp +
					"ACTION " + lines[i] + ctcp);
			else
				this.client.raw("PRIVMSG " + this.name + " :" + lines[i]);
		}

	}
};

IRCChannel.prototype.part = function(channel) {
	this.client.raw("PART "+this.name);
};

IRCChannel.prototype.join = function(password) {
	this.client.raw("JOIN " + this.name +
		(typeof password === "undefined" ? "" : " :"+password));
}

var IRCUser = exports.IRCUser = function(client, name) {
	this.client = client;
	this.name = name;
	//Util.puts(client.host+" USER "+name+" created.");
};

IRCUser.prototype.toString = function() {
	return "<"+this.name+">";
};

IRCUser.parse_prefix = function(prefix) {
	var m = prefix.match(/^:(.*)!/);
	if (m !== null) {
		return {name: m[1]};
	}
};

IRCUser.prototype.send = IRCChannel.prototype.send;

