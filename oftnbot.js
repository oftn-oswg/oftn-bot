var fs = require("fs");
var url = require("url");
var util = require("util");
var http = require("http");
var path = require("path");
var querystring = require('querystring');

var Bot = require("./lib/irc");
var Client = require("./lib/irc/client");

var Sol = require("./lib/sol");
var Sandbox = require("./lib/sandbox");
var FactoidServer = require("./lib/factoidserv");
var FeelingLucky = require("./lib/feelinglucky");

var Shared = require("./shared");

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


var ΩF_0Bot = function(profile) {
	Bot.call(this, profile);
	
	this.sandbox = new Sandbox(path.join(__dirname, "oftnbot-utils.js"));
	this.factoids = new FactoidServer(path.join(__dirname, "oftnbot-factoids.json"));

	this.set_log_level(this.LOG_ALL);
	this.set_trigger("!"); // Exclamation
	
	this.start_github_server(9370);
	this.github_context = null;
};


util.inherits(ΩF_0Bot, Bot);

ΩF_0Bot.prototype.init = function() {
	Bot.prototype.init.call(this);

	this.register_listener(/^((?:sm?|v8?|js?|>>?)>)([^>].*)+/, Shared.execute_js);
	this.register_listener(/^::(.*)/, this.execute_paws);
	
	this.register_command("topic", Shared.topic);
	this.register_command("find", Shared.find);
	this.register_command("learn", Shared.learn, {allow_intentions: false});
	this.register_command("forget", Shared.forget, {allow_intentions: false});
	this.register_command("commands", Shared.commands);
	this.register_command("g", Shared.google);

	this.register_command("sol", this.sol);
	
	this.password = "I solemnly swear that I am up to no good.";
	
	this.register_command("access", function(context, text) {
		if (context.priv && text === this.password) {
			context.sender.access = true;
			context.channel.send_reply(context.sender, "Access granted.");
		} else {
			context.channel.send_reply(context.sender, "Incorrect password.");
		}
	}, {hidden: true});

	this.register_command("best", function(context, text) {
		text = text.toUpperCase();
		var word = text.match(/[\s\x0F]*(\w+)$/);
		if (word) {
			word = word[1];
		} else {
			word = text;
		}
		context.channel.send (text.replace(/\s+/g, '') + " IS BEST"+word);
	});
	
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
		
		if (text === "stop") {
			return clearInterval(this.countdown_timer);
		}
		
		length = parseFloat(text, 10);
		if (isNaN(length)) { length = 3; }
		
		decrement = length / Math.abs(Math.round(length));
		if (!isFinite(decrement)) decrement = length;
		
		clearInterval (this.countdown_timer);
		this.countdown_timer = setInterval(function() {
			if (length > 0.1 || length < -0.1) {
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
	
	this.on('command_not_found', this.find);
	
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
	
	this.register_listener(/^::/, function(c) {
		c.channel.send_reply(c.intent,
			"Paws code executed sucessfully. (no output)");
	});
	
	
	var kicked = {};
	
	this.register_command ("kick", function(context, text) {
		var channel = context.channel, userlist, client = context.client;
	
		if (context.priv) {
			return channel.send_reply (context.sender, "Must be in the channel to !kick.");
		}
		
		if (kicked[context.sender.name] === text.toLowerCase())
			return channel.send_reply (context.sender, "Thou shall not seeketh revenge.");
	
		userlist = channel.userlist;
		if (text.toLowerCase () === "everyone") {
			return channel.send_reply (context.sender, "Ha! Do I *look* like alexgordon?");
		} else if (userlist.hasOwnProperty(text)) {
			kicked[text.toLowerCase()] = context.sender.name;
			client.raw (
				"KICK "+context.channel.name+" "+text+
				" :Probably because you were being an idiot.");
		} else {
			return channel.send_reply (context.sender, "No one named `"+text+"` in the channel.");
		}
	});
	
	
	this.register_command("twister", function(context) {
		context.channel.send(
			rand(["Left ", "Right "]) +
			rand(["foot on ", "hand on "]) +
			rand(["red!", "yellow!", "green!", "blue!"]));
		
		function rand(a) {
			return a[Math.random()*a.length|0];
		}
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


ΩF_0Bot.prototype.execute_paws = function(context, text, code) {
	var Runtime = require("/home/eboyjr/paws-monkey/src/Runtime.js");
	var Parser = require("/home/eboyjr/paws-monkey/src/Parser.js");
	var AST = require("/home/eboyjr/paws-monkey/src/AST.js");
	
	var runtime = new Runtime;
	var parser = new Parser(runtime, code.replace(/;/g, '\n'));
	var ast;
	
	try {
		context.channel.send_reply (context.intent, tree(parser.parse()), {color: true});
	} catch (e) {
		context.channel.send_reply (context.intent, String(e));
	}
	
	
	function tree (ast, stmt) {
		var frag;
		if (ast instanceof AST.Leaf) {
			if (ast.value === "<a dog>") ast.value = "(A mutha fuckin' dog!)";
			return "\x032\x1F"+ast.value+"\x0F";
		}
		
		frag = [];
	
		for (var i = 0, len = ast.nodes.length; i < len; i++) {
			frag.push(tree(ast.nodes[i], ast instanceof AST.Juxtaposition));
		}
		
		if (ast instanceof AST.Juxtaposition) {
		
			return (stmt ? "\x033(\x0F" : "") +
				frag.join(" ") +
				(stmt ? "\x033)\x0F" : "");
				
		} else {
			return "\x036{\x0F " + frag.join("; ") + " \x036}\x0F";
		}
	}

};


ΩF_0Bot.prototype.find = function(context, text) {

	if (context.priv) {
		return Shared.find(context, text);
	}
	
	try {
		context.channel.send_reply(context.intent, this.factoids.find(text, true), {color: true});
	} catch(e) {
		// Factoid not found, do nothing.
	}
};

function Flags(text) {
    var m = text.match(/^-([^ ]+)( (.+))?/);
    if (m) {
	var s = m[1].split("");
	return {all: s, flags: s.reduce(function(o,i) { o[i] = true; return o; }, {}), args: m[2] ? m[3] : undefined};
    } else {
	return null;
    }
}

ΩF_0Bot.prototype.sol = function (context, text) {
    if (text) {
	var f = Flags(text);
	if (f) {
	    if (f.flags.r && f.all.length == 2) {
		if (f.flags.s && f.args) {
		    // to relative gregorian from relative sol
		    return context.channel.send_reply(context.intent, Sol.parseSol(f.args, false).toStupidString());
		} else if (f.flags.g && f.args) {
		    // to relative sol from relative gregorian
		    return context.channel.send_reply(context.intent, Sol.parseStupid(f.args, false).toString());
		}
	    } else if (f.flags.a && f.all.length == 2) {
		if (f.flags.s && f.args) {
		    // add a relative UJD to the current time and return the result in gregorian time
		    return context.channel.send_reply(context.intent, new Sol(new Sol().floating + Sol.parseSol(f.args).floating).toStupidString());
		} else if (f.flags.g && f.args) {
		    // add a relative gregorian time to the current time and return the result as a UJD
		    return context.channel.send_reply(context.intent, new Sol(new Sol().floating + Sol.parseStupid(f.args).floating).toString());
		}
	    } else if (f.all.length == 1) {
		if (f.flags.s && f.args) {
		    // to absolute gregorian from absolute sol
		    return context.channel.send_reply(context.intent, Sol.parseSol(f.args, true).toStupidString());
		} else if (f.flags.g && f.args) {
		    // to absolute sol from absolute gregorian
		    return context.channel.send_reply(context.intent, Sol.parseStupid(f.args, true).toString());
		}
	    }
	}
	context.channel.send_reply(context.sender,
				   "Usage: !sol [-s[ra] | -g[ra]]. -s: from UJD. -g: from Gregorian. -r: specify relativity. -a: add to current time.");
    } else {
	// current time in UJD
	context.channel.send_reply(context.intent, new Sol().toString());
    }
};

var profile = require("./oftnbot-profile.js");
new ΩF_0Bot(profile).init();
