var Path = require("path");
var Spawn = require("child_process").spawn;

var Sandbox = module.exports = function(utils) {
	this.utils = utils;
};

Sandbox.V8 = 1;
Sandbox.SpiderMonkey = 2;
Sandbox.Haskell = 3;

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
		child = Spawn("node", ["--harmony_collections", Path.join(__dirname, "v8", "shovel.js"), this.utils]);
		break;
	case Sandbox.Haskell:
		return this.runHaskell(timeout, code, hollaback, object);
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

Sandbox.prototype.runHaskell = function (timeout, code, hollaback, object) {
	var stdout = ""
	  , env = Object.create (process.env, {LANG: {value: "en_US.UTF-8", enumerable: true, writable: true, configurable: true}})
	  , child = Spawn ("mueval",
	                   ["--inferred-type", "--time-limit=" + Math.round(timeout / 1000)
	                   ,"--no-imports", "--load-file=" + Path.join (__dirname, "hs", "Environment.hs")
										 ,"--Extensions", "-e", code], {env: env});

	child.stdout.on ("data", function (data) { if (data) stdout += data });
	child.stderr.on ("data", function (data) { if (data) stdout += data }); // 2>&1

	child.on ("exit", function (code, signal) {
		var lines = stdout.replace (/^\s+|\s+$/g, "").split ("\n");

		if (code === 0) {
			hollaback.call (object, { data:   { type:        lines.splice (1, lines.length - 2).join (" ")
			                                  , console:     []
			                                  , obvioustype: false }
			                        , error:  null
		                          , result: lines[1] });
		} else {
			if (lines.length > 1) {
				hollaback.call (object, { data:   { type:        lines[1]
				                                  , console:     []
				                                  , obvioustype: false }
				                        , error:  lines.splice (2, lines.length - 2).join (" ")
				                        , result: null });
			} else {
				hollaback.call (object, { data:   { type:        null
				                                  , console:     []
				                                  , obvioustype: true }
			                          , error:  lines.join (" ")
				                        , result: null });
			}
		}
	});

	child.stdin.end();
};
