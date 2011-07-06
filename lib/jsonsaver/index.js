var Utils = require("util");
var File = require("fs");
var Path = require("path");

var JSONSaver = module.exports = function(file) {
	this.object = {};
	
	this.wait = 8 * 1000; // wait after 8 seconds of inactivity before writing to disk
	this.file = file;
	this.timeout = null;
	this.instantwrite = false;
	this.loaded = false;
	
	File.readFile(this.file, function (err, data) {
		try {
			if (err) {
				throw err;
			}
			Utils.puts("Loaded file: "+Path.basename(this.file));
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
	var self = this;
	try {
		var write = JSON.stringify(this.object, null, "\t");
		File.writeFile(this.file, write, function (err) {
			if (err) throw err;
			Utils.puts("Wrote file: " + Path.basename(self.file));
		});
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
