var HTTP = require("http");
var Utils = require("util");
var Static = require('node-static');
var URL = require('url');

var File = require('fs');


var FactoidHTTP = exports.FactoidHTTP = function(obj) {
	this.db = obj.db;
	this.port = 3000;

	this.staticfiles = new Static.Server(__dirname+'/../../factoids/');
	HTTP.createServer(this.request.bind(this)).listen(this.port);

	Utils.puts("Server running at http://localhost:"+this.port+"/");
};


FactoidHTTP.prototype.request = function (request, response) {
	var parsed = URL.parse(request.url, true);
	if (parsed.pathname === "/db.json") {
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.end(this.query_database(parsed.query)+"\n");
	} else {
		this.staticfiles.serve(request, response);
	}
};


FactoidHTTP.prototype.query_database = function(obj) {
	if (typeof obj.maxnum === "undefined") obj.maxnum = 10;
	if (typeof obj.filter === "undefined") obj.filter = false;

	var db = this.db;
	var result = [];
	var cache = {};
	var unresolved = [];

	for (var i in db) {

		if (typeof db[i].value !== "undefined") {

			// Check if factoids should be filtered and filter it
			if (obj.filter) {
				var terms = obj.filter.split(" "), found = false;
				var string = db[i].value;
				for (var t=0, len=terms.length; t < len; t++) {
					if (~string.indexOf(terms[t])) {
						found = true;
						break;
					}
				}
				if (!found) continue;
			}

			var add = {keys: [i], value: db[i].value, popularity: db[i].popularity};
			result.push(add);
			cache[i] = add;
			continue;
		}
		if (typeof db[i].alias !== "undefined") {
			if (typeof cache[db[i].alias] === "undefined") {
				unresolved.push({key: i, alias: db[i].alias});
			} else {
				cache[db[i].alias].keys.push(i);
			}
		}
	}
	for (var i = 0, len = unresolved.length; i < len; i++) {
		if (typeof cache[unresolved[i].alias] === "undefined") {
			break; // Aliases nothing
		} else {
			cache[unresolved[i].alias].keys.push(unresolved[i].key);
		}
	}

	var result = result.slice(0, obj.maxnum);

	result.sort(function(a, b) {
		return b.popularity - a.popularity;
	});

	return JSON.stringify(result);
};
/*
File.readFile("/var/www/node/vbotjr/factoids/factoids.json", function (err, data) {
		if (err) Util.puts(Util.inspect(err));
		try {
			var self = {}
			self.db = JSON.parse(data).factoids;
			new FactoidHTTP(self);
		} catch (e) {
			Utils.puts("Factoid DB Parse Error: "+e.name+": "+e.message);
		}
	}); */
