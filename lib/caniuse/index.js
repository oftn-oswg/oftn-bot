// caniuse.com functionality for oftn-bot
// by ImBcmDth - jon.carlos.rivera@gmail.com
//
// Thanks to FireFly, sorella, gkatsev, Morthchek,
// and eboy for your testing and suggestions.
//
// All data provided by the good folks at <http://caniuse.com/>

var Utils = require("util");
var File = require("fs");
var Path = require('path');
var HTTPS = require('https');

var agentsToShow = {
	'ie': 'IE',
	'firefox': 'FF',
	'chrome': 'Chrome',
	'opera': 'Opera',
	'safari': 'Safari',
	'ios_saf': 'iOS',
	'android': 'Android'
};

var agentSupportToColors = {
	'n': '\x034',
	'y': '\x033',
	'p': '\x038',
	'a': '\x038',
	'u': '\x03E',
	'x': '\x03E'
};

// attempt reload the data every 24 hours
var reloadInterval = 24 * 60 * 60 * 1000;
var moduleName = 'CanIUse';

var CanIUseServer = module.exports = function(filename) {
	this.dataSource = {
		hostname: 'raw.github.com',
		port: 443,
		path: '/Fyrd/caniuse/master/data.json',
		method: 'GET'
	};
	this.loaded = false;
	this.attemptsLeft = 5;

	if (filename) {
		this.filename = filename;
		this.readJSON();
	} else {
		this.fetchJSON();
	}
};

CanIUseServer.prototype.readJSON = function() {
	File.readFile(this.filename, function (err, data) {
		if (err) {
			throw new Error("CanIUse: Error reading file - " + this.filename);
		}
		try {
			this.parseJSON(data, this.filename);
			setTimeout(this.readJSON.bind(this), reloadInterval);
		} catch (e) {
			if (this.attemptsLeft--) {
				consolePuts("Will attempt to read the file again... (" + (5 - this.attemptsLeft) + "/5)");
				setTimeout(this.readJSON.bind(this), 1000);
			} else {
				consolePuts("Out of read retry attempts!");
				setTimeout(this.readJSON.bind(this), reloadInterval);
			}
		}
	}.bind(this));
};

CanIUseServer.prototype.fetchJSON = function() {
	var json = '';

	var req = HTTPS.request(this.dataSource, function(res) {
		res.on('data', function(data) {
			json += data;
		}.bind(this));

		res.on('end', function() {
			try {
				this.parseJSON(json, this.dataSource.hostname + this.dataSource.path);
				setTimeout(this.fetchJSON.bind(this), reloadInterval);
			} catch (e) {
				if (this.attemptsLeft--) {
					consolePuts("Will attempt to fetch the file again in 10 seconds... (" + (5 - this.attemptsLeft) + "/5)");
					setTimeout(this.fetchJSON.bind(this), 10000);
				} else {
					consolePuts("Out of fetch retry attempts!");
					setTimeout(this.fetchJSON.bind(this), reloadInterval);
				}
			}
		}.bind(this));
	}.bind(this));

	req.end();
};

CanIUseServer.prototype.parseJSON = function(json, source) {
	try {
		var data = JSON.parse(json);
		consolePuts("Loaded JSON - " + source);
		this.loaded = true;
		this.attemptsLeft = 5;
		this.db = data;
		this.buildIndex();
	} catch (e) {
		consolePuts("JSON Parse Error - " + e);
		throw e;
	}
};

CanIUseServer.prototype.buildIndex = function() {
	var db = this.db.data;

	this.keys = Object.keys(db)
	this.index = this.keys.map(concatTitleKeywords);

	function concatTitleKeywords(key) {
		return db[key].title.toLowerCase() + ',' + db[key].keywords.toLowerCase();
	}
};

CanIUseServer.prototype.search = function(key) {
	key = key.toLowerCase();

	if (!this.loaded) {
		return;
	}

	try {
		return this.find(key);
	} catch(e) {
		var i = this.index.length;

		while (i--) {
			if (this.index[i].indexOf(key) > -1) {
				return this.find(this.keys[i]);
			}
		}

		throw e;
	}
};

CanIUseServer.prototype.find = function(key) {
	var db = this.db.data;

	if (typeof db[key] === "undefined") {
		throw new Error("Can I Use `"+key+"` was not found.");
	}

	var feature = db[key];
	var agentSupportInfo = this.getAgentSupportArray(feature);
	var agentSupportStrings = this.formatAgentSupportArray(agentSupportInfo.supported);
	var supportedString = agentSupportStrings.join(' | ');
	var unsupportedString = agentSupportInfo.unsupported.join(', ');
	var overallPercent = (feature.usage_perc_y + feature.usage_perc_a);

	return formatResponse(feature.title, supportedString, unsupportedString, overallPercent, key);
};

CanIUseServer.prototype.getAgentSupportArray = function(feature) {
	var data = this.db;
	var agents = data.agents;

	var agentSupportObject = {supported:[], unsupported:[]};

	Object.keys(agentsToShow).forEach(getMinimalAgentSupport);

	return agentSupportObject;

	function getMinimalAgentSupport(agent) {
		var agentName = agentsToShow[agent];
		var agentSupport;

		var supportedVersions = agents[agent].versions.filter(onlyTotallySupported);

		if (supportedVersions.length === 0) {
			supportedVersions = agents[agent].versions.filter(onlySomewhatSupported);
		}

		if (supportedVersions.length !== 0) {
			agentSupport = feature.stats[agent][supportedVersions[0]];

			agentSupportObject.supported.push({
				name: agentName,
				version: supportedVersions[0] + '+',
				support: agentSupport
			});
		} else {
			agentSupportObject.unsupported.push(agentName);
		}

		function onlyTotallySupported(version) {
			return (version != null && !/[n|u|p|a|x]/g.test(feature.stats[agent][version]));
		}

		function onlySomewhatSupported(version) {
			return (version != null && !/[n|u]/g.test(feature.stats[agent][version]));
		}
	}
};

CanIUseServer.prototype.formatAgentSupportArray = function(agentSupport) {
	return agentSupport.map(makeAgentSupportStrings, this.db.agents)

	function makeAgentSupportStrings(agentInfo) {
		var concatedName = agentInfo.name + " " + agentInfo.version;
		var supportFlags = agentInfo.support.split(' ');
		var agentColor = agentSupportToColors[supportFlags[0]];

		if (supportFlags.indexOf('p') > -1) {
			agentInfo.version += ' (w/polyfill)';
		}
		else if (supportFlags.indexOf('x') > -1) {
			agentInfo.version += ' (w/prefix)';
		}

		return agentInfo.name + agentColor + ' ' + agentInfo.version + '\x0F';
	}
};

function formatResponse(title, supportedList, unsupportedList, overallPercent, keyword) {
	var response = "Can I Use \x02" + title + "\x0F?";
	response += " [" + supportedList + "]";
	if (unsupportedList) {
		response += " (Unsupported: " + unsupportedList + ")";
	}
	response += " \x02Overall:\x0F " + overallPercent.toFixed(1) + "%";
	response += ' \x032<http://caniuse.com/' + keyword + '>\x0F';

	return response;
}

function consolePuts(output) {
	Utils.puts(moduleName + ': ' + output);
}