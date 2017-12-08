const path = require('path');

const libini = require('./utils/libini');

const Library = require('./models/library');
var baseLibrary = new Library();

const Image = require('./models/image')(baseLibrary);

const NoteModels = require('./models/note')(baseLibrary);
const Note = NoteModels.Note;
const EncryptedNote = NoteModels.EncryptedNote;

const FolderModels = require('./models/folder')(baseLibrary);
const Folder = FolderModels.Folder;
const BookmarkFolder = FolderModels.BookmarkFolder;

const RackModels = require('./models/rack')(baseLibrary);
const Rack = RackModels.Rack;
const RackSeparator = RackModels.RackSeparator;
const BookmarkRack = RackModels.BookmarkRack;

module.exports = {
	Image         : Image,
	Note          : Note,
	EncryptedNote : EncryptedNote,
	Folder        : Folder,
	BookmarkFolder: BookmarkFolder,
	Rack          : Rack,
	RackSeparator : RackSeparator,
	BookmarkRack  : BookmarkRack,
	getBaseLibraryPath() {
		return baseLibrary.baseLibraryPath;
	},
	setBaseLibraryPath(path) {
		baseLibrary.baseLibraryPath = path;
		return path;
	},
	doesLibraryExists() {
		return baseLibrary.doesLibraryExists();
	},
	readHistoryNotes(racks, note_history) {
		var result = [];
		for (var i = 0; i < racks.length; i++) {
			// one rack
			var r = racks[i];

			// notes inside current rack
			var racks_history = note_history.filter(function(obj) {
				return path.join(baseLibrary.baseLibraryPath, obj.split(path.sep)[0]) == r.data.path;
			});

			for(var j = 0; j < r.notes.length; j++) {
				var n = r.notes[j];
				if (racks_history.indexOf(n.relativePath) >= 0) {
					// found note
					result.push(n);
				}
			}
		}
		return result;
	},
	resetHistory() {
		libini.removeKey(baseLibrary.baseLibraryPath, 'history');
	}
};
