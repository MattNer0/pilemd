const fs = require('fs');
const moment = require('moment');
const path = require('path');

const models = require('./models');
const elosenv = require('./utils/elosenv');


function initialFolder() {
	var p = elosenv.homePath();
	try {
		p = path.join(p, 'pmlibrary');
		models.setBaseLibraryPath(p);
		fs.mkdirSync(p);
	} catch(e) {}
}


function migrateFromLocalStorage() {
	if (localStorage.getItem('migratedFromLS')) {
		return null
	}
	try {
		var noteUids = JSON.parse(localStorage.getItem('notes'));
		var folderUids = JSON.parse(localStorage.getItem('folders'));
		var rackUids = JSON.parse(localStorage.getItem('racks'));
		var notes = [];
		noteUids.forEach((n) => {
			var data = JSON.parse(localStorage.getItem('notes:' + n));
			var note = new models.Note(data);
			models.Note.setModel(note);
			notes.push(note);
		});
		folderUids.forEach((n) => {
			var data = JSON.parse(localStorage.getItem('folders:' + n));
			models.Folder.setModel(new models.Folder(data));
		});
		rackUids.forEach((n) => {
			var data = JSON.parse(localStorage.getItem('racks:' + n));
			models.Rack.setModel(new models.Rack(data));
		});
		localStorage.setItem('migratedFromLS', '1');
		return notes;
	} catch(e) {
		return null;
	}
}


function makeInitialNotes(rack, folder) {
	
	var note = new models.Note({
		name: "Welcome to PileMd",
		body: "# Welcome to PileMd\n\n" +
		"Pile **Markdown** notes.\n\n" +
		"* Phenomenon User Interface\n" +
		"* Beautiful highlight, comfortable completing\n\n" +
		"## Features\n\n" +
		"* Note listing as time line (updated / created)\n" +
		"* Syncing with local files\n" +
		"* Text searching\n" +
		"* Beautiful inline code highlight\n" +
		"* Comfy completing by syntax\n" +
		"* Pasting images\n" +
		"* Exporting notes\n" +
		"* Share on [Qiita](http://qiita.com/)",
		rack: rack,
		folder: folder,
		updated_at: moment(),
		created_at: moment()
	});
	
	models.Note.setModel(note);
	return [note];
}

function makeInitialRacks() {
	if (localStorage.getItem('initializedracks')) {
		return false
	}
	
	var rack1 = new models.Rack({
		name: "Work",
		ordering: 0,
		load_ordering: false
	});

	var folder1 = new models.Folder({
		name: "Todo",
		ordering: 0,
		load_ordering: false,
		rack: rack1
	});

	var folder2 = new models.Folder({
		name: "Meeting",
		ordering: 1,
		load_ordering: false,
		rack: rack1
	});
	
	models.Rack.setModel(rack1);
	models.Folder.setModel(folder1);
	models.Folder.setModel(folder2);
	
	localStorage.setItem('initializedracks', '1');
	return {
		rack1: rack1,
		folder1: folder1,
		folder2: folder2
	};
}

function initialSetup() {
	var initialData = makeInitialRacks();
	makeInitialNotes(initialData.rack1, initialData.folder1);
}


module.exports = {
	initialFolder: initialFolder,
	migrateFromLocalStorage: migrateFromLocalStorage,
	makeInitialNotes: makeInitialNotes,
	makeInitialRacks: makeInitialRacks,
	initialSetup: initialSetup
};
