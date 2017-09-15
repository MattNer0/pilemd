const fs = require('fs');
const path = require('path');

const models = require('./models');
const elosenv = require('./utils/elosenv');

function initialFolder() {
	var p = path.join(elosenv.workingDirectory(), 'library');
	try { fs.accessSync(p, fs.W_OK | fs.R_OK);
	} catch (e) {
		p = path.join(elosenv.homePath(), 'library');
	}

	try {
		models.setBaseLibraryPath(p);
		if (!fs.existsSync(p)) fs.mkdirSync(p);
	} catch (e) {}
}

function makeInitialNotes(rack, folder) {

	var note = new models.Note({
		name: 'Welcome to PileMd',
		body: '# Welcome to PileMd\n\n' +
		'Pile **Markdown** notes.\n\n' +
		'* Phenomenon User Interface\n' +
		'* Beautiful highlight, comfortable completing\n\n' +
		'## Features\n\n' +
		'* Note listing as time line (updated / created)\n' +
		'* Syncing with local files\n' +
		'* Text searching\n' +
		'* Beautiful inline code highlight\n' +
		'* Comfy completing by syntax\n' +
		'* Pasting images\n' +
		'* Exporting notes\n',
		rack: rack,
		folder: folder
	});

	models.Note.setModel(note);
	return [note];
}

function makeInitialRacks() {

	var rack1 = new models.Rack({
		name: 'Work',
		ordering: 0,
		load_ordering: false
	});

	models.Rack.setModel(rack1);
	var folders = makeInitialFolders(rack1);

	return {
		rack1: rack1,
		folder1: folders[0],
		folder2: folders[1]
	};
}

function makeInitialFolders(rack1) {
	var folder1 = new models.Folder({
		name: 'Todo',
		ordering: 0,
		load_ordering: false,
		rack: rack1
	});

	var folder2 = new models.Folder({
		name: 'Meeting',
		ordering: 1,
		load_ordering: false,
		rack: rack1
	});

	models.Folder.setModel(folder1);
	models.Folder.setModel(folder2);

	return [folder1, folder2];
}

function initialSetup(racks) {
	var initialData;
	if (racks.length == 0) {
		initialData = makeInitialRacks();
	} else {
		var initialFolders = racks[0].readContents();
		if (initialFolders.length == 0) initialFolders = makeInitialFolders(racks[0]);

		initialData = {
			rack1: racks[0],
			folder1: initialFolders[0]
		};
	}

	return makeInitialNotes(initialData.rack1, initialData.folder1);
}

module.exports = {
	initialFolder: initialFolder,
	makeInitialNotes: makeInitialNotes,
	makeInitialRacks: makeInitialRacks,
	initialSetup: initialSetup
};
