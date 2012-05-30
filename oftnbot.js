var fs = require("fs");
var url = require("url");
var util = require("util");
var http = require("http");
var https = require('https');
var path = require("path");
var querystring = require('querystring');

var Bot = require("./lib/irc");
var Client = require("./lib/irc/client");

var Sol = require("./lib/sol");
var Sandbox = require("./lib/sandbox");
var FactoidServer = require("./lib/factoidserv");
var FeelingLucky = require("./lib/feelinglucky");

var Shared = require("./shared");
var Profile = require("./oftnbot-profile");

var Twitter = require("twitter");

String.prototype.repeat = function(i) {
	var d = '', t = this;
	while (i) {
		if (i & 1) {
			d += t;
		}
		t += t;
		i >>= 1;
	}
	return d;
};

Array.prototype.zip = function (other, zipFunc) {
	var i, out = [], max = Math.min(this.length, other.length);

	if (typeof zipFunc !== "function")
		zipFunc = function (x, y) { return [x, y] };

	for (i = 0; i < max; i++)
		out.push(zipFunc(this[i], other[i]));

	return out;
};


var ΩF_0Bot = function(profile) {
	Bot.call(this, profile);
	
	this.sandbox = new Sandbox(path.join(__dirname, "oftnbot-utils.js"));
	this.factoids = new FactoidServer(path.join(__dirname, "oftnbot-factoids.json"));

	this.set_log_level(this.LOG_ALL);
	this.set_trigger("!"); // Exclamation
	
	this.start_github_server(9370);
	this.github_context = null;

	this.twitter = new Twitter(Profile.twitter);
};


util.inherits(ΩF_0Bot, Bot);

