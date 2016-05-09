var google = require('google');

// calls callback with {title: string, url: string}
var FeelingLucky = module.exports = function(query, callback) {
	google(query, function(error, results) {
		if (error) {
			console.error('FeelingLucky ', error);
			return callback(null);
		}

		var result = results.links[0];
		if (!result) {
			return callback(null);
		}

		callback({title: result.title, url: result.link})
	});
};
