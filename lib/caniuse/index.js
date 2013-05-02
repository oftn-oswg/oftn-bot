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

var CanIUseServer = module.exports = function(filename) {
	if (filename) {
		this.filename = filename;
	} else {
		this.filename = Path.join(__dirname, "data/data.json");
	}

	File.readFile(this.filename, function (err, data) {
		try {
			if (err) {
				throw err;
			}
			Utils.puts("Loaded file: "+Path.basename(this.filename));
			var data = JSON.parse(data);
			this.db = data;

			this.buildIndex();
		} catch (e) {
			Utils.puts("JSON Parse Error: "+e);
		}
	}.bind(this));
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

	try {
		return this.find(key);
	} catch(e) {
		var i = this.index.length;

		while (i--) {
			if (this.index[i].search(key) > -1) {
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