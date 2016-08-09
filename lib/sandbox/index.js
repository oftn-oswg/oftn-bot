var Path = require("path");
var Spawn = require("child_process").spawn;

var Sandbox = module.exports = function (utils) {
	this.utils = utils;
};

Sandbox.V8 = 1;
Sandbox.SpiderMonkey = 2;
Sandbox.Haskell = 3;
Sandbox.Node = 4;
Sandbox.Babel = 5;

var SandboxError = function (name, message) {
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

var TimeoutError = function (timeout) {
	return SandboxError("Timeout Error", "Execution time exceeded "+
					(timeout/1000)+" second"+
					((timeout == 1000) ? "" : "s"));
};

var UnknownError = function (s) {
	return SandboxError("Unknown Error",
		"Please contact dsamarin.");
};

Sandbox.prototype.run = function (engine, timeout, code, hollaback, object) {
	var process, args, child;

	switch (engine) {
	case Sandbox.Haskell:
		return this.runHaskell(timeout, code, hollaback, object);
	default:
	case Sandbox.V8:
	case Sandbox.SpiderMonkey:
		child = Spawn(Path.join(__dirname, engine==Sandbox.V8?"v8":"sm", "shovel.bin"),
			[this.utils],
			{env: {LD_LIBRARY_PATH: "/usr/local/lib"}});
		break;
	case Sandbox.Node:
		return this.runInJsEval('node', timeout, code, hollaback, object);
	case Sandbox.Babel:
		return this.runInJsEval('babel', timeout, code, hollaback, object);
	}

	// Any vars in da house?
	var timer;
	var stdout = [];
	var output = function (data) {
		if (data) {
			stdout.push(data);
		}
	};

	// Listen
	// child.stderr.on("data", output); // We don't need this anymore
	child.stdout.on("data", output);
	child.on("exit", function (code, signal) {
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
	timer = setTimeout(function () {
		child.stdout.removeListener("output", output);
		stdout = [JSON.stringify(TimeoutError(timeout))];
		child.kill("SIGKILL");
	}, timeout);
};

Sandbox.prototype.runHaskell = function (timeout, code, hollaback, object) {
	var stdout = "";
	var env = Object.create(process.env, {LANG: {value: "en_US.UTF-8", enumerable: true, writable: true, configurable: true}});
	var child = Spawn("mueval",
				["--inferred-type", "--time-limit=" + Math.round(timeout / 1000)
				 ,"--no-imports", "--load-file=" + Path.join(__dirname, "hs", "Environment.hs")
				 ,"--Extensions", "-e", code], {env: env});

	child.stdout.on("data", function (data) { if (data) stdout += data });
	child.stderr.on("data", function (data) { if (data) stdout += data }); // 2>&1

	child.on("exit", function (code, signal) {
		var lines = stdout.replace(/^\s+|\s+$/g, "").split("\n");

		if (code === 0) {
			hollaback.call(object, {
				data: {
					type: lines.splice(1, lines.length - 2).join(' '),
					console: [],
					obvioustype: false
				},
				error: null,
				result: lines[1]
			});
		} else {
			if (lines.length > 1) {
				hollaback.call(object, {
					data: {
						type: lines[1],
						console: [],
						obvioustype: false
					},
					error: lines.splice(2, lines.length - 2).join(' '),
					result: null
				});
			} else {
				hollaback.call(object, {
					data: {
						type: null,
						console: [],
						obvioustype: true
					},
					error: lines.join(" "),
					result: null
				});
			}
		}
	});

	child.stdin.end();
};

Sandbox.prototype.runInJsEval = function (engine, timeout, code, hollaback, object) {
    // wrap code in an iife to get a sensible completion record
    // otherwise we get e.g. 'use strict' when undefined is expected
    code = '(function () { ' + code + ' }.call(global))';

	var stdout = "";
	var childId = 'oftn_sandbox_' + Math.floor(0x10000000+Math.random()*0xefffffff).toString(32);
	var child = Spawn(
		'docker',
		["run", "-i", "--rm", "--net=none", "-m=64m", "-c=128", "--name=" + childId, "brigand/js-eval"],
		{ env: process.env }
	);
	var timeoutId = setTimeout(function () {
  		console.error("Timeout on docker container running this code: ", code);

  		Spawn("docker", ["kill", childId], { env: process.env });
	}, timeout);

	child.stdout.on("data", function (data) { if (data) stdout += data });
	child.stderr.pipe(process.stderr);

	child.on("exit", function (code, signal) {
		clearTimeout(timeoutId);

		if (code === 137) {
			return hollaback.call(object, {
				isJSEval: true,
				reason: 'timeout, took over ' + timeout + 'ms'
			});
		} else if (code !== 0) {
			console.error('Unknown js-eval error', code);
			console.error(stdout);
			return hollaback.call(object, {
				isJSEval: true,
				reason: 'unknown error'
			});
		}

		var parsed = JSON.parse(stdout);

		hollaback.call(object, {
			isJSEval: true,
			success: parsed.success,
			text: parsed.text
		});
	});

	child.stdin.write(JSON.stringify({
		engine: engine,
		code: code
	}));

	child.stdin.end();
}
