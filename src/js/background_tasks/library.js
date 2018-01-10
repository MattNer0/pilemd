var fs = require('fs');
var path = require('path');

const libini = require('../utils/libini');

/**
 * @function readSeparators
 * @param  {type} library {description}
 * @return {type} {description}
 */
function readSeparators(library) {
	var valid_racks = [];
	if (fs.existsSync(library)) {
		var racks = libini.readKeyAsArray(library, 'separator');
		for (var r = 0; r < racks.length; r++) {
			valid_racks.push({
				_type   : 'separator',
				uid     : racks[r].key,
				name    : racks[r].key,
				ordering: racks[r].value
			});
		}
	}
	return valid_racks;
}

/**
 * @function readBookmarkRacks
 * @param  {type} library {description}
 * @return {type} {description}
 */
function readBookmarkRacks(library) {
	var valid_racks = [];
	if (fs.existsSync(library)) {
		var racks = fs.readdirSync(library);
		for (var ri = 0; ri<racks.length; ri++) {
			var rack = racks[ri];
			var rackPath = path.join(library, rack);
			if (fs.existsSync(rackPath) && rack.charAt(0) != ".") {
				var rackStat = fs.statSync(rackPath);
				var rackExt = path.extname(rack);
				if (rackStat.isFile() && rackExt == '.html') {
					var body = fs.readFileSync(rackPath).toString();
					valid_racks.push({
						_type    : 'bookmark',
						name     : rack,
						body     : body,
						path     : rackPath,
						extension: rackExt
					});
				}
			}
		}
	}
	return valid_racks;
}

/**
 * @function getValidMarkdownFormats
 * @return {Array} Array of valid formats
 */
function getValidMarkdownFormats() {
	return ['.md', '.markdown', '.txt', '.mdencrypted'];
}

/**
 * @function isValidNotePath
 * @param  {type} notePath {description}
 * @return {type} {description}
 */
function isValidNotePath(notePath) {
	var valid_formats = getValidMarkdownFormats();
	var noteStat = fs.statSync(notePath);
	var noteExt = path.extname(notePath);
	if (noteStat.isFile() && valid_formats.indexOf(noteExt) >= 0 ) {
		return {
			ext: noteExt,
			stat: noteStat
		};
	}
	return false;
}

module.exports = {
	readRacks(library) {
		var valid_racks = [];
		if (fs.existsSync(library)) {
			var racks = fs.readdirSync(library);
			for (var ri = 0; ri<racks.length; ri++) {
				var rack = racks[ri];
				var rackPath = path.join(library, rack);

				if (fs.existsSync(rackPath) && rack.charAt(0) != ".") {
					var rackStat = fs.statSync(rackPath);
					if(rackStat.isDirectory()){
						valid_racks.push({
							_type        : 'rack',
							name         : rack,
							ordering     : valid_racks.length,
							load_ordering: true,
							path         : rackPath
						});
					}
				}
			}

			var separators = readSeparators(library);
			if (separators) valid_racks = valid_racks.concat(separators);

			var bookmarks = readBookmarkRacks(library);
			if (bookmarks) valid_racks = valid_racks.concat(bookmarks);
		}
		return valid_racks;
	},
	readFoldersByRack(rack) {
		var valid_folders = [];
		if (fs.existsSync(rack)) {

			var folders = fs.readdirSync(rack);
			for (var fi = 0; fi < folders.length; fi++) {

				var folder = folders[fi];
				var folderPath = path.join(rack, folder);

				if (fs.existsSync(folderPath) && folder.charAt(0) != ".") {
					var folderStat = fs.statSync(folderPath);
					if(folderStat.isDirectory()){
						valid_folders.push({
							name: folder,
							ordering: valid_folders.length,
							load_ordering: true,
							path: folderPath
						});
					}
				}
			}
		}
		return valid_folders;
	},
	readNotesByFolder(folder) {
		if (!fs.existsSync(folder)) return [];

		var valid_notes = [];
		var notes = fs.readdirSync(folder);
		notes.forEach((note) => {
			var notePath = path.join(folder, note);
			if (fs.existsSync(notePath) && note.charAt(0) != ".") {
				var noteData = isValidNotePath(notePath);
				if (noteData) {
					var body = fs.readFileSync(notePath).toString();
					if (noteData.ext == '.mdencrypted') {
						//note encrypted
						valid_notes.push({
							_type: 'encrypted',
							name: note,
							body: body,
							path: notePath,
							extension: noteData.ext
						});
					} else {
						valid_notes.push({
							_type: 'note',
							name: note,
							body: body,
							path: notePath,
							extension: noteData.ext
						});
					}
				}
			}
		});
		return valid_notes;
	}
};