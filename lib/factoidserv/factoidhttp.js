var HTTP = require("http");
var Utils = require("util");
var Static = require('node-static');
var URL = require('url');

var FactoidHTTP = module.exports = function(obj) {
	this.dbserv = obj;
	this.port = 3000;

	this.staticfiles = new Static.Server('../../factoids/', {cache: 24 * 3600});
	HTTP.createServer(this.request.bind(this)).listen(this.port);
	

	Utils.puts("Server running at http://localhost:"+this.port+"/");
};

FactoidHTTP.prototype.request = function (request, response) {
	var parsed = URL.parse(request.url, true);
	if (parsed.pathname === "/") {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end("Under construction.\n");
	} else {
		this.staticfiles.serve(request, response);
	}
};

new FactoidHTTP({});
