const path = require('path');

const libini = require('./utils/libini');

const Library = require('./models/library');
var baseLibrary = new Library();

const Image = require('./models/image')(baseLibrary);

const NoteModels = require('./models/note')(baseLibrary);
const Note = NoteModels.Note;
const EncryptedNote = NoteModels.EncryptedNote;
const Outline = NoteModels.Outline;
const OutNode = NoteModels.OutNode;

const FolderModels = require('./models/folder')(baseLibrary);
const Folder = FolderModels.Folder;
const BookmarkFolder = FolderModels.BookmarkFolder;

const RackModels = require('./models/rack')(baseLibrary);
const Rack = RackModels.Rack;
const BookmarkRack = RackModels.BookmarkRack;

module.exports = {
	Image         : Image,
	Note          : Note,
	EncryptedNote : EncryptedNote,
	Outline       : Outline,
	Folder        : Folder,
	BookmarkFolder: BookmarkFolder,
	Rack          : Rack,
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
	resetHistory() {
		libini.removeKey(baseLibrary.baseLibraryPath, 'history');
	},
	setLibraryToInitial() {
		baseLibrary.baseLibraryPath = baseLibrary.initialLibrary();
	}
};
