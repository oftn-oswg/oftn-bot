var Sol = module.exports = function Sol(arg, absolute) {
	var num;
	if (arguments.length === 0) {
		num = (new Date().getTime() / 86400000);
	} else if (Object.prototype.toString.call(arg) === "[object Date]") {
		num = (arg.getTime() / 86400000);
	} else if (typeof arg === "number") {
		num = arg;
	} else {
		throw new TypeError("Sol constructor expects Date or number argument");
	}
	this.floating = num;
	this.absolute = typeof absolute != "undefined" ? absolute : true;
};

Sol.prototype.valueOf = function() { return this.floating; };
Sol.prototype.toString = function() {
	if (this.floating === Infinity) { return "∞ſ"; }
	if (this.floating === -Infinity) { return "-∞ſ"; }
	if (isNaN(this.floating)) { return "Invalid Sol"; }
	
	if (this.absolute) {
		var num = this.floating.toFixed(6), m = num.match(/e(\+|-)/);
		if (m) return m[1] === "+" ? "∞ſ" : "-∞ſ";
		
		var sep = num.split(".");
		var sol = sep[0].replace(/(\d)(?=(\d{3})+$)/g, "$1 ")+" ſ "+sep[1].substr(0,3)+" "+sep[1].substr(3,3);
		return sol;
	}

	var keys = [
		["k", 1000000000],
		["", 1000000],
		["m", 1000],
		["µ", 1]
	];
	var builder = [];
	var num = this.floating*1000000;
	for (var i = 0, len = keys.length; i < len; i++) {
		var numspecific = 0;
		if (num >= keys[i][1]) {
			numspecific = num / keys[i][1] | 0;
			num -= numspecific * keys[i][1];
		}
		if (numspecific) {
			builder.push(numspecific + keys[i][0] + "ſ");
		}
	}
	if (!builder.length) builder.push("0ſ");
	return builder.join(" ");
};

Sol.prototype.toStupidString = function() {
	var num = this.floating * 86400000;

	if (this.absolute) {
		var d = new Date();
		d.setTime(num);
		return d.toUTCString();
	}
	
	var keys = [
		["year", 31536000000],
		["month", 2678400000],
		["week", 604800000],
		["day", 86400000],
		["hour", 3600000],
		["minute", 60000],
		["second", 1000],
		["millisecond", 1]
	];

	var builder = [];
	for (var i = 0, len = keys.length; i < len; i++) {
		var numspecific = 0;
		while (num >= keys[i][1]) {
			numspecific++;
			num -= keys[i][1];
		}
		if (numspecific) {
			builder.push(numspecific + " " + keys[i][0] +
				(numspecific === 1?"":"s"));
		}
	}
	if (!builder.length) builder.push("Zero.");
	return builder.join(", ");
};

Sol.parseStupid = function(text, absolute) {
	var t = 0, m;

	if (absolute) {
		return new Sol(new Date(text));
	}

	m = text.match(/([0-9.]+)\s*eternity/);
	if (m) {
		if (m[1] != 0) {
			this.floating = m[1]*Infinity;
			return;
		};
	}
	m = text.match(/([0-9.]+)\s*y/); if (m) { t += m[1]*31536000000; }
	m = text.match(/([0-9.]+)\s*mo/); if (m) { t += m[1]*2678400000; }
	m = text.match(/([0-9.]+)\s*w/); if (m) { t += m[1]*604800000; }
	m = text.match(/([0-9.]+)\s*d/); if (m) { t += m[1]*86400000; }
	m = text.match(/([0-9.]+)\s*h/); if (m) { t += m[1]*3600000; }
	m = text.match(/([0-9.]+)\s*m(?:$|[^os])/); if (m) { t += m[1]*60000; }
	m = text.match(/([0-9.]+)\s*s/); if (m) { t += m[1]*1000; }
	m = text.match(/([0-9.]+)\s*ms/); if (m) { t += m[1]*1; }
	
	return new Sol(t / 86400000, false);
};

Sol.parseSol = function(text, absolute) {

	if (absolute) {
		text = text.replace(/[ſS]/g, '.').replace(/[^\d.]/g, '');
		return new Sol(parseFloat(text));
	}

	var units = {
		kS: 1000000000,
		hS: 100000000,
		daS: 10000000,
		S: 1000000,
		dS: 100000,
		cS: 10000,
		mS: 1000,
		µS: 1
	};
	var t = 0;
	
	text = text.replace(/[ ,ſ]/g, function(ch) {
		return ch === "ſ" ? "S" : "";
	});
	matches = text.match(/([\d.]+)\s*(k|h|da|d|c|m|µ|)\s*S/gi);
	if (matches) {
		for (var i = 0, len = matches.length; i < len; i++) {
			var modifier = matches[i];
			var value = parseInt(modifier, 10);
			var unit = modifier.match(/(k|h|da|d|c|m|µ|)S/)[0];
			t += value * units[unit];
		}
	}
	return new Sol(t/1000000, false);
};

