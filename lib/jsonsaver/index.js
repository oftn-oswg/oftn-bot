var Utils = require("util");
var File = require("fs");

var JSONSaver = module.exports = function(file) {
	this.object = {};
	
	this.wait = 30 * 1000; // wait after 30 seconds of inactivity before writing to disk
	this.file = file;
	this.timeout = null;
	this.instantwrite = false;
	this.loaded = false;
	
	File.readFile(this.file, function (err, data) {
		try {
			if (err) {
				throw err;
			}
			Utils.puts("Loaded JSONSaver file... "+this.file);
			var data = JSON.parse(data);
			if (Object.keys(this.object)) {
				for (var i in this.object) {
					if (this.object.hasOwnProperty(i)) {
						data[i] = this.object[i];
					}
				}
			}
			this.object = data;
			this.loaded = true;
		} catch (e) {
			Utils.puts("JSON Parse Error: "+e);
		}
	}.bind(this));
	
	process.on("exit", function() {
		if (this.changed) {
			this.flush();
		}
	}.bind(this));
};

JSONSaver.prototype.activity = function() {
	this.changed = true;
	
	if (this.timeout !== null) {
		clearTimeout(this.timeout);
	}
	
	if (!this.instantwrite) {
		this.timeout = setTimeout(function() {
			if (this.changed) {
				this.flush();
			}
		}.bind(this), this.wait);
	} else {
		if (this.changed) {
			this.flush();
		}
	}
};

JSONSaver.prototype.flush = function() {
	Utils.puts("Writing JSON data to disk...");
	try {
		var write = JSON.stringify(this.object);
		File.writeFileSync(this.file, write);
		this.changed = false;
		return true;
	} catch (e) {
		Utils.puts("Cannot stringify data: "+e.name+": "+e.message);
		return false;
	}
};

JSONSaver.prototype.clean = function() {
	this.object = {};
	this.activity();
};
