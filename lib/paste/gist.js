var bhttp = require('bhttp');
var util = require('util');
var assign = require('object.assign');

function log() {
	console.error(util.format.apply(this, arguments));
}

/* createGist('some content', {
	 filename: 'my name', description: 'something'
	 })
	 .then((url) => ...)
	 */
exports.createGist = function createSingleFileGist(text, _opts) {
	var opts = assign({
		filename: "misc.txt",
		description: "unknown description"
	}, _opts);

	var body = {
		description: opts.description,
		files: {}
	};

	body.files[opts.filename] = {content: text};

	log('Creating gist. filename: %j, length: %d', opts.filename, text.length);

	return bhttp.post('https://api.github.com/gists', body, {
			encodeJSON: true,
			decodeJSON: true
			})
	.catch(function(e) {
		log('Failed to create gist: %j', e);
		throw e;
	})
	.then(function(res){
		var url = res.body.html_url;
		log('Created gist %j', url);

		if (!url) {
			var error = new Error('failed to create gist');
			log('%s', error + "");
			error.res = res;
			throw error;
		}

		return exports.shorten(url).catch(function(err){
			// fall back to returning the original url
			return url;
		});
	});
}

exports.shorten = function shortenWithGitIo(url) {
	return bhttp.post('https://git.io/', {url: url})
		.then(function(res) {
			var location = res.headers.location;
			if (!location) {
				log('Failed to shorten link: %d', res.statusCode);
				log('  body: %j', res.body || null);
				log('  headers: %j', res.headers);
				throw new Error('No location found');
			}

			return location;
		});
}

