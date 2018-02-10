const fs = require('fs');
const path = require('path');

const moment = require('moment');

const arr = require('../utils/arr');
const util_file = require('../utils/file');

const Model = require('./baseModel');

var Library;

class Folder extends Model {
	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';
		this.ordering = false;

		if (data.load_ordering && fs.existsSync(path.join(data.path, '.folder'))) {
			this.ordering = parseInt(fs.readFileSync(path.join(data.path, '.folder')).toString());
		}

		if (this.ordering === false || isNaN(this.ordering)) {
			this.ordering = data.ordering || 0;
		}

		this.rack = data.rack;
		this.parentFolder = data.parentFolder;
		this._path = data.path || '';

		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;

		this.openNotes = false;
		this.openFolder = false;

		this.folders = [];
		if (data.folders && data.folders.length > 0) {
			for (var fi = 0; fi < data.folders.length; fi++) {
				var fObj = data.folders[fi];
				fObj.rack = this.rack;
				fObj.parentFolder = this;
				this.folders.push(new Folder(fObj));
			}
		}
		this._notes = [];
	}

	remove(origNotes) {
		origNotes.forEach((note) => {
			if (note.folder.uid && note.folder.uid == this.uid) {
				note.remove();
			}
		});
		Folder.removeModelFromStorage(this);
	}

	get data() {
		return {
			uid: this.uid,
			name: this.name,
			fsName: this.name ? this.name.replace(/[^\w _-]/g, '') : '',
			ordering: this.ordering,
			rack: this.rack,
			path: this._path
		};
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		}
		return path.join(
			this.parent.path,
			this.data.fsName
		);
	}

	set path(newValue) {
		if (newValue != this._path) {
			this._path = newValue;
		}
	}

	get folderExists() {
		return fs.existsSync(this._path);
	}

	set parent(f) {
		if (!f) {
			return;
		}

		if (f.folderExists) {
			this.parentFolder = f;
		}
	}

	get parent() {
		return this.parentFolder || this.rack;
	}

	set notes(notes_list) {
		this._notes = notes_list;
	}

	get notes() {
		return this._notes;
	}

	get rackUid() {
		return this.rack.uid;
	}

	toJSON() {
		return {
			name: this.name,
			path: this._path,
			rack: this.rack,
			ordering: this.ordering,
			notes: this._notes.map((n) => { return n.toJSON(); })
		};
	}

	update(data) {
		super.update(data);
		this.name = data.name;
		this.ordering = data.ordering;
	}

	saveOrdering() {
		var folderConfigPath = path.join( this._path, '.folder');
		fs.writeFileSync(folderConfigPath, this.ordering);
	}

	saveModel() {
		if (!this.name || !this.uid) {
			return;
		}

		var new_path = path.join(this.parent.path, this.data.fsName);
		if (new_path != this._path || !fs.existsSync(new_path)) {
			try {
				if (this._path && fs.existsSync(this._path)) {
					util_file.moveFolderRecursiveSync(
						this._path,
						this.parent.path,
						this.data.fsName
					);
				} else {
					fs.mkdirSync(new_path);
				}
				this.path = new_path;
			} catch(e){
				return console.error(e);
			}
		}
		this.saveOrdering();
	}

	static removeModelFromStorage(model) {
		if (!model) {
			return;
		}
		if(fs.existsSync(model.data.path)) {
			if( fs.existsSync(path.join(model.data.path, '.folder')) ) fs.unlinkSync( path.join(model.data.path, '.folder') );
			fs.rmdirSync(model.data.path);
			model.uid = null;
		}
	}
}

class BookmarkFolder extends Folder {
	constructor(data) {
		data.load_ordering = false;
		super(data);
		this._path = '';
		if (data.attributes) {
			this._attributes = data.attributes;
		} else {
			this._attributes = {
				"ADD_DATE": moment().format('X'),
				"LAST_MODIFIED": moment().format('X')
			};
		}
	}

	get data() {
		var dt = super.data;
		dt.bookmarks = true;
		dt.attributes = this._attributes;
		return dt;
	}

	get folderExists() {
		return false;
	}

	remove() {
		arr.remove(this.rack.folders, (f) => {
			return f == this;
		});
		this.rack.saveModel();
	}

	removeNote(note) {
		arr.remove(this.notes, (n) => {
			return n == note;
		});
		this.rack.saveModel();
	}

	saveModel() {
		this.rack.saveModel();
	}

	domains() {
		if(this.notes) {
			var d_array = [];
			for( var i = 0; i < this.notes.length; i++) {
				d_array.push(BookmarkFolder.getDomain(this.notes[i]));
			}
			return d_array;
		}
		return [];
	}

	static getDomain(bookmark) {
		return bookmark.body.replace(/https?:\/\/([^./]*\.)?([^/./]+\.[^/./]+)(\/.*)?/,'$2');
	}

	static newEmptyBookmark(folder) {
		var today = moment();
		var attributes = {
			'HREF': '',
			'ICON': '',
			'ICON_URI': '',
			'LAST_MODIFIED': today.format('X'),
			'ADD_DATE': today.format('X')
		};

		return {
			uid: Model.generateNewUID(),
			attributes: attributes || {},
			body: attributes['HREF'],
			folder: folder,
			rack: folder.rack,
			name: '',
			dragHover: false,
			sortUpper: false,
			sortLower: false,
			updatedAt: today,
			createdAt: today
		};
	}

	static setBookmarkNameUrl(bookmark, name, url) {
		if(!bookmark) return;
		bookmark.name = name;
		bookmark.updatedAt = moment();
		bookmark.attributes['HREF'] = url;
		bookmark.attributes['LAST_MODIFIED'] = bookmark.updatedAt.format('X');
		bookmark.body = url;
	}

	static setBookmarkIcon(bookmark, favicon_url, favicon_data) {
		if(!bookmark || !favicon_url) return;
		bookmark.attributes['ICON_URI'] = favicon_url;
		bookmark.attributes['ICON'] = favicon_data;
	}

	static setBookmarkThumb(bookmark, thumbnail) {
		if(!bookmark) return;
		if(thumbnail) bookmark.attributes['THUMBNAIL'] = thumbnail;
	}
}

module.exports = function(library) {
    Library = library;
	return {
		Folder        : Folder,
		BookmarkFolder: BookmarkFolder
	};
};
