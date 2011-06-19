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


IRCClient.prototype.strip_color = function(text) {
	text = String(text);
	return text.replace(/\x03\d{0,2},?\d{1,2}|[\x02\x06\x07\x0f\x16\x17\x1b\x1d\x1f]/g, "");
};

IRCClient.prototype.strip_control = function(text) {
	text = String(text);
	return text.replace(/[\x00\x01\x04\x05\x08-\x0e\x10-\x15\x18-\x1a\x1c\x1e]/g, "");
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
				
					var oldname = IRCUser.parse_prefix(message.prefix).name;
					
					var user = this.get_user(oldname);
					user.name = message.message;
					
					delete this.users[oldname];
					this.users[user.name] = user;
					
					for (var i in this.channels) {
						if (this.channels.hasOwnProperty(i)) {
							var channel = this.channels[i];
							
							if (channel.userlist.hasOwnProperty(oldname)) {
								var userobj = channel.userlist[oldname];
								delete channel.userlist[oldname];
								channel.userlist[user.name] = userobj;
							}
						}
					}

					this.emit("nick", message.message); // message.message is the new nick*/
					break;
				case "JOIN":
					var channel_name = message.message;
					var channel = this.get_channel(channel_name);
					var user = this.get_user(
						IRCUser.parse_prefix(message.prefix).name);
					
					channel.userlist[user.name] = {operator: false, voice: false, user: user};
					if (user.name !== this.nick) {
						channel.emit("join", user, channel);
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
							nick = nick.substr(1);
							break;
						case '+':
							voice = true;
							nick = nick.substr(1);
							break;
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
				case "MODE":
					var channel_name = message.params[0];
					var mode_str = message.params[1];
					var user_name = message.params[2];
					
					if (!user_name) break;
					
					var channel = this.get_channel(channel_name);
					var userinfo = channel.userlist[user_name];
					switch (mode_str[0]) {
					case "+":
						if (/o/.test(mode_str)) {
							userinfo.operator = true;
						}
						if (/v/.test(mode_str)) {
							userinfo.voice = true;
						}
						break;
					case "-":
						if (/o/.test(mode_str)) {
							userinfo.operator = false;
						}
						if (/v/.test(mode_str)) {
							userinfo.voice = false;
						}
						break;
					default:
						console.log("Unknown mode string");
						Util.puts(Util.inspect(message));
					}
					break;
				default:
					//console.log("Unknown command: ", message.command);
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

IRCChannel.prototype.self_command = function(command, message, options) {
	if (typeof options !== "object") options = {};
	
	if (typeof options.colors === "undefined") options.colors = false;
	if (typeof options.control === "undefined") options.control = false;
	
	if (typeof options.truncate === "undefined") options.truncate = false;
	if (typeof options.maxlength === "undefined") options.maxlength = 382;
	if (typeof options.maxlines === "undefined") options.maxlines = 1;
	if (typeof options.truncmsg === "undefined") options.truncmsg = "\u2026";
	
	// First we split the message by each line
	var lines = String(message).split(/[\r\n]+/g);
	
	// Then we get the number of lines we will output
	var linenums = options.truncate ? Math.min(options.maxlines, lines.length) : lines.length;
	
	for (var i = 0; i < linenums; i++) {

		// Then we remove all characters that are considered bad. (< 32)
		if (!options.colors) { lines[i] = this.client.strip_color(lines[i]); };
		if (!options.control) { lines[i] = this.client.strip_control(lines[i]); }
	
		if (lines[i].length) {
		
			if (options.truncate) {
				var realsize = options.maxlength - options.truncmsg.length;
				if (lines[i].length > options.maxlength) {
					lines[i] = lines[i].substr(0, realsize) + options.truncmsg;
				}
			}
		
			this.client.raw(command + " " + this.name + " :" + lines[i]);
			Util.puts(this.client.host + ": " + this.name + " > "+lines[i]);
		}

	}

}

IRCChannel.prototype.send_reply = function(user, message, options) {
	if (user === this) {
		this.send (message, options);
	} else {
		this.send (user.name + ": " + message, options);
	}
}


IRCChannel.prototype.send = function(message, options) {
	this.self_command ("PRIVMSG", message, options);
};

IRCChannel.prototype.notice = function(message, options) {
	this.self_command ("NOTICE", message, options);
};


IRCChannel.prototype.send_action = function(message, options) {
	var ctcp = "\x01";
	
	if (typeof options !== "object") options = {control: true};
	else options.control = true;
	
	this.self_command ("PRIVMSG", ctcp + "ACTION " + message + ctcp, options);
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
IRCUser.prototype.send_reply = IRCChannel.prototype.send_reply;
IRCUser.prototype.send_action = IRCChannel.prototype.send_action;
IRCUser.prototype.self_command = IRCChannel.prototype.self_command;
