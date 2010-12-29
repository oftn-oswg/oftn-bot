var F = {
	init: function() {
		this.auto_clear_init();
	},
	remove_siblings: function(el) {
		var i = 0, ch = el.parentNode.childNodes;
		while (ch.length > 1) {
			if (ch[i] !== el) {
				ch[i].parentNode.removeChild(ch[i]);
			} else {
				i++;
			}
		}
	},
	auto_clear_init: function() {
		var inputs = document.getElementsByTagName('input');
		for (var i = 0, len = inputs.length; i < len; i++) {
			if (inputs[i].parentNode.tagName === "LABEL") {
				var text = inputs[i].parentNode.innerText || inputs[i].parentNode.textContent;
				inputs[i].autoclear = text.replace(/^\s+|\s+$/g, "");
				inputs[i].onfocus = function() {
					if (this.value === this.autoclear) {
						this.value = "";
					}
				};
				inputs[i].onblur = function() {
					if (this.value === "") {
						this.value = this.autoclear;
					}
				};
				inputs[i].onblur.call(inputs[i]);
				this.remove_siblings(inputs[i]);
			}
		}
	}
};
F.init();
