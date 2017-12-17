'use strict';

const { ipcRenderer } = require('electron');

const downloadHelper = require('./background_tasks/download');
const libraryHelper = require('./background_tasks/library');

/**
 * @function logError
 * @param  {type} message {description}
 * @return {type} {description}
 */
function logMainProcess(message) {
	ipcRenderer.send('console', message);
}

/**
 * @function loadNotes
 * @param  {type} library {description}
 * @param  {type} arrayRacks {description}
 * @return {type} {description}
 */
function loadNotes(library, arrayRacks) {
	var allNotes = [];
	arrayRacks.forEach((r) => {
		var arrayNotes = [];
		r.folders.forEach((f) => {
			var newNotes = libraryHelper.readNotesByFolder(f.path);
			allNotes = allNotes.concat(newNotes);
			arrayNotes.push({
				notes: newNotes,
				folder: f.path,
				rack: r.rack
			});
		});

		ipcRenderer.send('loaded-notes', arrayNotes);
	});
	ipcRenderer.send('loaded-all-notes', allNotes.map((n) => {
		return n.path.replace(library + '/', '');
	}));
}

/**
 * @function loadFolders
 * @param  {type} library {description}
 * @param  {type} arrayRacks {description}
 * @return {type} {description}
 */
function loadFolders(library, arrayRacks) {
	var arrayFolders = [];
	arrayRacks.forEach((r) => {
		if (r._type != 'rack') return;
		var newFolders = libraryHelper.readFoldersByRack(r.path);
		arrayFolders.push({
			folders: newFolders,
			rack   : r.path
		});
	});
	ipcRenderer.send('loaded-folders', arrayFolders);
	loadNotes(library, arrayFolders);
}

window.onload = function () {
	ipcRenderer.on('download-files', (event, data) => {
		if (!data.files || !data.folder) return logMainProcess('download-files: data missing');

		try {
			downloadHelper.downloadMultipleFiles(data.files, data.folder);
		} catch(e) {
			logMainProcess(e);
		}
	});

	ipcRenderer.on('load-racks', (event, data) => {
		if (!data.library) return logMainProcess('load-racks: library missing');

		try {
			var arrayRacks = libraryHelper.readRacks(data.library);
			ipcRenderer.send('loaded-racks', { racks: arrayRacks });
			loadFolders(data.library, arrayRacks);
		} catch(e) {
			logMainProcess(e);
		}
	});
};
