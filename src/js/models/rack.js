const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const searcher = require('../searcher');

const libini = require('../utils/libini');
const util_file = require('../utils/file');

const Model = require('./baseModel');

var Library;

class Rack extends Model {

	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';

		this.ordering = data.ordering || 0;

		this._path = data.path;

		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;

		this._icon = data.icon;

		this._openFolder = false;

		this.folders = [];
	}

	get data() {
		return _.assign(super.data, {
			name: this.name,
			fsName: this.name ? this.name.replace(/[^\w _-]/g, '') : '',
			ordering: this.ordering,
			path: this._path,
		});
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		}
		var new_path = path.join(
			Library.baseLibraryPath,
			this.data.fsName
		);
		return new_path;
	}

	set path(newValue) {
		if (newValue != this._path) {
			this._path = newValue;
		}
	}

	get allnotes() {
		var all_notes = [];
		this.folders.forEach((folder) => {
			all_notes = all_notes.concat(folder.allnotes);
		});
		return all_notes;
	}

	get starrednotes() {
		return this.allnotes.filter(function(obj) {
			return obj.starred;
		});
	}
	
	get shorten() {
		var splitName = this.name.split(" ");
		if (splitName.length == 0) {
			return "??";
		} else if (splitName.length == 1) {
			return this.name.slice(0,2);
		} else {
			return splitName[0].slice(0,1)+splitName[1].slice(0,1);
		}
	}

	searchnotes(search) {
		return searcher.searchNotes(search, this.allnotes);
	}

	searchstarrednotes(search) {
		return searcher.searchNotes(search, this.starrednotes);
	}

	get relativePath() {
		return this.path.replace(Library.baseLibraryPath+'/', '');
	}

	get rackExists() {
		return fs.existsSync(this._path);
	}

	get rackUid() {
		return this.uid;
	}

	get extension() {
		return false;
	}

	get rack() {
		return this;
	}

	get openFolder() {
		return this._openFolder;
	}

	set openFolder(value) {
		this._openFolder = value;
	}

	get icon() {
		if (this._icon) {
			return this._icon;
		} else {
			return 'delete';
		}
	}

	toJSON() {
		return {
			name: this.name,
			path: this._path,
			ordering: this.ordering,
			folders: this.folders.map((f) => { return f.toJSON(); })
		};
	}

	update(data) {
		super.update(data);
		this.name = data.name;
		this.ordering = data.ordering;
	}

	remove(origNotes) {
		this.folders.forEach((folder) => {
			folder.remove(origNotes);
		});
		this.removeFromStorage();
	}

	removeFromStorage() {
		if (fs.existsSync(this._path)) {
			if( fs.existsSync(path.join(this._path, '.rack.ini')) ) fs.unlinkSync( path.join(this._path, '.rack.ini') );
			fs.rmdirSync(this._path);
			this.uid = null;
		}
	}

	saveOrdering() {
		libini.writeKeyByIni(this._path, '.rack.ini', 'ordering', this.ordering);
	}

	saveModel() {
		if (!this.name || !this.uid) {
			return;
		}

		var new_path = this.path; //path.join(Library.baseLibraryPath, this.data.fsName);
		if (new_path != this._path || !fs.existsSync(new_path)) {
			try {
				if (this._path && fs.existsSync(this._path)) {
					util_file.moveFolderRecursiveSync(this._path, Library.baseLibraryPath, this.data.fsName);
				} else {
					fs.mkdirSync(new_path);
				}
				this.path = new_path;
			} catch(e) {
				return console.error(e);
			}
		}
		this.saveOrdering();
	}
}

module.exports = function(library) {
    Library = library;
	return { Rack : Rack };
};
