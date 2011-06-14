var http = require("http");

var Omegle = module.exports = function() {
	this.events = {
		"message": [],
		"connect": [],
		"recaptcha": [],
		"disconnect": [],
		"stranger_connect": [],
		"stranger_disconnect": []
	};
	
	this.id = null;
	
	this.interval = null;
};

Omegle.prototype.request = function(path, data, callback) {
	var self = this;
	var buffer = data !== false ? new Buffer(data, "utf8") : false;
	var opts = {
		host: "cardassia.omegle.com",
		port: 80,
		path: path,
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Content-Length": buffer ? buffer.length : 0
		}
	};
	var req = http.request (opts, function(response) {
		response.setEncoding('utf8');
		// TODO: Should probably concatinate each chunk and wait for response.on("end")
		response.on("data", function(chunk) {
			if (callback) {
				callback.call(self, ""+chunk);
			}
		});
	});
	req.end.apply (req, data ? [buffer] : []);
};

Omegle.prototype.connect = function() {
	console.log("Connecting...");
	
	this.request ("/start?rcs=1&spid=", false, function (data) {
		this.id = JSON.parse(data);
		console.log("ID:", this.id);
		this.emit ("connect");
		this.check_events();
	});
	
	return this;
};

Omegle.prototype.check_events = function() {
	this.request ("/events", "id="+encodeURIComponent(this.id), function (data) {
		this.handle_events (JSON.parse(data));
	});
	
	this.interval = setTimeout (this.check_events.bind(this), 1000);
};

Omegle.prototype.handle_events = function(events) {
	if (events === null) return;
	
	for (var i = 0, len = events.length; i < len; i++) {
		switch (events[i][0]) {
		case "connected":
			this.emit ("stranger_connect");
			break;
		case "strangerDisconnected":
			this.emit ("stranger_disconnect");
			this.disconnect ();
			break;
		case "gotMessage":
			this.emit ("message", events[i][1]);
			break;
		case "stoppedTyping":
		case "typing":
			break;
		case "recaptchaRequired":
			this.emit ("recaptcha");
			break;
		default:
			console.log("Omegle: Unknown event: "+events[i][0]);
		}
	}
};

Omegle.prototype.set_typing = function(istyping) {
	if (this.id) {
		istyping = !!istyping;
		console.log("Set typing:", istyping);
		
		this.request (
			istyping ? "/typing" : "/stoppedtyping",
			"id="+encodeURIComponent(this.id));
			
		return true;
	} else {
		return false;
		throw new Error("Omegle: Cannot set typing; not connected.");
	}
};

Omegle.prototype.send = function(text) {
	if (this.id) {
		console.log("Sending:", text);
		this.request ("/send",
			"id="+encodeURIComponent(this.id)+"&msg="+encodeURIComponent(text));
		return true;
	} else {
		return false;
		throw new Error("Omegle: Cannot send message; not connected.");
	}
};

Omegle.prototype.disconnect = function() {
	if (this.id) {
		this.request ("/disconnect", "id="+encodeURIComponent(this.id));
		clearTimeout (this.interval);
		this.id = null;
		return true;
	} else {
		return false;
		throw new Error("Omegle: Cannot disconnect; not connected.");
	}
};

Omegle.prototype.emit = function(event) {
	if (this.events.hasOwnProperty(event)) {
		var list = this.events[event];
		for (var i = 0, len = list.length; i < len; i++) {
			this.events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
		}
		return true;
	} else {
		return false;
		throw new Error("Omegle: "+event+" is not an event.");
	}
};

Omegle.prototype.on = function(event, callback) {
	if (this.events.hasOwnProperty(event)) {
		this.events[event].push (callback);
		return true;
	} else {
		return false;
		throw new Error("Omegle: "+event+" is not an event.");
	}
};

Omegle.prototype.clear_events = function() {
	for (var event in this.events) {
		if (this.events.hasOwnProperty(event)) {
			this.events[event] = [];
		}
	}
};

/*

var o = new Omegle().connect();


var UpsideDown = {
    flipTable: {
        a : '\u0250',
        b : 'q',
        c : '\u0254',
        d : 'p',
        e : '\u01DD',
        f : '\u025F',
        g : '\u0183',
        h : '\u0265',
        i : '\u0131',
        j : '\u027E',
        k : '\u029E',
        l : '\u05DF',
        m : '\u026F',
        n : 'u',
        r : '\u0279',
        t : '\u0287',
        v : '\u028C',
        w : '\u028D',
        y : '\u028E',
        '.' : '\u02D9',
        '[' : ']',
        '(' : ')',
        '{' : '}',
        '?' : '\u00BF',
        '!' : '\u00A1',
        "\'" : ',',
        '<' : '>',
        '_' : '\u203E',
        '\\' : '\\',
        ';' : '\u061B',
        '\u203F' : '\u2040',
        '\u2045' : '\u2046',
        '\u2234' : '\u2235'
    }, 
    
    flipText: function(input) {
        var last = input.length - 1;
        var result = new Array(input.length);
        for (var i = last; i >= 0; --i) {
            var c = input.charAt(i);
            var r = UpsideDown.flipTable[c];
            result[last - i] = r != undefined ? r : c;
        }
        return result.join('');
    }
};

o.on("stranger_connect", function() {
	console.log("Stranger connected.");
	o.send ("hello say something and i'll turn it upside-down. (i'm just a bot btw--not real)");
});

o.on("message", function(m) {
	console.log("Stranger said: "+m);
	var a = UpsideDown.flipText(m);
	setTimeout (function() { o.set_typing(true); }, 2000);
	setTimeout (function() {
		o.send (a);
		o.set_typing(false);
	}, 2000 + a.length * 100 );
});
o.on("stranger_disconnect", function(m) { console.log("Stranger disconnected."); });
process.on("exit", function() { o.disconnect(); });
//setTimeout (function() { o.disconnect(); }, 20000);

*/
