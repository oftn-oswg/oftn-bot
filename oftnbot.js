var fs = require("fs");
var url = require("url");
var util = require("util");
var http = require("http");
var path = require("path");
var querystring = require('querystring');

var Bot = require("./lib/irc");
var Client = require("./lib/irc/client");

var Sandbox = require("./lib/sandbox");
var FactoidServer = require("./lib/factoidserv");
var FeelingLucky = require("./lib/feelinglucky");

var Shared = require("./shared");


var ΩF_0Bot = function(profile) {
	Bot.call(this, profile);
	
	this.sandbox = new Sandbox(path.join(__dirname, "oftnbot-utils.js"));
	this.factoids = new FactoidServer(path.join(__dirname, "oftnbot-factoids.json"));

	this.set_log_level(this.LOG_ALL);
	this.set_trigger("!"); // Exclamation
	
	this.start_github_server(9370);
	this.github_context = null;
	
	this.second = new Client({
		name: "Second",
		host: "208.71.169.36",//"irc.freenode.net",
		nick: "oftn-bot2",
		user: "oftn-bot",
		real: "The official ΩF:0 bot.",
	});
	this.second.connect();
};


util.inherits(ΩF_0Bot, Bot);

ΩF_0Bot.prototype.init = function() {
	Bot.prototype.init.call(this);

	this.register_listener(/^((?:sm?|v8?|js?|>>?)>)([^>].*)+/, Shared.execute_js);
	
	this.register_command("topic", Shared.topic);
	this.register_command("learn", Shared.learn, {allow_intentions: false});
	this.register_command("forget", Shared.forget, {allow_intentions: false});
	this.register_command("commands", Shared.commands);
	this.register_command("g", Shared.google);
	
	this.register_command("do", function(context, text) {
		
		if (context.channel.userlist[context.sender.name].operator) {
			var client = context.client, result;
			try {
				result = eval (text);
			} catch (e) {
				context.channel.send (e);
				return;
			}
			if (typeof result !== "undefined") {
				context.channel.send (require("./oftnbot-utils.js").pretty_print(result).substr(0, 400));
			}
			return;
		} else {
			context.sender.notice("You must be an operator to use my !do command.");
		}
	}, {allow_intentions: false, hidden: true});
	
	this.countdown_timer = null;

	this.register_command("countdown", function(context, text) {
	
		var length, decrement, self = this;
		
		if (text === "stop") { return clearInterval(this.countdown_timer); }
		
		length = parseFloat(text, 10);
		decrement = length / (length | 0);
		if (isNaN(length)) { length = 3; }
		
		length = Math.max(0, length);
		
		this.countdown_timer = setInterval(function() {
			if (length > 0) {
				context.channel.send(String((length*1000|0)/1000)+"...");
			} else {
				context.channel.send("Go!");
				clearInterval(self.countdown_timer);
			}
			length -= decrement;
		}, 1000);
	});
	
	this.on('invite', function(user, channel) {
		channel.join();
	});
	
	this.on('command_not_found', Shared.find);
	
	this.on('connect', function(client) {
		this.github_context = client;
	});
	
	this.queue = [];
	this.register_command("queue", function(context, text) {
		this.queue.push([context.sender, text]);
	});
	this.register_command("dequeue", function(context, text) {
		var item = (text !== "peek") ? this.queue.shift() : this.queue[0];
		if (item) {
			context.channel.send ("<"+item[0].name+"> "+item[1]);
		} else {
			context.channel.send_reply (context.sender, "The queue is empty.");
		}
	});
	
	this.queue = {};
	this.register_command("queue", function(context, text) {
		var who = context.intent.name;
		if (!this.queue[who]) this.queue[who] = [];
		this.queue[who].push([context.sender, text]);
	});
	this.register_command("dequeue", function(context, text) {
		var who = context.intent.name;
		if (!this.queue[who]) this.queue[who] = [];
		var item = (text == "peek") ? this.queue[who][0] : this.queue[who].shift();
		if (item) {
			context.channel.send_reply (context.intent, "<"+item[0].name+"> "+item[1]);
		} else {
			context.channel.send_reply (context.sender, "The queue is empty.");
		}
	});
	
	
	this.register_command("sayas", function(context, text) {
		var who = text.split(/\s+/g)[0];
		Client.prototype.nick.call(this.second, who);
		this.second.get_channel("##Paws").send(text.substr(who.length).trim());
	});

};


ΩF_0Bot.prototype.start_github_server = function(port) {

	http.createServer(function (request, response) {
		var chunks = [], channel;
		
		// Get the channel to send messages in from the url
		channel = url.parse(request.url).pathname.replace(/[^A-Z0-9\.]/ig, '').replace(/\./g, '#');
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
			var json = querystring.parse(chunks.join("")).payload, result = [], len;
			try {
				var data = JSON.parse(json);
				if (len = data.commits.length) {
					for (var i = 0; i < len; i++) {
						result.push("\x036* "+data.repository.name+"\x0F "+data.commits[i].message+" \x032<"+data.commits[i].url.slice(0, -33)+">\x0F\x031 "+data.commits[i].author.username+"\x0F");
					}
				}
			} catch (e) {}
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
	util.puts("Github server running at port: "+port);
};


var profile = require("./oftnbot-profile.js");
new ΩF_0Bot(profile).init();
