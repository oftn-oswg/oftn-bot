var Utils = require("util");
var File = require("fs");
var FactoidHTTP = require('./factoidhttp').FactoidHTTP;

var FactoidServer = exports.FactoidServer = function(filename) {
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
			this.db = JSON.parse(data).factoids;
			this.loaded = true;
			this.server = new FactoidHTTP(this);
		} catch (e) {
			Utils.puts("Factoid DB Parse Error: "+e.name+": "+e.message);
		}
	}.bind(this));
	
	process.on("exit", function() {
		if (this.changed) {
			this.flush();
		}
	}.bind(this));
};


FactoidServer.prototype.register_activity = function() {
	this.changed = true;
	
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
		return true;
	} catch (e) {
		Utils.puts("Cannot stringify db: "+e.name+": "+e.message);
		return false;
	}
};


FactoidServer.prototype.learn = function(key, value) {

	var popularity = 0;

	if (typeof this.db[key] !== "undefined") {
		if (typeof this.db[key].alias !== "undefined") {
			return this.learn(this.db[key].alias, value);
		}
		popularity = this.db[key].popularity;
	}
	
	this.db[key] = {value: value, popularity: popularity};
	this.register_activity();
};


FactoidServer.prototype.alias = function(alias, key) {
	if (typeof this.db[key] === "undefined") throw new Error("Factoid `"+key+"` doesn't exist.");
	
	if (typeof this.db[key].alias !== "undefined") {
		return this.alias(alias, this.db[key].alias);
	}
	
	if (alias === key) throw new Error("Cannot alias yourself.");
	
	this.db[alias] = {alias: key};
	this.register_activity();
	return key;
};


FactoidServer.prototype.find = function(key, incpop) {
	if (typeof this.db[key] === "undefined") {
		throw new Error("Factoid `"+key+"` was not found.");
	}
	
	if (typeof this.db[key].alias !== "undefined") {
		return this.find(this.db[key].alias);
	}
	
	var thing = this.db[key];
	if (incpop) thing.popularity++;
	this.register_activity();
	
	return thing.value;
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
		throw new Error("`"+key+"` was not a factoid.");
	}
	delete this.db[key];
	this.register_activity();
	return true;
};


FactoidServer.prototype.clean = function() {
	for (var i in this.db) {
		if (typeof this.db[i].alias !== "undefined") {
			for (var j in this.db[i]) {
				if (j !== "alias") delete this.db[i][j];
			}
			continue;
		}
		if (typeof this.db[i].value !== "undefined") {
			for (var j in this.db[i]) {
				if (j !== "value" && j !== "popularity") delete this.db[i][j];
			}
			continue;
		}
		delete this.db[i];
	};
	this.register_activity();
};
