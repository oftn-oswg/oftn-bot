var Utils = require("util");
var File = require("fs");
var JSONSaver = require("../jsonsaver");

var FactoidServer = module.exports = function(filename, http) {
	this.filename = filename;
	this.changed = false;
	this.loaded = false;
	this.db = new JSONSaver(filename);

	//this.http = typeof http === "undefined" ? true : !!http;
};


FactoidServer.prototype.learn = function(key, value) {

	var db = this.db.object.factoids;

	var popularity = 0;
	key = key.toLowerCase();

	if (typeof db[key] !== "undefined") {
		if (typeof db[key].alias !== "undefined") {
			return this.learn(db[key].alias, value);
		}
		popularity = db[key].popularity;
	}
	
	db[key] = {value: value, popularity: popularity};
	this.db.activity();
};


FactoidServer.prototype.alias = function(alias, key) {
	key = key.toLowerCase();
	alias = alias.toLowerCase();
	
	var db = this.db.object.factoids;
	
	if (typeof db[key] === "undefined") throw new Error("Factoid `"+key+"` doesn't exist.");
	
	if (typeof db[key].alias !== "undefined") {
		return alias(alias, db[key].alias);
	}
	
	if (alias === key) throw new Error("Cannot alias yourself.");
	
	db[alias] = {alias: key};
	this.db.activity();
	return key;
};


FactoidServer.prototype.find = function(key, incpop) {
	key = key.toLowerCase();
	var db = this.db.object.factoids;
	
	if (typeof db[key] === "undefined") {
		throw new Error("Factoid `"+key+"` was not found.");
	}
	
	if (typeof db[key].alias !== "undefined") {
		return this.find(db[key].alias);
	}
	
	var thing = db[key];
	if (incpop) thing.popularity++;
	this.db.activity();
	
	return thing.value;
};


FactoidServer.prototype.search = function(pattern, num) {
	if (typeof num !== "number") num = 5;
	var found = [], cat, db = this.db.object.factoids;
	
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
	key = key.toLowerCase();
	var db = this.db.object.factoids;
	
	if (typeof db[key] === "undefined") {
		throw new Error("`"+key+"` was not a factoid.");
	}
	delete db[key];
	this.db.activity();
	return true;
};


FactoidServer.prototype.clean = function() {
	var db = this.db.object.factoids;
	for (var i in db) {
		if (typeof db[i].alias !== "undefined") {
			for (var j in db[i]) {
				if (j !== "alias") delete db[i][j];
			}
			continue;
		}
		if (typeof db[i].value !== "undefined") {
			for (var j in db[i]) {
				if (j !== "value" && j !== "popularity") delete db[i][j];
			}
			continue;
		}
		delete db[i];
	};
	this.db.activity();
};
