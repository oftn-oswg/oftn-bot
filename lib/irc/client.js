var Util = require("util");
var Net = require("net");
var Events = require("events");


var IRCClient = exports.IRCClient = function(profile) {
	this.profile = profile;

	this.host = this.profile.host || "localhost";
	this.port = this.profile.port || 6667;

	this.connection = null;
	this.buffer = "";
	this.encoding = "utf8";
	this.timeout = 600000; // Ten minutes of inactivity

	this.nick = this.profile.nick;
	this.user = this.profile.user || "guest";
	this.real = this.profile.real || "Guest";
	this.password = this.profile.password || null;
	this.nickserv = this.profile.nickserv || null;

	this.channels = {};
	this.users = {};
}


Util.inherits(IRCClient, process.EventEmitter);


IRCClient.prototype.connect = function(nick, user, real, password) {
	var connection = Net.createConnection(this.port, this.host);
	connection.setEncoding(this.encoding);
	connection.setTimeout(this.timeout);

	for (var i in this.events) {
		if (this.events.hasOwnProperty(i)) {
			connection.on(i, this.events[i].bind(this));
		}
	}

	this.connection = connection;
};


IRCClient.prototype.disconnect = function(why) {
	if (this.connection.readyState !== "closed") {
		this.connection.end();
		this.emit("disconnect", why);
	}
};


IRCClient.prototype.raw = function(message) {
	if (this.connection.readyState !== "open") {
		throw new Error("Cannot send with readyState: " +
			this.connection.readyState);
	}
	Util.puts(message);
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
		this.raw("NICK "+this.nick);
		if (typeof this.password === "string") {
			this.raw("PASS "+this.password);
		}
		this.raw("USER "+this.user+" 0 * :"+this.real);
		if (typeof this.nickserv === "string") {
			this.get_user("NickServ").send("identify "+this.nickserv);
		}
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
					
					channel.userlist[user.name] = {operator: false, voice: false, user: user};
					if (user.name !== this.nick) {
						this.emit("user_join", user, channel);
					} else {
						this.emit("join", channel);
					}
					
					break;
				case "TOPIC": // Topic changed
					var channel_name = message.params[0];
					this.get_channel(channel_name).topic = message.message;
					break;
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
				case "NOTICE":
					var text = message.message;
					Util.puts("NOTICE "+text);
					this.emit("notice", text);
					break;
				case 1: // RPL_WELCOME
					this.emit("welcome", this);
					break;
				case 5: //RPL_BOUNCE
					break;
				case 331: // RPL_NOTOPIC
					var channel_name = message.params[1];
					this.get_channel(channel_name).topic = null;
					break;
				case 332: // RPL_TOPIC
					var channel_name = message.params[1];
					this.get_channel(channel_name).topic = message.message;
					break;
				case 353: // RPL_NAMREPLY
					var channel_name = message.params[message.params.length-1];
					var names = message.message.replace(/^\s+|\s+$/g, '').split(/\s+/g);
					for (var i = 0, len = names.length; i < len; i++) {
						var op = false, voice = false, nick = names[i];
						switch (nick[0]) {
						case '@':
							op = true;
						case '+':
							voice = true;
							nick = nick.substr(1);
						}
						var user = this.get_user(nick);
						this.get_channel(channel_name).userlist[nick] = {
							operator: op,
							voice: voice,
							user: user
						};
					}
					break;
				case "PART":
					var user = this.get_user(
						IRCUser.parse_prefix(message.prefix).name);
					var channel_name = message.params[0];
					
					delete this.get_channel(channel_name).userlist[user.name];
					
					break;
				case "QUIT":
					var user = this.get_user(
						IRCUser.parse_prefix(message.prefix).name);
					
					for (var i in this.channels) {
						if (this.channels.hasOwnProperty(i)) {
							delete this.channels[i].userlist[user.name];
						}
					}
					
					break;
				default:
					console.log("Unknown command: ", message.command);
					break;
				}
			}
		}
	},
	close: function() {
		this.disconnect("Stream has closed");
	},
	error: function() {
		this.disconnect("Stream error");
	},
	timeout: function() {
		this.disconnect("Timeout");
	},
	end: function() {
		this.emit('disconnect');
	}
};


var IRCChannel = exports.IRCChannel = function(client, name) {
	this.client = client;
	this.name = name;
	this.topic = null;
	this.userlist = {};
	//Util.puts(client.host+" CHANNEL "+name+" created.");
};

Util.inherits(IRCChannel, Events.EventEmitter);


IRCChannel.prototype.toString = function() {
	return this.name;
};

IRCChannel.prototype.self_command = function(command, message, colors) {

	if (typeof colors === "undefined") colors = false;
	message = String(message);

	// First we split the message by each line
	var lines = message.split(/[\r\n]/g);
	for( var i = 0, len = lines.length; i < len; i++ ) {

		// Then we remove all characters that are considered bad. (< 32)
		if (!colors) { lines[i] = lines[i].replace(/[\x00-\x1f]/g, ""); }
		if (lines[i].length)
			this.client.raw(command + " " + this.name + " :" + lines[i]);

	}
}


IRCChannel.prototype.send = function(message, colors) {
	this.self_command ("PRIVMSG", message, colors);
};

IRCChannel.prototype.notice = function(message, colors) {
	this.self_command ("NOTICE", message, colors);
};


IRCChannel.prototype.send_action = function(message) {
	var ctcp = String.fromCharCode(1);
	this.self_command ("PRIVMSG", ctcp + "ACTION " + message + ctcp, colors);
};


IRCChannel.prototype.part = function(message) {
	this.client.raw("PART "+this.name+" :"+message);
};


IRCChannel.prototype.join = function(password) {
	this.client.raw("JOIN " + this.name +
		(typeof password === "undefined" ? "" : " :"+password));
};

IRCChannel.prototype.set_topic = function(topic) {
	this.client.raw("TOPIC " + this.name + " :"+topic.replace(/\n/g, ' '));
};


var IRCUser = exports.IRCUser = function(client, name) {
	this.client = client;
	this.name = name;
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
IRCUser.prototype.notice = IRCChannel.prototype.notice;
IRCUser.prototype.send_action = IRCChannel.prototype.send_action;
IRCUser.prototype.self_command = IRCChannel.prototype.self_command;
