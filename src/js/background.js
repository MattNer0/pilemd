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
 * @param  {type} rack         {description}
 * @param  {type} arrayFolders {description}
 * @return {type} {description}
 */
function loadNotes(rack, arrayFolders) {
	arrayFolders.forEach((f) => {
		var arrayNotes = libraryHelper.readNotesByFolder(f.path);
		ipcRenderer.send('loaded-notes', {
			notes: arrayNotes,
			folder: f.path,
			rack: rack.path
		});
	});
}

/**
 * @function loadFolders
 * @param  {type} arrayRacks {description}
 * @return {type} {description}
 */
function loadFolders(arrayRacks) {
	arrayRacks.forEach((r) => {
		if(r._type != 'rack') return;

		var arrayFolders = libraryHelper.readFoldersByRack(r.path);
		ipcRenderer.send('loaded-folders', {
			folders: arrayFolders,
			rack: r.path
		});

		loadNotes(r, arrayFolders);
	});
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
			loadFolders(arrayRacks);
		} catch(e) {
			logMainProcess(e);
		}
	});
};
