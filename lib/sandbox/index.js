var Path = require("path");
var Spawn = require("child_process").spawn;

var Sandbox = module.exports = function(utils) {
	this.utils = utils;
};

Sandbox.V8 = 1;
Sandbox.SpiderMonkey = 2;

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
	var process, args, child;

	switch (engine) {
	case Sandbox.V8:
		child = Spawn("node", [Path.join(__dirname, "v8", "shovel.js"), this.utils]);
		break;
	default:
	case Sandbox.SpiderMonkey:
		child = Spawn(Path.join(__dirname, "sm", "shovel.bin"),
			[this.utils],
			{env: {LD_LIBRARY_PATH: "/usr/local/lib"}});
		break;
	}

	// Any vars in da house?
	var timer;
	var stdout = [];
	var output = function(data) {
		if (data) {
			stdout.push(data);
		}
	};

	// Listen
	// child.stderr.on("data", output); // We don't need this anymore
	child.stdout.on("data", output);
	child.on("exit", function(code, signal) {
		clearTimeout(timer);
		
		if (code === null && signal !== "SIGKILL") {
			hollaback.call(object, UnknownError("("+signal.toLowerCase()+")"));
			return;
		}
		
		try {
			var data = JSON.parse(stdout.join(""));
			hollaback.call(object, data);
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
