const _ = require('lodash');
const models = require('./models');

function calculateSearchMeaning(selectedRackOrFolder, searchInput) {
	var words = searchInput.toLowerCase().split(' ');
	var folderUids;
	if (selectedRackOrFolder === null) {
		folderUids = null;
	} else if (selectedRackOrFolder instanceof models.Rack) {
		folderUids = selectedRackOrFolder.folders.map((f) => {return f.uid});
	} else {
		folderUids = [selectedRackOrFolder.uid]
	}

	return {
		folderUids: folderUids,
		words: words
	};
}

function allWords(text, words) {
	/**
	 * allWords("Hello Goodbye", ["ell", "oo"]) => true
	 * allWords("Hi Goodbye", ["ell", "oo"]) => false
	 */
	return _.all(_.map(words, (word) => { return _.includes(text, word) }))
}

function searchNotes(selectedRackOrFolder, searchInput, notes) {
	if (selectedRackOrFolder === null) {
		return [];
	}
	var searchPayload = calculateSearchMeaning(selectedRackOrFolder, searchInput);
	var filteredNotes = notes.filter((note) => {
		if(!searchPayload.folderUids || _.includes(searchPayload.folderUids, note.folderUid)){
			if(searchPayload.words.length == 0) return true;

			if(!note.body) note.loadBody();
			if( allWords(note.body.toLowerCase(), searchPayload.words) ) return true;
		}
		return false;
	});
	return filteredNotes;
}

module.exports = {
	searchNotes: searchNotes,
	calculateSearchMeaning: calculateSearchMeaning
};
