const fs = require('fs');
const path = require('path');

const moment = require('moment');
const _ = require('lodash');

const arr = require('../utils/arr');
const util_file = require('../utils/file');

const Model = require('./baseModel');

var Library;

class Folder extends Model {
	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';
		this.ordering = false;

		if(data.load_ordering && fs.existsSync(path.join(data.path, '.folder')) ){
			this.ordering = parseInt( fs.readFileSync( path.join(data.path, '.folder') ).toString() );
		}

		if(this.ordering === false || isNaN(this.ordering)){
			this.ordering = data.ordering || 0;
		}

		this.rackUid = data.rack ? data.rack.data.uid : null;
		this._rack = data.rack;
		this._path = data.path || '';
		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;
		this._loadingFull = false;

		this.openNotes = false;
		this._notes = [];
	}

	remove(origNotes) {
		origNotes.forEach((note) => {
			if (note.data.folderUid && note.data.folderUid == this.uid) {
				note.remove();
			}
		});
		Folder.removeModelFromStorage(this);
	}

	get data() {
		return _.assign(super.data, {
			name: this.name,
			fsName: this.name ? this.name.replace(/[^\w _-]/g, '') : '',
			ordering: this.ordering,
			rack: this._rack,
			rackUid: this.rackUid,
			path: this._path
		});
	}

	get path() {
		return this._path;
	}

	set path(newValue) {
		if(newValue != this._path){
			this._path = newValue;
		}
	}

	get folderExists() {
		return fs.existsSync(this._path);
	}

	set rack(r) {
		if (!r) {
			return;
		}

		if (r.rackExists) {
			this._rack = r;
			this.rackUid = r.uid;
		}
	}

	set notes(notes_list) {
		this._notes = notes_list;
	}

	get notes() {
		return this._notes;
	}

	get loadedNotes() {
		return this._loadingFull;
	}

	toJSON() {
		return {
			name: this.name,
			path: this._path,
			rack: this._rack,
			ordering: this.ordering,
			notes: this._notes.map((n) => { return n.toJSON(); })
		};
	}

	update(data) {
		super.update(data);
		this.name = data.name;
		this.rackUid = data.rackUid;
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

		var new_path = path.join( Library.baseLibraryPath, this._rack.data.fsName, this.data.fsName );
		if(new_path != this._path || !fs.existsSync(new_path) ) {
			try{
				if(this._path && fs.existsSync(this._path)) {
					util_file.moveFolderRecursiveSync(
						this._path,
						path.join(Library.baseLibraryPath, this._rack.data.fsName),
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
		return _.assign(super.data, {
			bookmarks: true,
			attributes: this._attributes
		});
	}

	get folderExists() {
		return false;
	}

	remove() {
		arr.remove(this._rack.folders, (f) => {
			return f == this;
		});
		this._rack.saveModel();
	}

	removeNote(note) {
		arr.remove(this.notes, (n) => {
			return n == note;
		});
		this._rack.saveModel();
	}

	saveModel() {
		this._rack.saveModel();
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
			folderUid: folder.uid,
			folder: folder,
			rack: folder._rack,
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

	static setBookmarkIcon(bookmark, favicon_url) {
		if(!bookmark || !favicon_url) return;
		bookmark.attributes['ICON_URI'] = favicon_url;
		var http = require('http');
		http.get(favicon_url, function (res) {
			res.setEncoding('binary');
			var body = '';
			res.on('data', (chunk) => {
				body += chunk;
			});
			res.on('end', () => {
				bookmark.attributes['ICON'] = "data:" + res.headers["content-type"] + ";base64," + new Buffer(body, 'binary').toString('base64');
			});
		});
	}

	static setBookmarkThumb(bookmark, thumbnail) {
		if(!bookmark) return;
		thumbnail = thumbnail.resize({ width: 150 });
		if(thumbnail) bookmark.attributes['THUMBNAIL'] = thumbnail.toDataURL();
	}
}

module.exports = function(library) {
    Library = library;
	return {
		Folder        : Folder,
		BookmarkFolder: BookmarkFolder
	};
};
