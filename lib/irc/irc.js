var Util = require("util");
var Net = require("net");

var IRCClient = exports.IRCClient = function(host, port) {
	this.host = host || "localhost";
	this.port = port || 6667;

	this.connection = null;
	this.buffer = "";
	this.encoding = "utf8";
	this.timeout = 10 * 60 * 60 * 1000;

	this.nick = null;
	this.user = null;
	this.real = null;
}

Util.inherits(IRCClient, process.EventEmitter);

IRCClient.prototype.bind = function(scope, callback) {
	var binded = Array.prototype.slice.call(arguments, 2);

	return function() {
		callback.apply(scope, binded.concat(Array.prototype.slice.call(arguments)));
	};
};

IRCClient.prototype.connect = function(nick, user, real, password) {
	var connection = Net.createConnection(this.port, this.host);
	connection.setEncoding(this.encoding);
	connection.setTimeout(this.timeout);

	for (var i in this.events) {
		connection.on(i, this.bind(this, this.events[i]));
	}

	this.nick = nick;
	this.user = user || "guest";
	this.real = real || "Guest";
	this.password = password || null;

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
		throw new Error("Cannot send with readyState: "+this.connection.readyState);
	}

	this.connection.write(message + "\r\n", this.encoding);
};

IRCClient.prototype.parse = function(incoming) {
	var match = message.match(/(?:(:[^\s]+) )?([^\s]+) (.+)/);
	var parsed = {
		prefix: match[1],
		command: match[2]
	};

	var params = match[3].match(/(.*?) ?:(.*)/);
	if (params) {
		// Params before :
		params[1] = (params[1]) ? params[1].split(" ") : [];
		// Rest after :
		params[2] = params[2] ? [params[2]] : [];

		params = params[1].concat(params[2]);
	} else {
		params = match[3].split(" ");
	}

	parsed.params = params;
	return parsed;
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

			Util.puts(message);
			message = this.parse(message);

			this.emit.apply(this, [message.command, message.prefix].concat(message.params));

			if (message !== false) {
				switch (message.command) {
				case "PING":
					this.raw("PONG :"+message.params[0]);
					break;
				}
			}
		}
	},
	eof: function() {
		this.disconnect("End of file");
	},
	timeout: function() {
		this.disconnect("Timeout");
	},
	end: function() {
		this.disconnect("End");
	}
};
