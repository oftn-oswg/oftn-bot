// !caniuse command for ##javascript
// By ImBcmDth - jon.carlos.rivera@gmail.com
// Special thanks to FireFly for testing and suggestions.
// All data provided by caniuse.com

var Utils = require("util");
var File = require("fs");
var Path = require('path');
var JSONSaver = require("../jsonsaver");
var FeelingLucky = require("../feelinglucky");

// TODO:
// 1) Show minimal supported version or No
// 2) Show link to caniuse.com
// 3) 

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
	if(filename) {
		this.filename = filename;
	} else {
		this.filename = Path.join(__dirname, "data/data.json");
	}
	this.db = new JSONSaver(this.filename);
	this.currentVersionIndex = 22;
};

CanIUseServer.prototype.find = function(key, callback) {
	key = key.toLowerCase();
	var db = this.db.object.data;

	if (typeof db[key] === "undefined") {
		return callback(true, "Can I Use `"+key+"` was not found.");
	}
	var thing = db[key];
	var agentSupportInfo = this.getAgentSupportArray(thing);
	var agentSupportStrings = this.formatAgentSupportArray(agentSupportInfo.supported);
	var supportedTable = agentSupportStrings.join(' | ');
	var unsupportedTable = agentSupportInfo.unsupported.join(', ');
	var overallPercent = (thing.usage_perc_y + thing.usage_perc_a);

	this.getCanIUseLink(key, function(data) {
		var response = formatResponse(thing.title, supportedTable, unsupportedTable, overallPercent, data.url);
		return callback(null, response);
	});
};

CanIUseServer.prototype.formatAgentSupportArray = function(agentSupport) {
	return agentSupport.map(makeAgentSupportStrings, this.db.object.agents)

	function makeAgentSupportStrings(agentInfo) {
		var concatedName = agentInfo.name + " " + agentInfo.version;
		var supportFlags = agentInfo.support.split(' ');
		var agentColor = agentSupportToColors[supportFlags[0]];

		if(supportFlags.indexOf('p') > -1) {
			agentInfo.version += ' (w/polyfill)';
		}
		else if(supportFlags.indexOf('x') > -1) {
			agentInfo.version += ' (w/prefix)';
		}

		return agentInfo.name + agentColor + ' ' + agentInfo.version + '\x0F';
	}
}

CanIUseServer.prototype.getAgentSupportArray = function(feature) {
	var data = this.db.object;
	var currentIndex = this.currentVersionIndex;
	var agents = data.agents;

	var agentSupportObject = {supported:[], unsupported:[]};

	Object.keys(agentsToShow).forEach(getMinimalAgentSupport);

	return agentSupportObject;

	function getMinimalAgentSupport(agent) {
		var agentName = agentsToShow[agent];
		var agentSupport;

		var supportedVersions = agents[agent].versions.filter(onlyTotallySupported);

		if(supportedVersions.length === 0) {
			supportedVersions = agents[agent].versions.filter(onlySomewhatSupported);
		}

		if(supportedVersions.length !== 0) {
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
			return (version != null && !/[n|u|y]/g.test(feature.stats[agent][version]));
		}
	}
}

CanIUseServer.prototype.getCanIUseLink = function(text, callback) {
	FeelingLucky(text + " site:caniuse.com", callback);
}

function formatResponse(title, supportedTable, unsupportedTable, overallPercent, uri) {
	var response = "CanIUse \x02" + title + "\x0F?";
	response += " [" + supportedTable + "]";
	if(unsupportedTable) {
		response += " (unsupported: " + unsupportedTable + ")";
	}
	response += " \x02Overall:\x0F " + overallPercent.toFixed(1) + "%";

	if(uri) {
		response += ' \x032<' + uri + '>\x0F';
	}

	return response;
}