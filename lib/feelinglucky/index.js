var HTTP = require("http");

var FeelingLucky = module.exports = function(query, callback) {
	var self = this;
	
	var google = HTTP.createClient(80, 'ajax.googleapis.com');
	var search_url = "/ajax/services/search/web?v=1.0&q=" + encodeURIComponent(query);
	var request = google.request('GET', search_url, {
		'host': 'ajax.googleapis.com',
		'Referer': 'http://www.v8bot.com',
		'User-Agent': 'NodeJS HTTP client',
		'Accept': '*/*'});
	request.addListener('response', function(response) {
		response.setEncoding('utf8');
		var body = "";
		response.addListener('data', function(chunk) { body += chunk; });
		response.addListener('end', function() {
			var searchResults = JSON.parse(body);
			var results = searchResults.responseData.results;

			if (results && results[0]) {
				results[0].url = decodeURIComponent(results[0].url);
				callback.call(self,
					{
						title: results[0].titleNoFormatting.replace(/&#(\d+);/g,
							function(a, b){return String.fromCharCode(b);}),
						url: results[0].url
					});
			} else {
				callback.call(self, null);
			}
		});
	});
	request.end();
};
