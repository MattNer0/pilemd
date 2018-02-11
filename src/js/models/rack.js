const fs = require('fs');
const path = require('path');

const _ = require('lodash');

const libini = require('../utils/libini');
const bookmarksConverter = require('../utils/bookmarks');
const util_file = require('../utils/file');

const Model = require('./baseModel');

var Library;

class Rack extends Model {

	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';

		this.ordering = false;

		if(data.load_ordering && fs.existsSync(path.join(data.path, '.rack')) ){
			this.ordering = parseInt( fs.readFileSync( path.join(data.path, '.rack') ).toString() );
		}

		if(this.ordering === false || isNaN(this.ordering)){
			this.ordering = data.ordering || 0;
		}

		this._path = data.path;

		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;

		this._openFolder = false;

		this.folders = [];
		this.notes = [];
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

	get relativePath() {
		return this.path.replace(Library.baseLibraryPath+'/', '');
	}

	get rackExists() {
		return fs.existsSync(this._path);
	}

	get rackUid() {
		return this.uid;
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
			if( fs.existsSync(path.join(this._path, '.rack')) ) fs.unlinkSync( path.join(this._path, '.rack') );
			fs.rmdirSync(this._path);
			this.uid = null;
		}
	}

	saveOrdering() {
		var rackConfigPath = path.join( this._path, '.rack');
		fs.writeFileSync(rackConfigPath, this.ordering);
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

class BookmarkRack extends Rack {
	constructor(data) {
		data.load_ordering = false;
		super(data);
		this._ext = data.extension || '.html';
		this._bookmarks = {};

		if (data.body) {
			this._bookmarks = bookmarksConverter.parse(data.body, this);
			this._name = this._bookmarks.name;
			this.ordering = this._bookmarks.ordering || 0;
		} else {
			this._bookmarks = {
				title: 'Bookmarks',
				name: '',
				children: []
			};
		}
	}

	get data() {
		return _.assign(super.data, { bookmarks: true });
	}

	get extension() {
		return this._ext;
	}

	get folders() {
		return this._bookmarks.children || [];
	}

	set folders(farray) {
		if(this._bookmarks) this._bookmarks.children = farray;
	}

	get rackExists() {
		return false;
	}

	get title() {
		return this._name;
	}

	get name() {
		return this._name;
	}

	set name(newName) {
		this._name = newName;
	}

	domains() {
		if(this.folders) {
			var d_array = [];
			for(var i=0; i< this.folders.length; i++) {
				d_array = d_array.concat(this.folders[i].domains());
			}
			return d_array;
		}
		return [];
	}

	set path(newValue) {
		if (newValue != this._path) {
			try {
				if (this._path && fs.existsSync(this._path)) fs.unlinkSync(this._path);
			} catch (e) {
				console.warn(e);
			}

			this._path = newValue;
		}
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		}
		var new_path = path.join(Library.baseLibraryPath, this.document_filename) + this._ext;
		return new_path;
	}

	get document_filename() {
		return this.title ? this.title.replace(/[^\w _-]/g, '').substr(0, 40) : '';
	}

	remove() {
		if(fs.existsSync(this.path)) {
			fs.unlinkSync(this.path);
		}
	}

	removeNote(note) {
		for(var i=0; i<this._bookmarks.children.length; i++) {
			if (this._bookmarks.children[i].uid == note.folder.uid) {
				this._bookmarks.children[i].removeNote(note);
				break;
			}
		}
	}

	saveModel() {
		var outer_folder = Library.baseLibraryPath;
		this._bookmarks.ordering = this.ordering;
		this._bookmarks.name = this._name;
		var string_html = bookmarksConverter.stringify(this._bookmarks);

		if(this.document_filename) {
			var new_path = path.join(outer_folder, this.document_filename) + this._ext;
			if(new_path != this.path) {
				var num = 1;
				while(num > 0) {
					try {
						fs.statSync(new_path);
						if (string_html != fs.readFileSync(new_path).toString()) {
							new_path = path.join(outer_folder, this.document_filename)+num+this.extension;
						} else {
							new_path = null;
							break;
						}
						num++;
					} catch(e) {
						//path doesn't exist, I don't have to worry about overwriting something
						num = -1;
						break;
					}
				}

				if(new_path){
					fs.writeFileSync(new_path, string_html);
					this.path = new_path;
				}
			} else {
				try {
					if( !fs.existsSync(new_path) || string_html != fs.readFileSync(new_path).toString() ){
						fs.writeFileSync(new_path, string_html);
						this.path = new_path;
					}
				} catch(e) {
					console.warn("Couldn't save the BookmarkRack.\nPermission Error\n", new_path);
					return {
						error: "Permission Error",
						path: new_path
					};
				}
			}
		}
	}
}

module.exports = function(library) {
    Library = library;
	return {
		Rack         : Rack,
		BookmarkRack : BookmarkRack
	};
};
