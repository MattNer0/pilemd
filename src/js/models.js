const fs = require('fs');
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

var readSeparators = function() {
	var valid_racks = [];
	if( fs.existsSync(baseLibrary.baseLibraryPath) ) {
		var racks = libini.readKeyAsArray( baseLibrary.baseLibraryPath, 'separator');
		for (var r = 0; r < racks.length; r++) {
			valid_racks.push(new RackSeparator({
				uid: racks[r].key,
				name: racks[r].key,
				ordering: racks[r].value
			}));
		}
	}
	return valid_racks;
};

var readBookmarkRacks = function() {
	var valid_racks = [];
	if( fs.existsSync(baseLibrary.baseLibraryPath) ) {
		var racks = fs.readdirSync(baseLibrary.baseLibraryPath);
		for(var ri = 0; ri<racks.length; ri++){
			var rack = racks[ri];
			var rackPath = path.join( baseLibrary.baseLibraryPath, rack);
			if(fs.existsSync(rackPath) && rack.charAt(0) != ".") {
				var rackStat = fs.statSync(rackPath);
				var rackExt = path.extname(rack);
				if(rackStat.isFile() && rackExt == '.html' ){
					valid_racks.push(new BookmarkRack({
						name: rack,
						path: rackPath,
						extension: rackExt
					}));
				}
			}
		}
	}
	return valid_racks;
};

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
	readRacks() {
		var valid_racks = [];
		if( fs.existsSync(baseLibrary.baseLibraryPath) ) {
			var racks = fs.readdirSync(baseLibrary.baseLibraryPath);
			for(var ri = 0; ri<racks.length; ri++) {
				var rack = racks[ri];
				var rackPath = path.join( baseLibrary.baseLibraryPath, rack);

				if(fs.existsSync(rackPath) && rack.charAt(0) != ".") {
					var rackStat = fs.statSync(rackPath);
					if(rackStat.isDirectory()){
						valid_racks.push( new Rack({
							name: rack,
							ordering: valid_racks.length,
							load_ordering: true,
							path: rackPath
						}) );
					}
				}
			}

			var separators = readSeparators();
			if(separators) valid_racks = valid_racks.concat(separators);

			var bookmarks = readBookmarkRacks();
			if(bookmarks) valid_racks = valid_racks.concat(bookmarks);
		}

		return valid_racks;
	},
	readHistoryNotes(racks, note_history, readRackContent) {
		var result = [];
		for (var i = 0; i < racks.length; i++) {
			var r = racks[i];
			var racks_history = note_history.filter(function(obj) {
				return path.join(baseLibrary.baseLibraryPath, obj.split(path.sep)[0]) == r.data.path;
			});
			if (racks_history.length > 0) readRackContent(r);
			for(var j = 0; j < r.notes.length; j++) {
				var n = r.notes[j];
				if(racks_history.indexOf(n.relativePath) >= 0) {
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
