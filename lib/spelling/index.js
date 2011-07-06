var Speller;


Speller = module.exports = function (words) {
	
	words = String(words);
	
	var
		  match
		, word
		, regex = /[\w']+/g;
	
	this.wordlist = {};
	
	while (match = regex.exec(words)) {
		word = match[0].toLowerCase();
		this.wordlist[word] = true;
	}
};


Speller.prototype.correct = function (word) {
	
	word = String(word).toLowerCase();
	
	if (this.wordlist[word])
		return true;
	
	var
		  candidates = []
		, edits = this.edits (word)
		, num = edits.length
		, edits2, num2;
	
	while (num--)
		if (this.wordlist[edits[num]])
			candidates.push (edits[num]);
	
	if (candidates.length) return this.closest (candidates, word);
	
	num = edits.length;
	while (num--) {
		var edits2 = this.edits (edits[num]);
		var num2 = edits2.length;
		while (num2--) {
			if (this.wordlist[edits2[num2]]) {
				candidates.push (edits2[num2]);
			}
		}
	}
	
	if (candidates.length) return this.closest (candidates, word);
	
	return null;
};


Speller.prototype.closest = function (candidates, word) {

	candidates = Object.getOwnPropertyNames(
		candidates.reduce(function(p, n) { p[n] = true; return p; }, {}));
		
	candidates.sort();
	return candidates;
};


Speller.prototype.edits = function (word) {
	
	var
		  edits = []
		, letters = "abcdefghijklmnopqrstuvwxyz"
		, len = word.length
		, i, j;
	
	i = len;
	while (i--) { /* Delete */
		edits.push (word.slice (0, i) + word.slice (i + 1));
	}
	
	i = len - 1;
	while (i--) { /* Transpose */
		edits.push (word.slice (0, i) + word.charAt(i + 1) + word.charAt(i) + word.slice (i + 2));
	}
	
	i = len;
	while (i--) { /* Replace */
		j = 26;
		while (j--) {
			edits.push (word.slice (0, i) + letters[j] + word.slice (i + 1));
		}
	}
	
	i = len + 1;
	while (i--) { /* Insert */
		j = 26;
		while (j--) {
			edits.push (word.slice (0, i) + letters[j] + word.slice (i)); // Insert
		}
	}
	
	return edits;
};
