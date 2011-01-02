if (!Array.prototype.forEach) {
	Array.prototype.forEach = function(fun /*, thisp */) {
		"use strict";

		if (this === void 0 || this === null)
			throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun !== "function")
			throw new TypeError();

		var thisp = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t)
				fun.call(thisp, t[i], i, t);
		}
	};
}


if (!Function.prototype.bind) {
	/* Minimal implementation */
	Function.prototype.bind = function(thisArg) {
		var self = this;
		return function() {
			return self.apply(thisArg, arguments);
		};
	};
}


var FactoidClient = function() {
	this.filter = "";
	this.maxnum = 10;
	this.dbpath = "/db.json";
	
	this.loading = false;
	
	var self = this;
	$("#search").keyup(function(e) {
		if (e.keyCode === 13) {
			self.filter = this.value;
			self.request();
			return false;
		}
	}).val("Search").focus(function() {
		if (this.value === "Search") {
			this.value = "";
		}
	}).blur(function() {
		if (this.value === "") {
			this.value = "Search";
		}
	}).bind("ajaxSend", function(){
		$(this).addClass("loading");
		self.loading = true;
	}).bind("ajaxComplete", function(){
		$(this).removeClass("loading");
		self.loading = false;
	});
};


FactoidClient.prototype.request = function() {
	if (!this.loading) {
		jQuery.ajax({
			url: this.dbpath,
			data: {filter: this.filter, maxnum: this.maxnum},
			dataType: "json",
			success: this.load.bind(this)
		});
	}
};


FactoidClient.prototype.load = function(data) {
	var list = $("#list").empty();
	data.forEach(function(obj) {
		$(this.create_dom_for_data(obj)).appendTo(list);
	}, this);
};


FactoidClient.prototype.create_dom_for_data = function(obj) {

	var factoid = document.createElement('div');
	factoid.className = 'factoid';
	
	var dt = document.createElement('dt');
	if (obj.keys.length === 1) {
		dt.className = "keys_single";
		var span = document.createElement('span');
		span.className = "name";
		span.appendChild(document.createTextNode(obj.keys[0]));
		dt.appendChild(span);
	} else {
		dt.className = "keys_multiple";
		var ul = document.createElement('ul');
		ul.className = "aliases";
		obj.keys.forEach(function(value) {
			var li = document.createElement('li');
			li.className = "alias";
			li.appendChild(document.createTextNode(value));
			ul.appendChild(li);
		}, this);
		dt.appendChild(ul);
	}
	
	var dd = document.createElement('dd');
	var contents = document.createElement('div');
	contents.className = "contents";
	contents.appendChild(document.createTextNode(obj.value));
	contents.innerHTML = this.linkify(contents.innerHTML);
	var popularity = document.createElement('div');
	popularity.className = "popularity";
	popularity.appendChild(
		document.createTextNode("Popularity: "+obj.popularity));
	dd.appendChild(contents);
	dd.appendChild(popularity);
	
	factoid.appendChild(dt);
	factoid.appendChild(dd);
	
	return factoid;
}


FactoidClient.prototype.linkify = function(text) {
	return text.replace(/((s?ftp|https?):\/\/[-\w\.]+(:\d+)?([-\/\w\.?=+%]+))/i, "<a href=\"$1\">$1</a>");
};


FactoidClient.prototype.error = function(message) {
	console.log(message);
};

function switch_style() {
	var link_tag = document.getElementsByTagName("link");
	for (var i = 0, len = link_tag.length; i < len; i++ ) {
		link_tag[i].disabled = !link_tag[i].disabled;
	}
}


(new FactoidClient).request();
