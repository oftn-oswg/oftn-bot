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
var CanIUseServer = require("./lib/caniuse");

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
	this.caniuse_server = new CanIUseServer;
};


util.inherits(ΩF_0Bot, Bot);

ΩF_0Bot.prototype.init = function() {
	Bot.prototype.init.call(this);

	this.register_listener(/^((?:sm?|v8?|js?|hs?|>>?|>>>>|\|)>)([^>].*)+/, Shared.execute_js);
	this.register_listener(/\bhttps?:\/\/\S+/, this.url);

	this.register_command("topic", Shared.topic);
	this.register_command("find", Shared.find);
	this.register_command("learn", Shared.learn, {allow_intentions: false});
	this.register_command("forget", Shared.forget, {allow_intentions: false});
	this.register_command("commands", Shared.commands);
	this.register_command("tweet", this.tweet);
	this.register_command("g", Shared.google);
	this.register_command("gh", this.gh);
	this.register_command("projects", this.projects);
	this.register_command("unicode", this.unicode);
	this.register_command("caniuse", this.caniuse);
	this.register_command("ciu", "caniuse");
	this.register_command("auth", Shared.reauthenticate, {allow_intentions: false});


	this.register_command("rand", function(context, text) {
		var options = text.split(',');
		context.channel.send_reply (context.sender,
			options[Math.random() * options.length | 0].trim());
		}
	);

	var tempurature = /(?:^|[ \(\[])(-?\d+(?:\.\d+)?)[\s°]*([CF])(?:$|[ .\)\]])/g;

	this.register_listener(tempurature, function(context, text) {
		var cache, now, cache_time, match, id, celsius, result, value, conversions = [];

		now = Date.now();
		cache = context.channel.temp_cache = context.channel.temp_cache || {};
		cache_time = 1000 * 60 * 15; /* 15 minutes */

		while (match = tempurature.exec(text)) {
			value = match[1];
			unit = match[2];

			value = parseFloat (value);
			celsius = (unit === "C");
			id = fmt(value) + "°" + unit;

			if (cache[id] > now - cache_time) {
				/* Tempurature has already been converted recently */
				continue;
			}
			cache[id] = now;

			if (celsius) {
				converted = value * (9/5) + 32;
				result = id + " = " + fmt(converted) + "°F";
			} else {
				converted = (value - 32) * (5/9);
				result = id + " = " + fmt(converted) + "°C";
			}

			conversions.push(result);
		}
		
		context.channel.send (conversions.join("; "));

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
		// name set from the profile
		if (client.name === "Freenode")
			this.github_context = client;
	});

	this.register_command("quiet", function (context, text) {
		var match;

		try {
			if (!context.sender.host) {
				throw new Error("Could not verify credentials.");
			}

			if (!/^oftn\/board\//.test(context.sender.host)) {
				throw new Error("You are not authorized.");
			}

			if (context.priv) {
				throw new Error("Can not be invoked via private message.");
			}

			var match = text.match(/^ *([^ ]+) *(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(\d*)s? *$/);

			if (!match) {
				throw new SyntaxError(
					"Usage: !quiet <user> <time>, where time is optional and specified as [NNd][NNh][NNm]<NN[s]> (defaults to 1m)");
			}

			var time = match.slice(2).map   (                                  function (i)   { return parseInt(i || 0, 10); })
			                         .zip   ([86400000, 3600000, 60000, 1000], function (x,y) { return x * y; })
			                         .reduce(                                  function (x,y) { return x + y; });

			if (time < 1) time = 60000;

			context.client.get_user("ChanServ").send("QUIET " + context.channel.name + " " + match[1]);

			setTimeout(function () {
				//console.log("(→ ChanServ) UNQUIET " + context.channel.name + " " + md[1]);
				context.client.get_user("ChanServ").send("UNQUIET " + context.channel.name + " " + match[1]);
			}, time);
		} catch (e) {
			context.channel.send_reply (context.sender, e);
		}
	});

	this.register_command("america", function(context) {
		var flag = [
			' ',
			'\x030,2  ★   ★   ★   ★   ★   ★  \x030,5                                 ',
			'\x030,2    ★   ★   ★   ★   ★    \x030,0                                 ',
			'\x030,2  ★   ★   ★   ★   ★   ★  \x030,5                                 ',
			'\x030,2    ★   ★   ★   ★   ★    \x030,0                                 ',
			'\x030,2  ★   ★   ★   ★   ★   ★  \x030,5                                 ',
			'\x030,2    ★   ★   ★   ★   ★    \x030,0                                 ',
			'\x030,2  ★   ★   ★   ★   ★   ★  \x030,5                                 ',
			'\x030,2    ★   ★   ★   ★   ★    \x030,0                                 ',
			'\x030,2  ★   ★   ★   ★   ★   ★  \x030,5                                 ',
			'\x030,0                                                          ',
			'\x030,5                                                          ',
			'\x030,0                                                          ',
			'\x030,5                                                          ',
			'\x030,0                                                          ',
			'\x030,5                                                          ',
			' '
		];

		if (!context.priv) {
			context.channel.send_reply (context.sender, "This command is only available in private.");
			return;
		}

		flag.forEach(function(string) {
			context.channel.send(string, {color: true});
		});

	});
};


ΩF_0Bot.prototype.start_github_server = function(port) {

	var users = {
		"eboyjr": "dsamarin",
		"eligrey": "eligrey",
		"otter": "otters",
		"FireyFly": "FireFly",
		"amcgregor": "GothAlice",
		"guipn": "guidj0s",
		"insidious": "Obfuscate",
		"killdream": "sorella",
		"mathiasbynens": "matjas",
		"navarr": "Navarr",
		"nisstyre56": "Nisstyre",
		"SilverTab": "jeannicolas",
		"Systemfault": "systemfault",
		"imbcmdth": "ImBcmDth"
	};

	http.createServer(function (request, response) {
		var payload = "", channel;
		
		// Get the channel to send messages in from the url
		channel = decodeURIComponent(url.parse(request.url).pathname.slice(1));
		if (!channel) {
			channel = "#oftn";
		}

		request.setEncoding("utf8");
		request.on("data", function(chunk) {
			payload += chunk;
		});

		// When the request has finished coming in.
		request.on("end", function() {
			try {
				var json = querystring.parse(payload).payload, result = [];
				var data = JSON.parse(json);

				var len = data.commits ? data.commits.length : 0;
				if (data.head_commit && len === 0) {
					data.commits.push(data.head_commit);
					len++;
				}

				console.log("Received GitHub update for %s (%d commits)", channel, len);

				if (len) {
					for (var i = 0; i < len; i++) {

						/* Get author information */
						var author = data.commits[i].author;
						var user = author.username || author.login || author.name || author.email;
						if (users[user]) {
							user = users[user];
						}

						/* Get commit message information and shorten */
						var message = data.commits[i].message;
						if (message) {
							message = message.split(/[\r\n]+/g)[0];
							if (message.length > 128) {
								message = message.substr(0, 127) + "…";
							}
						}

						/* Get name of repository */
						var repo = data.repository.name;

						/* Get url to commit information page, and shorten if it's a Github commit */
						var url = data.commits[i].url;
						if (url && /^https:\/\/github.com\/[^\/]+\/[^\/]+\/commit\/[a-z0-9]{40}$/.test(url)) {
							url = url.slice(0, -33);
						}

						/* Get branch information from data.ref */
						var branch = data.ref;
						if (branch) {
							branch = branch.replace(/^refs\/heads\//, "");
						}

						result.push(
							(repo ? "\x0311" + repo + "\x0F" : "") +
							(branch ? " \x038" + branch + "\x0F" : "") + ": " +
							(user ? "(" +user + ") " : "") +
							(message ? message + " " : "") + 
							(url ? url : "")
						);
					}
				}
			} catch (e) {
				console.error(e.stack);
			}

			if (result.length && this.github_context) {
				var chnl = this.github_context.get_channel(channel);
				for (var i = 0, len = result.length; i < len; i++) {
					chnl.send(result[i], {color: true});
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

	var options = { host: "api.github.com", headers: {'User-Agent': 'The oftn-bot IRC bot from #oftn on irc.freenode.net'}};

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
		path: "/users/" + username,
		headers: {'User-Agent': 'The oftn-bot IRC bot from #oftn on irc.freenode.net'}
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
	var username, auth;
	var twitters = {
		/* Board */
		"dsamarin": "^DS",
		"eligrey": "^EG",
		"devyn": "^DC",
		"inimino": "^MC",
		"gkatsev": "^GK",
		"cloudhead": "^AS",
		"yrashk": "^YR",
		"amcgregor": "^AG",

		"FireFly": "^JH"
	};

	try {

		if (!context.sender.host) {
			throw new Error("Could not verify credentials.");
		}

		auth = String(context.sender.host).match(/^oftn\/(?:member|board)\/(.*)$/);
		if (!auth) {
			throw new Error("You are not authorized.");
		}

		auth = twitters[auth[1]] ? twitters[auth[1]] : "\u2014" + auth[1];
		text = text + " " + auth;

		if (text.length > 140) {
			throw new Error("Status is over 140 characters. Get rid of at least "+(text.length-140)+" characters.");
		}

		this.twitter.updateStatus(text, function(data) {
			if (data.id_str) {
				context.channel.send ("Tweet successful: https://twitter.com/oftn_wg/status/"+data.id_str);
			} else {
				var json = data.data;
				data = JSON.parse (json);
				context.channel.send ("Error posting tweet: " + data.error);
			}
		});

	} catch (e) {
		context.channel.send_reply(context.sender, e);
	}
};

var unilist;

ΩF_0Bot.prototype.unicode = function(context, text) {

	if (!unilist) {
		fs.readFile (path.join (__dirname, "UnicodeData.txt"), "utf8", function(err, data) {
			if (err) throw err;

			unilist = [];
			var regln = /^(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*);(.*)$/;

			var lines = data.split("\n");
			for (var i = 0, len = lines.length; i < len; i++) {
				var ch = lines[i].match(regln);
				if (ch) {
					var v = parseInt(ch[1], 16);
					unilist[v] = ch[2] || ch[11];
				}
			}

			context.channel.send_reply (context.intent, unicode (text));
		});
	} else {
		context.channel.send_reply (context.intent, unicode (text));
	}

	function unicode(text) {
		text = String(text);

		var result, hi, lo;

		// Sequence of decimal digits
		if (text.match (/^\d+$/))
			return lookup (parseInt (text, 10));

		result = text.match (/^(?:U\+|0x)([0-9a-f]+)$/i);

		// Sequence of hexadecimal digits
		if (result)
			return lookup (parseInt (result[1], 16));

		// Single unicode character
		switch (text.length) {
		case 1:
			return lookup (text.charCodeAt (0));
		case 2:
			hi = text.charCodeAt (0);
			if (hi >= 0xD800 && hi <= 0xDBFF) {
				lo = text.charCodeAt (1);
				var x = (hi & ((1 << 6) -1)) << 10 | lo & ((1 << 10) -1);
				var w = (hi >> 6) & ((1 << 5) - 1);
				var u = w + 1;
				var c = u << 16 | x;
				return lookup (c);
			}
		}

		// Search for character by name
		return search (text.toUpperCase());

		function lookup(ch) {
			if (unilist[ch])
				return unilist[ch] + " | " + String.fromCharCode(ch) + " (U+" + hex(ch) + ")";
			return "Character " + ch + " not in database.";
		}

		function hex(code) {
			return (code <= 0xf ? "000" : (code <= 0xff ? "00" : (code <= 0xfff ? "0" : ""))) + code.toString(16).toUpperCase();
		}

		function search(str) {
			var len = unilist.length;
			for (var i = 0; i < len; i++) {
				if (unilist[i] && unilist[i].indexOf (str) !== -1) {
					return lookup (i);
				}
			}
			return "Not found.";
		}
	}
};


ΩF_0Bot.prototype.url = function (context, text) {

	var match, regex = /https?:\/\/\S+/g;
	while (match = regex.exec (text)) {
		var vid, info = url.parse (match[0]);
		if (info.host === "youtu.be") {
			vid = info.pathname.slice(1);
		} else if (info.hostname.indexOf (".youtube.")) {
			vid = querystring.parse (info.query).v;
		}

		if (vid)
			youtube (vid, info.hash);
	}


	function youtube (vid, hash) {

		var data = {
			id: vid,
			key: "AIzaSyDiSI-jlejJfRXgbaDNvKX8AwdyBNVIYwQ",
			part: "snippet,contentDetails",
			fields: "items(snippet/title,contentDetails/duration)"
		};

		var opts = {
			method: "GET",
			hostname: "www.googleapis.com",
			path: "/youtube/v3/videos?" + querystring.stringify (data)
		};

		var req = https.request (opts, function (res) {
			var json;

			if (res.statusCode !== 200) {
				console.error ("YouTube API access failed.");
				return;
			}


			json = "";
			res.setEncoding ("utf8");
			res.on ("data", function (chunk) { json += chunk; });
			res.on ("end", function() {
				try {
					var data = JSON.parse(json);

					if (!data.items || !data.items.length)
						throw new Error ("YouTube API response contained no items.");

					for (var i = 0; i < data.items.length; i++) {
						try {
							var title = data.items[i].snippet.title;
							var duration = seconds_to_duration (parse_iso8601_duration (data.items[i].contentDetails.duration));

							context.channel.send ("\u00031,15You\u00030,5Tube\u000F | " + title + " | \u001F" + duration + "\u000F | https://youtu.be/" + vid + (hash ? hash : ""), {color: true});
						} catch (e) {
							console.error ("YouTube API parse error");
							console.error (e);
						}
					}
				} catch (e) {
					console.error ("Youtube API response not in correct JSON format.");
					console.error (e);
				}
			});
		});

		req.end ();
	}

	function parse_iso8601_duration (duration) {
		var seconds, match;

		match = duration.match (
			/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);

		seconds = parseInt (match[6], 10) | 0;             // Seconds
		seconds += parseInt (match[5], 10) * 60 | 0;       // Minutes
		seconds += parseInt (match[4], 10) * 3600 | 0;     // Hours
		seconds += parseInt (match[3], 10) * 86400 | 0;    // Days
		seconds += parseInt (match[2], 10) * 2628000 | 0;  // Months
		seconds += parseInt (match[1], 10) * 31536000 | 0; // Years

		return seconds;
	}

	function seconds_to_duration (seconds) {
		var hours, minutes;

		hours = Math.floor (seconds / 3600);
		seconds = seconds % 3600;

		minutes = Math.floor (seconds / 60);
		seconds = seconds % 60;

		return (
			hours
				? hours + ":" +
					(minutes
						? (minutes >= 10
							? minutes
							: "0" + minutes)
						: "00")
				: (minutes
					? minutes
					: ""
				)
			) +
			":" +
			(seconds
				? (seconds >= 10
					? seconds
					: "0" + seconds)
				: "00"
			);
	}
};


ΩF_0Bot.prototype.caniuse = function(context, text) {
	try {
		var text = this.caniuse_server.search(text);
		context.channel.send_reply(context.intent, text, {color: true});
	} catch(e) {
		context.channel.send_reply(context.sender, e);
	}
};

new ΩF_0Bot(Profile).init();
