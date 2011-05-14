var Utils = require("util");
var File = require("fs");

var JSONSaver = exports.JSONSaver = function(file) {
	this.__object = {};
	Object.defineProperty(this, 'object', {
		get: function() {
			this.register_activity();
			return this.__object;
		},
		enumerable: true,
		configurable: true
	});
	//this.object = this.__object;
	this.wait = 1 * 60 * 1000; // wait after 1 minute of inactivity before writing to disk
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
			if (Object.keys(this.__object)) {
				for (var i in this.__object) {
					if (this.__object.hasOwnProperty(i)) {
						data[i] = this.__object[i];
					}
				}
			}
			this.__object = data;
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

JSONSaver.prototype.register_activity = function() {
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
		var write = JSON.stringify(this.__object);
		File.writeFileSync(this.file, write);
		this.changed = false;
		return true;
	} catch (e) {
		Utils.puts("Cannot stringify data: "+e.name+": "+e.message);
		return false;
	}
};

JSONSaver.prototype.clean = function() {
	this.__object = {};
	this.register_activity();
};
