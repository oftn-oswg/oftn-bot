var Util = require("util");
var Script = process.binding("evals").Script;
var SandboxUtils = require("../utils");

var Run = function(code) {
	var result = SandboxUtils.run(function(sandbox) {
		return Script.runInNewContext(code, sandbox);
	});
	process.stdout.write(result+"\n");
	process.exit();
};

// Get code
var input = [];
var stdin = process.openStdin();
stdin.on("data", function(data) { input.push(data); });
stdin.on("end", function() { Run(input.join("")); });
