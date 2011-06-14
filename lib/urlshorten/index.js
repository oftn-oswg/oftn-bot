var http = require("https");

var GooGl = {
	shorten: function (url, callback) {
		GooGl.request ("/urlshortener/v1/url", JSON.stringify ({longUrl: url}), function(data) {
			try {
				callback (JSON.parse (data).id);
			} catch (e) {
				console.log (e.name + ": "+ e.message);
				callback (url);
			}
		});
	},
	request: function(path, data, callback) {
		var self = this;
		var buffer = data !== false ? new Buffer(data, "utf8") : false;
		var opts = {
			host: "www.googleapis.com",
			port: 443,
			path: path,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": buffer ? buffer.length : 0
			}
		};
		var req = http.request (opts, function(response) {
			response.setEncoding('utf8');
			var body = [];
			response.on("data", function(chunk) {
				body.push (chunk+"");
			});
			response.on("end", function() {
				if (callback) {
					callback.call(self, body.join(""));
				}
			});
		});
		req.end.apply (req, data ? [buffer] : []);
	}
};


module.exports = {
	GooGl: GooGl
};

GooGl.shorten ("http://www.google.com/", function(shortened) {
	console.log (shortened);
});
