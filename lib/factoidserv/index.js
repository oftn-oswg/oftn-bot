var Utils = require("util");
var File = require("fs");
//var FactoidHTTP = require('./factoidhttp');

var FactoidServer = exports.FactoidServer = function(filename) {
	var self = this;
	this.filename = filename;
	this.changed = false;
	this.loaded = false;
	this.db = {};
	this.timeout = null;
	this.wait = 5 * 60 * 1000; // wait after 5 minutes of inactivity before writing to disk
	
	this.instantwrite = false;
	
	File.readFile(filename, function (err, data) {
		if (err) Util.puts(Util.inspect(err));
		try {
			self.db = JSON.parse(data).factoids;
			self.loaded = true;
		} catch (e) {
			Utils.puts("Factoid DB Parse Error: "+e.name+": "+e.message);
		}
	});
	
	//this.server = new FactoidHTTP(this.db); buggy as all hell
	
	process.on("exit", function() {
		if (self.changed) {
			self.flush();
		}
	});
};


FactoidServer.prototype.register_activity = function() {
	if (this.timeout !== null) {
		clearTimeout(this.timeout);
	}
	
	if (!this.instantwrite) {
		this.timeout = setTimeout(function() {
			if (this.changed) {
				this.flush();
			}
		}.bind(this), this.wait);
	} else {
		if (this.changed) {
			this.flush();
		}
	}
};


FactoidServer.prototype.flush = function() {
	Utils.puts("Writing updated factoid data to disk...");
	try {
		var write = JSON.stringify({wait: this.wait, factoids: this.db});
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


FactoidServer.prototype.alias = function(alias, key) {
	this.db[alias] = {alias: key, popularity: 0};
	this.changed = true;
	this.register_activity();
};


FactoidServer.prototype.find = function(key) {
	var thing = this.db[key];
	if (typeof thing === "undefined") return void 0;
	thing.popularity++;
	this.changed = true;
	this.register_activity();
	
	var value = thing.value;
	if (typeof value === "undefined") {
		value = this.db[thing.alias] ? this.db[thing.alias].value : void 0;
	}
	return value;
};


FactoidServer.prototype.search = function(pattern, num) {
	if (typeof num !== "number") num = 5;
	var found = [], cat, db = this.db;
	
	for (var i in db) {
		if (typeof db[i].value === "undefined") break;
		
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
