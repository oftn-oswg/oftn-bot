var Path = require("path");
var Spawn = require("child_process").spawn;

var Sandbox = module.exports = function(options) {};

var SandboxError = function(name, message) {
	return {
		data: {
			type: null,
			console: [],
			obvioustype: true
		},
		error: name+": "+message,
		result: null
	};
};

var TimeoutError = function(timeout) {
	return SandboxError("Timeout Error", "Execution time exceeded "+
					(timeout/1000)+" second"+
					((timeout == 1000) ? "" : "s"));
};

var UnknownError = function(s) {
	return SandboxError("Unknown Error",
		"Please contact eboyjr. INFO: "+s.replace(/\s+/g, " "));
};

Sandbox.prototype.run = function(engine, timeout, code, hollaback, object) {
	var process, args;

	switch (engine) {
	case "js":
		process = "/var/www/node/vbotjr/lib/sandbox/js/shovel";
		args = [Path.join(__dirname, "utils.js")];
		break;
	case "v8":
	default:
		process = "node";
		args = [Path.join(__dirname, "v8", "shovel.js")];
	}

	// Any vars in da house?
	var timer;
	var stdout = [];
	var child = Spawn(process, args);
	var output = function(data) {
		if (data) {
			stdout.push(data);
		}
	};

	// Listen
	child.stderr.on("data", output);
	child.stdout.on("data", output);
	child.on("exit", function(code, signal) {
		clearTimeout(timer);
		
		if (code === null) {
			hollaback.call(object, UnknownError("("+signal.toLowerCase()+")"));
			return;
		}
		
		try {
			hollaback.call(object, JSON.parse(stdout.join("")));
		} catch (e) {
			hollaback.call(object, UnknownError(stdout.join("")));
		}
	});

	// Fo shizzle
	child.stdin.write(code);
	child.stdin.end();

	// We gots ta move it, yo!
	timer = setTimeout(function() {
		child.stdout.removeListener("output", output);
		stdout = [JSON.stringify(TimeoutError(timeout))];
		child.kill("SIGKILL");
	}, timeout);
};
