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
		this._openFolder = false;

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

	get allnotes() {
		var all_notes = this.notes.slice();
		this.folders.forEach((folder) => {
			all_notes = all_notes.concat(folder.allnotes);
		});
		return all_notes;
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

	get openFolder() {
		return this._openFolder;
	}

	set openFolder(value) {
		this._openFolder = value;
		if (value) this.parent.openFolder = true;
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

module.exports = function(library) {
    Library = library;
	return { Folder : Folder };
};
