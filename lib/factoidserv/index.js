var Utils = require("util");
var File = require("fs");
var JSONSaver = require("../jsonsaver");
var ChangeSetUtils = require('./changeset_utils');

var FactoidServer = module.exports = function(filename) {
	this.filename = filename;
	this.changed = false;
	this.loaded = false;
	this.db = new JSONSaver(filename, function () {
		this.change_logger = new ChangeSetUtils(this.db);
	}.bind(this));
};

var caseInsensitiveDeDupingInsert = function (array, value) {
	var valueLower = value.toLowerCase();
	var found = array.some(function (item, index) {
		if (valueLower === item.toLowerCase()) {
			array[index] = value;
			return true;
		}
	});
	if (!found) {
		array.push(value);
	}
};

function setFactoidDefaults (factoid, isNew) {
	if (isNew && !factoid.date) factoid.date = (new Date()).toISOString();
	if (!factoid.popularity) factoid.popularity = 0;
	if (!factoid.editors) factoid.editors = [];
	if (!factoid.changes) factoid.changes = [];

	return factoid;
}

FactoidServer.prototype.learn = function(key, value, username, regex) {
	username = username || '';

	var db = this.db.object.factoids;
	key = key.toLowerCase();

	if (typeof db[key] !== "undefined") {
		if (typeof db[key].alias !== "undefined") {
			throw new Error('`' + key + '` is an alias for `' + db[key].alias + '`. No changes applied.');
		}
		var oldValue = db[key].value;

		db[key] = setFactoidDefaults(db[key]);
		db[key].value = value;

		caseInsensitiveDeDupingInsert(db[key].editors, username);

		this.change_logger.recordFactoidChange(key, oldValue, username, regex);
	} else {
		db[key] = setFactoidDefaults({value: value, creator: username}, true);
	}

	this.db.activity();
};

FactoidServer.prototype.alias = function(alias, key, username) {
	username = username || '';
	key = key.toLowerCase();
	alias = alias.toLowerCase();

	var db = this.db.object.factoids;

	if (typeof db[key] === "undefined") throw new Error("Factoid `"+key+"` doesn't exist.");

	if (typeof db[key].alias !== "undefined") {
		return this.alias(alias, db[key].alias);
	}

	if (alias === key) throw new Error("Cannot alias yourself.");

	if (typeof db[alias] !== "undefined") {
		if (typeof db[alias].value !== "undefined") {
			throw new Error('`' + alias + '` is already a factoid. Use !forget to remove it before setting an alias. No changes applied.');
		}
		var oldAlias = db[alias].alias;

		db[alias] = setFactoidDefaults(db[alias]);
		db[alias].alias = key;

		caseInsensitiveDeDupingInsert(db[alias].editors, username);

		this.change_logger.recordAliasChange(alias, oldAlias, username);
	} else {
		db[alias] = setFactoidDefaults({alias: key, creator: username}, true);
	}

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
		if (incpop) {
			db[key].popularity = db[key].popularity || 0;
			db[key].popularity++;
			this.db.activity();
		}
		return this.find(db[key].alias, incpop);
	}

	var thing = db[key];
	if (incpop) {
		thing.popularity = thing.popularity || 0;
		thing.popularity++;
		this.db.activity();
	}

	return thing.value;
};


FactoidServer.prototype.search = function(pattern, num) {
	if (typeof num !== "number") num = 5;
	var found = [], cat, db = this.db.object.factoids;
	pattern = pattern.toLowerCase();

	for (var i in db) {
		if (db.hasOwnProperty(i)) {
			if (typeof db[i].value === "undefined") continue;
		
			cat = (i+" "+db[i].value).toLowerCase();
			if (~cat.indexOf(pattern)) {
				found.push(i);
			}
		}
	}

	found.sort(function(a, b) { return db[b].popularity - db[a].popularity; });
	return found.slice(0, num);
};


FactoidServer.prototype.forget = function(key, username) {
	key = key.toLowerCase();
	var db = this.db.object.factoids;

	if (typeof db[key] === "undefined") {
		throw new Error("`"+key+"` was not a factoid.");
	}

	this.change_logger.recordForget(key, db[key], username);
	delete db[key];
	this.db.activity();

	return true;
};


FactoidServer.prototype.clean = function() {
	var db = this.db.object.factoids, j, i;
	for (i in db) {
		if (db.hasOwnProperty(i)) {
			if (typeof db[i].alias !== "undefined") {
				for (j in db[i]) {
					if (db[i].hasOwnProperty(j)) {
						if (j !== "alias") delete db[i][j];
					}
				}
				continue;
			}
			if (typeof db[i].value !== "undefined") {
				for (j in db[i]) {
					if (db[i].hasOwnProperty(j)) {
						if (j !== "value" && j !== "popularity") delete db[i][j];
						if (j !== "value") delete db[i][j];
					}
				}
				continue;
			}
			delete db[i];
		}
	}
	this.db.activity();
};