ΩF_0Bot.prototype.init = function() {
	Bot.prototype.init.call(this);

	this.register_listener(/^((?:sm?|v8?|js?|hs?|>>?|\|)>)([^>].*)+/, Shared.execute_js);
	this.register_command("topic", Shared.topic);
	this.register_command("find", Shared.find);
	this.register_command("learn", Shared.learn, {allow_intentions: false});
	this.register_command("forget", Shared.forget, {allow_intentions: false});
	this.register_command("commands", Shared.commands);
	this.register_command("tweet", this.tweet);
	this.register_command("g", Shared.google);
	this.register_command("gh", this.gh);
	this.register_command("projects", this.projects);

	this.register_listener(/^([a-z0-9]+[:,])?\s*((lol|oh|wtf|hey|no|omg|um|but|actually|idk|also|and|just|then|what|wat|woah|whoah|ok|okay)\s*)*\bwait\b/i, function(context) {
		if (context.sender.name === "sephr") {
			context.client.raw ("PRIVMSG ChanServ :OP #oftn");
			setTimeout (function() {
				context.client.raw ("KICK #oftn sephr :You're not allowed to use wait in that way.");
				context.client.raw ("MODE #oftn +b *!*@unaffiliated/sephr :");
				context.client.raw ("PRIVMSG ChanServ :DEOP #oftn");
			}, 2 * 1000);
		}
	});

	this.register_listener(/(-?\b\d+(?:\.\d*)?)\s+°?\s*([FC])\b/i, function(context, text, value, unit) {
		var celsius, result;

		value = parseFloat (value);
		celsius = (unit === "C" || unit === "c");

		if (celsius) {
			converted = value * (9/5) + 32;
			result = fmt(value) + " °C is " + fmt(converted) + " °F";
		} else {
			converted = (value - 32) * (5/9);
			result = fmt(value) + " °F is " + fmt(converted) + " °C";
		}
		
		context.channel.send (result);

		function fmt(value) {
			return String(Math.round(value*100)/100);
		}
	});

	this.password = "I solemnly swear that I am up to no evil";
	
	this.register_command("access", function(context, text) {
		if (context.priv && text === this.password) {
			context.sender.access = true;
			context.channel.send_reply(context.sender, "Access granted.");
		} else {
			context.channel.send_reply(context.sender, "Incorrect password.");
		}
	}, {hidden: true});

	this.register_listener(/^\x0F\x0F(.+)/, function(context, text, code) {
			var result;
			
			if (!context.sender.access) {
				var hours = 1000*60*60;
				var now = +new Date();

				if (now > context.sender.last_invocation + 3*hours ||
					typeof context.sender.last_invocation === "undefined") {

					context.channel.send_action ("scolds "+context.sender.name+" and puts them in a time out.");
					context.sender.last_invocation = now;

				}
				return;
			}
			
			try {
				with (context) {
					result = eval (code);
				}
			} catch (e) {
				context.channel.send_reply (context.sender, e);
				return;
			}
			if (result != null) {
				context.channel.send_reply (context.sender, require("./oftnbot-utils.js").pretty_print(result).substr(0, 400));
			}
	});
	
	this.countdown_timer = null;

	this.register_command("countdown", function(context, text) {
	
		var length, decrement, self = this;
		
		clearInterval(this.countdown_timer);
		
		length = 3;
		
		if (text !== "stop") { 
			this.countdown_timer = setInterval(function() {
				if (length) {
					context.channel.send(String(length+"..."));
				} else {
					context.channel.send("Go!");
					clearInterval(self.countdown_timer);
				}
				length--;
			}, 1000);
		}
	});
	
	this.on('invite', function(user, channel) {
		channel.join();
	});
	
	this.on('command_not_found', this.find);
	
	this.on('connect', function(client) {
		this.github_context = client;
	});
	
	/*this.register_command("choc", function(context) {
		var userlist = context.channel.userlist;

		try {
			if (context.priv) throw new Error("Cannot use command in private.");

			var authorized = ["alexgordon", "jeannicolas", "eboy", "locks", "CapsuleNZ"];
			if (!~authorized.indexOf(context.sender.name)) {
				throw new Error("You are not authorized to use this command.");
			}

			var client = http.createClient(80, "chocolatapp.com");
			var request = client.request ("GET",
				Profile.choc_invite,
				{ "host": "chocolatapp.com" });

			request.addListener("response", function(response) {
				response.setEncoding("utf8");
				var url = '';
				response.addListener('data', function(data) { url += data; });
				response.addListener('end', function() {
					// Send url
					context.channel.send_reply (context.intent, "An invite URL has been sent to you. Please check your private messages.");
					context.intent.send (url);
				});
			});
			request.end();
		} catch (e) {
			context.channel.send_reply (context.sender, e);
		}
	});
	//*/


	this.register_command("quiet", function (context, text) {
		var md = text.match(/^ *([^ ]+) *(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(\d*)s? *$/);

		if (context.priv)
			return context.channel.send ("Can not be invoked via PM.");

		if (md) {
			var time = md.slice(2).map   (                                  function (i)   { return parseInt(i || 0, 10); })
			                      .zip   ([86400000, 3600000, 60000, 1000], function (x,y) { return x * y; })
			                      .reduce(                                  function (x,y) { return x + y; });

			if (time < 1) time = 60000;

			//console.log("(→ ChanServ) QUIET " + context.channel.name + " " + md[1]);
			context.client.get_user("ChanServ").send("QUIET " + context.channel.name + " " + md[1]);

			setTimeout(function () {
				//console.log("(→ ChanServ) UNQUIET " + context.channel.name + " " + md[1]);
				context.client.get_user("ChanServ").send("UNQUIET " + context.channel.name + " " + md[1]);
			}, time);
		} else {
			context.channel.send_reply (context.sender, "Usage: !quiet <user> [time=1m], where time is specified as [NNd][NNh][NNm]<NN[s]>");
		}
	});
};


ΩF_0Bot.prototype.start_github_server = function(port) {

	http.createServer(function (request, response) {
		var chunks = [], channel;
		
		// Get the channel to send messages in from the url
		channel = decodeURIComponent(url.parse(request.url).pathname.slice(1));
		if (!channel) {
			channel = "#oftn";
		}
		console.log("Received GitHub update for %s", channel);
		
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
						var author = data.commits[i].author;
						author = author.username || author.login || author.name || author.email;
						var commitmsg = data.commits[i].message.replace(/[\r\n]/g, ' ').replace(/^(.{64}).+$/, '$1…');
						result.push("\x036* "+data.repository.name+"\x0F "+commitmsg+" \x032<"+data.commits[i].url.slice(0, -33)+">\x0F\x0310 "+author+"\x0F");
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

ΩF_0Bot.prototype.find = function(context, text) {

	if (context.priv) {
		return Shared.find.call(this, context, text);
	}
	
	try {
		context.channel.send_reply(context.intent, this.factoids.find(text, true), {color: true});
	} catch(e) {
		// Factoid not found, do nothing.
	}
};

ΩF_0Bot.prototype.projects = function(context, project) {

	var options = { host: "api.github.com" };

	if (project) {
		// Output information for specific project.
		options.path = "/repos/oftn/"+project;
		https.get (options, function(res) {
			var json = "";
			res.on ("data", function(data) { json += data; });
			res.on ("end", function() {
				var data = JSON.parse (json);

				if (data.message) {
					context.channel.send_reply (context.intent, data.message);
					return;
				}

				var reply = [];
				reply.push ("\x036"+data.name+"\x0f:");
				reply.push (data.description);

				if (data.language) reply.push ("[\x0310"+data.language+"\x0f]");
				if (data.homepage) reply.push ("\x032<"+data.homepage+">\x0f");

				if (data.pushed_at) {
					var diff = Date.now() - new Date(data.pushed_at).getTime();
					var times = ["second"];
					var relative = (function(diff) {
						var term, shift = diff/1000|0;
						if (shift < 45) { term = "second"; }
						else if (shift < 2700) { shift /= 60; term = "minute"; }
						else if (shift < 64800) { shift /= 3600; term = "hour"; }
						else { shift = shift / 3600 / 24; term = "day"; }

						shift |= 0;
						if (shift != 1) term += "s";
						return "(updated "+shift+" "+term+" ago)";
					})(diff);
					reply.push (relative);
				}
				context.channel.send_reply (context.intent, reply.join (" "), {color: true});
			});
		});
	} else {
		// Output public repositories.
		options.path = "/orgs/oftn/repos";
		https.get (options, function(res) {
			var json = "";
			res.on ("data", function(data) { json += data; });
			res.on ("end", function() {

				var data = JSON.parse (json);
				var reply = [];

				data.sort (function(a, b) {
					return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
				});

				for (var i = 0, len = Math.min(data.length, 12); i < len; i++) {
					//if (data[i].fork) continue;
					reply.push ("\x036"+data[i].name+"\x0F");
				}

				context.channel.send_reply (context.intent, "Projects of the ΩF:∅ Foundation: " + reply.join(", "), {color: true});
			});
		});
	}
};

ΩF_0Bot.prototype.gh = function(context, username) {

	var options = {
		host: "api.github.com",
		path: "/users/" + username
	};

	https.get (options, function(res) {
		var json = "";
		res.on ("data", function(data) { json += data; });
		res.on ("end", function() {
			var data = JSON.parse (json);
			var reply = [];

			if (data.name)  reply.push (data.name);
			if (data.email) reply.push ("<"+data.email+">");
			if (data.html_url) reply.push ("| "+data.html_url+" |");
			if (data.blog)  reply.push (data.blog);
			if (data.location) reply.push ("("+data.location+")");

			if (data.created_at) {
				var d = new Date(data.created_at);
				var str = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] + " " + (d.getDate()+1) + ", " + d.getFullYear();
				reply.push ("- Member since: "+str);
			}

			if (data.public_repos) reply.push ("- " + data.public_repos + " public repo" + (data.public_repos-1?"s":""));

			context.channel.send_reply (context.intent, reply.join(" "));
		});
	}); 

};

ΩF_0Bot.prototype.tweet = function(context, text) {
	var username;
	var authorized = {
		"eboy": "eboyjr",
		"sephr": "sephr",
		"devyn": "devynci",
		"inimino": "inimino",
		"gkatsev": "gkatsev",
		"cloudhead": "cloudhead",
		"yrashk": "yrashk"
	};
	
	if (!authorized.hasOwnProperty (context.sender.name)) return;
	username = authorized[context.sender.name];

	if (text.length > 140) {
		context.channel.send_reply (context.sender, "Error: Status is over 140 characters. Get rid of at least "+(text.length-140)+" characters.");
		return;
	}

	this.twitter.updateStatus(text + " \u2014@" + username, function(data) {
		if (data.id_str) {
			context.channel.send ("Tweet successful: https://twitter.com/oftn_foundation/status/"+data.id_str);
		} else 
			var json = data.data;
			data = JSON.parse (json);{
			context.channel.send ("Error posting tweet: " + data.error);
		}
	});
};

new ΩF_0Bot(Profile).init();
