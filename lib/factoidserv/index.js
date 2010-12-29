var Utils = require("util");
var File = require("fs");

var FactoidServer = exports.FactoidServer = function(filename) {
	var self = this;
	this.filename = filename;
	this.changed = false;
	this.loaded = false;
	this.db = {};
	this.timeout = null;
	this.wait = 60000; // wait 1 minute before writing to disk
	
	File.readFile(filename, function (err, data) {
		if (err) Util.puts(Util.inspect(err));
		try {
			self.db = JSON.parse(data).factoids;
			self.loaded = true;
		} catch (e) {
			Utils.puts("Factoid DB Parse Error: "+e.name+": "+e.message);
		}
	});
	
	process.on("exit", function() {
		if (self.changed) {
			self.flush();
		}
	});
};

FactoidServer.prototype.register_activity = function() {
	// Let's write to disk after 1 minute of inactivity
	if (this.timeout !== null) {
		clearTimeout(this.timeout);
	}
	this.timeout = setTimeout(function() {
		if (this.changed) {
			this.flush();
		}
	}.bind(this), this.wait)
};

FactoidServer.prototype.flush = function() {
	try {
		var write = JSON.stringify({wait: this.wait, factoids: this.db});
		Utils.puts("Writing new factoids to disk...");
		File.writeFileSync(this.filename, write);
		this.changed = false;
	} catch (e) {
		Utils.puts("Cannot stringify db: "+e.name+": "+e.message);
	}
};

FactoidServer.prototype.learn = function(key, value) {
	this.db[key] = {value: value, popularity: 0};
	this.changed = true;
	this.register_activity();
};

FactoidServer.prototype.find = function(key) {
	var thing = this.db[key];
	if (typeof thing === "undefined") return void 0;
	thing.popularity++;
	this.changed = true;
	this.register_activity();
	return thing.value;
};

FactoidServer.prototype.search = function(pattern, num) {
	if (typeof num !== "number") num = 5;
	var found = [], cat, db = this.db;
	
	for (var i in db) {
		cat = (i+" "+db[i].value).toLowerCase();
		if (~cat.indexOf(pattern.toLowerCase())) {
			found.push(i);
		}
	}
	
	found.sort(function(a, b) { return db[b].popularity - db[a].popularity; });
	return found.slice(0, num);
};

FactoidServer.prototype.forget = function(key) {
	if (typeof this.db[key] === "undefined") {
		return false;
	}
	delete this.db[key];
	this.changed = true;
	this.register_activity();
	return true;
};
