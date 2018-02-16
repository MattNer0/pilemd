const fs = require('fs');
const path = require('path');

const libini = require('../utils/libini');
const Datauri = require('datauri');

function dataImage(path) {
	return Datauri.sync(path);
}

/**
 * @function getValidMarkdownFormats
 * @return {Array} Array of valid formats
 */
function getValidMarkdownFormats() {
	return ['.md', '.markdown', '.txt', '.mdencrypted', '.opml'];
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

function readRackData(rack_path) {
	return libini.readIniFile(rack_path, '.rack.ini');
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
					if (rackStat.isDirectory()) {
						var rack_data = {};
						try {
							rack_data = readRackData(rackPath);
						} catch(err) {
							rack_data = {};
						}
						valid_racks.push({
							_type        : 'rack',
							name         : rack,
							ordering     : rack_data.ordering || valid_racks.length,
							icon         : rack_data.icon || '',
							path         : rackPath
						});
					} else if (rackStat.isFile()) {
						var rackExt = path.extname(rack);
						if (rackExt == '.html') {
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
		}
		return valid_racks;
	},
	readFoldersByParent(parent_folder) {
		try {
			var valid_folders = [];
			var folders = fs.readdirSync(parent_folder);
			folders = folders.filter(function(obj) {
				return obj.charAt(0) != ".";
			});
			for (var fi = 0; fi < folders.length; fi++) {
				var folderPath = path.join(parent_folder, folders[fi]);
				var folderStat = fs.statSync(folderPath);
				if (folderStat.isDirectory()) {
					valid_folders.push({
						name: folders[fi],
						ordering: valid_folders.length,
						load_ordering: true,
						path: folderPath,
						folders: this.readFoldersByParent(folderPath)
					});
				}
			}
			return valid_folders;
		} catch(err) {
			console.error(err);
			return [];
		}
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
					valid_notes.push(this.readNote(notePath, noteData));
				}
			}
		});
		return valid_notes;
	},
	readNote(notePath, noteData) {
		var note = path.basename(notePath);
		var body = fs.readFileSync(notePath).toString();
		switch(noteData.ext) {
			case '.mdencrypted':
				return {
					_type: 'encrypted',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
			case '.opml':
				return {
					_type: 'outline',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
			default:
				return {
					_type: 'note',
					name: note,
					body: body,
					path: notePath,
					extension: noteData.ext
				};
		}
	},
	isNoteFile(filePath) {
		if (!filePath) return false;
		return isValidNotePath(filePath);
	}
};
