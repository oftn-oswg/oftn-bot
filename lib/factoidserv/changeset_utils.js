var ChangeSetUtils = module.exports = function (db) {
	this.db = db;

	if (typeof this.db.object.delete_log === 'undefined') {
		this.db.object.delete_log = [];
		this.db.activity();
	}
	this.delete_log = this.db.object.delete_log;
};

ChangeSetUtils.prototype = {
	makeChange: function (nick) {
		return {
			'date':  (new Date()).toISOString(),
			'editor': nick
		};
	},
	recordAliasChange: function (factoidName, oldAlias, username) {
		var change = this.makeChange(username);
		var factoid = this.db.object.factoids[factoidName];

		change['old-alias'] = oldAlias;
		change['new-alias'] = factoid.alias;

		factoid.changes.push(change);
		this.db.activity();
	},
	recordForget: function (factoidName, factoidData, username) {
		var change = this.makeChange(username);

		change['key'] = factoidName;
		change['value'] = factoidData;

		this.delete_log.push(change);
		this.db.activity();
	},
	recordFactoidChange: function (factoidName, oldFactoidValue, username, regex) {
		var change = this.makeChange(username);
		var factoid = this.db.object.factoids[factoidName];

		change['old-value'] = oldFactoidValue;
		change['new-value'] = factoid.value;

		if (regex) {
			change['regex'] = regex;
		}

		factoid.changes.push(change);
		this.db.activity();
	}
};