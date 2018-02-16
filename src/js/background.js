const { ipcRenderer } = require('electron');

const downloadHelper = require('./background_tasks/download');
const libraryHelper = require('./background_tasks/library');
const initialModels = require('./background_tasks/initialModels');
//const watcherHelper = require('./background_tasks/watcher');

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

	function readNotesInsideFolders(rack, folders) {
		var arrayNotes = [];
		folders.forEach((f) => {
			var newNotes = libraryHelper.readNotesByFolder(f.path);
			allNotes = allNotes.concat(newNotes);
			var fObj = {
				notes: newNotes,
				folder: f.path,
				rack: rack
			};
			if (f.folders) {
				fObj.subnotes = readNotesInsideFolders(rack, f.folders);
			}
			arrayNotes.push(fObj);
		});
		return arrayNotes;
	}

	arrayRacks.forEach((r) => {
		var arrayNotes = readNotesInsideFolders(r.rack, r.folders);
		if (arrayNotes && arrayNotes.length > 0) {
			ipcRenderer.send('loaded-notes', arrayNotes);
		}
	});
	ipcRenderer.send('loaded-all-notes', {
		library: library,
		notes: allNotes.map((n) => {
			return n.path.replace(library + '/', '');
		})
	});
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
		var newFolders = libraryHelper.readFoldersByParent(r.path);
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
			logMainProcess(e.message);
			data.error = e.message || e;
			ipcRenderer.send('download-files-failed', data);
		}
	});

	ipcRenderer.on('load-racks', (event, data) => {
		if (!data.library) return logMainProcess('load-racks: library missing');

		try {
			var arrayRacks = libraryHelper.readRacks(data.library);
			if (arrayRacks.length == 0) {
				initialModels.initialSetup(data.library);
				arrayRacks = libraryHelper.readRacks(data.library);
			}
			ipcRenderer.send('loaded-racks', { racks: arrayRacks });
			loadFolders(data.library, arrayRacks);
		} catch(e) {
			logMainProcess(e.message);
		}
	});
	/*ipcRenderer.on('loaded-all-notes', (event, data) => {
		if (!data) return;
		watcherHelper.startWatcher(data.library, (err, event, path) => {
			if (err) {
				logMainProcess(err);
				return;
			}

			switch (event) {
				case 'add':
					var nData = libraryHelper.isNoteFile(path);
					if (nData) {
						ipcRenderer.send('new-note', libraryHelper.readNote(path, nData));
					}
					break;
				case 'change':
					var nData = libraryHelper.isNoteFile(path);
					if (nData) {
						ipcRenderer.send('change-note', libraryHelper.readNote(path, nData));
					}
					break;
				case 'unlink':
					ipcRenderer.send('unlink-note', { path: path });
					break;
				default:
					logMainProcess(event + ': ' + path);
			}
		});
	});
	ipcRenderer.on('unwatch-note', (event, data) => {
		if (!data) return;
		watcherHelper.ignorePath(data.path);
	});*/
};
