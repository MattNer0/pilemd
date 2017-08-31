const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const _ = require('lodash');
const moment = require('moment');
const Datauri = require('datauri');

const arr = require('./utils/arr');
const uid = require('./utils/uid');
const util_file = require('./utils/file');
const libini = require('./utils/libini');

const bookmarksConverter = require('./utils/bookmarks');

const BASE_LIB_PATH_KEY = 'libpath';

var baseLibraryPath = '';

String.prototype.formatUnicorn = String.prototype.formatUnicorn || function() {
	'use strict';
	var str = this.toString();
	if (arguments.length) {
		var t = typeof arguments[0];
		var key;
		var args = ('string' === t || 'number' === t) ? Array.prototype.slice.call(arguments) : arguments[0];

		for (key in args) {
			str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key]);
		}
	}
	return str;
};

function setBaseLibraryPath(path) {
	baseLibraryPath = path;
	return baseLibraryPath;
	//return localStorage.setItem(BASE_LIB_PATH_KEY, path);
}

function getBaseLibraryPath() {
	return baseLibraryPath;
}

function doesLibraryExists() {
	return fs.existsSync(getBaseLibraryPath());
}

class Model {
	constructor(data) {
		this.uid = data.uid || uid.timeUID();
	}

	get data() { return { uid: this.uid } }

	update(data) {
		this.uid = data.uid;
	}

	saveModel() {
		return;
	}

	remove() {
		return;
	}

	static setModel(model) {
		model.saveModel();
	}

	static removeModelFromStorage(model) {
		model.remove();
	}
};

class Note extends Model {
	constructor(data) {
		super(data);

		this._ext = data.extension || '.md';

		var re = new RegExp('\\' + this._ext + '$');

		this._name = data.name.replace(re, '');
		this._body = data.body.replace(/    /g, '\t');
		this._path = data.path;
		this._rack = data.rack || data.folder.data.rack;
		this._folder = data.folder;

		this.folderUid = data.folder ? data.folder.data.uid : null;
		this.doc = null;

		if (this._body == '') {
			this._loadedBody = false;
		} else {
			this._loadedBody = true;
		}

		if (data.updated_at) {
			this.updatedAt = moment(data.updated_at);
		} else {
			this.updatedAt = moment();
		}

		if (data.created_at) {
			this.createdAt = moment(data.created_at);
		} else {
			this.createdAt = moment();
		}
	}

	get data() {
		return _.assign(super.data, {
			body: this._body,
			path: this._path,
			extension: this._ext,
			document_filename: this.document_filename,
			folderUid: this.folderUid,
			updated_at: this.updatedAt,
			created_at: this.createdAt,
			rack: this._rack,
			folder: this._folder,
			qiitaURL: this.qiitaURL
		});
	}

	get isEncrypted() {
		return false;
	}

	get isEncryptedNote() {
		return false;
	}

	get properties() {
		return {
			lineCount: (this._body.match(/\n/g) || []).length,
			wordCount: this._body.replace(/\n/g, ' ').replace(/ +/g, ' ').split(' ').length,
			charCount: this._body.replace(/\W/g, '').length
		};
	}

	set path(newValue) {
		if (newValue != this._path) {
			try {
				if (fs.existsSync(this._path)) fs.unlinkSync(this._path);
			} catch (e) {}

			this._path = newValue;
		}
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		} else {
			var new_path = path.join(getBaseLibraryPath(), this._rack.data.fsName, this._folder.data.fsName, this.document_filename) + this._ext;
			console.log(new_path);
			return new_path;
		}
	}

	get document_filename() {
		return this.title ? this.title.replace(/[^\w _-]/g, '').substr(0, 40) : '';
	}

	get body() {
		return this._body;
	}

	set body(newValue) {
		if (newValue != this._body) {
			this._body = newValue;
			this.updatedAt = moment();
		}
	}

	set folder(f) {
		if (!f) { return; }

		if (f.folderExists) {
			this._rack = f.data.rack;
			this._folder = f;
			this.folderUid = f.uid;
		}
	}

	isFolder(f) {
		return this.folderUid == f.uid;
	}

	isRack(r) {
		return this._folder.rackUid == r.uid;
	}

	loadBody() {
		if (this._loadedBody) return;

		if (fs.existsSync(this.path)) {
			var content = fs.readFileSync(this.path).toString();
			content = content.replace(/    /g, '\t');
			if (content && content != this._body) {
				this._body = content;
			}
			this._loadedBody = true;
		}
	}

	update(data) {
		super.update(data);

		this._body = data.body;
		this.folderUid = data.folderUid;
		this.updated_at = data.updated_at;
		this.created_at = data.created_at;
	}

	splitTitleFromBody() {
		var ret;
		var lines = this.body.split('\n');
		lines.forEach((row, index) => {
			if (ret) {return}
			if (row.length > 0) {
				ret = {
					title: _.trimLeft(row, '# '),
					body: lines.slice(0, index).concat(lines.splice(index + 1)).join('\n')
				};
			}
		});

		if (ret) {
			return ret;
		}

		return {
			title: '',
			body: this.body
		};
	}

	cleanPreviewBody(text) {
		text = text.replace(/^\n/, '');
		text = text.replace(/\* \[ \]/g, '* ');
		text = text.replace(/\* \[x\]/g, '* ');
		return text;
	}

	get bodyWithoutTitle() {
		if (this.body) {
			return this.cleanPreviewBody(this.splitTitleFromBody().body);
		} else {
			return '';
		}
	}

	get title() {
		if (this.body) {
			return this.splitTitleFromBody().title || this._name;
		} else {
			return this._name;
		}
	}

	get bodyWithDataURL() {
		return this.body.replace(
			/!\[(.*?)]\((pilemd:\/\/.*?)\)/mg, (match, p1, p2, offset, string) => {
				try {
					var dataURL = new Image(p2, path.basename(p2)).convertDataURL();
				} catch (e) {
					console.log(e);
					return match;
				}
				return '![' + p1 + ']' + '(' + dataURL + ')';
			}
		);
	}

	get img() {
		var matched = /(https?|pilemd):\/\/[-a-zA-Z0-9@:%_\+.~#?&//=]+?\.(png|jpeg|jpg|gif)/.exec(this.body);
		if (!matched) {
			return null
		} else {
			if (matched[1] == 'http' || matched[1] == 'https') {
				return matched[0]
			} else {
				try {
					var dataUrl = new Image(matched[0]).convertDataURL()
				} catch (e) {
					return null
				}
				return dataUrl
			}
		}
	}

	static latestUpdatedNote(notes) {
		return _.max(notes, function(n) { return n.updatedAt } );
	}

	static beforeNote(notes, note, property) {
		var sorted = arr.sortBy(notes, property);
		var before = sorted[sorted.indexOf(note)+1];
		if (!before) {
			// The note was latest one;
			return sorted.slice(-2)[0];
		} else {
			return before;
		}
	}

	static newEmptyNote(folder) {
		if(folder){
			return new Note({
				name: "NewNote",
				body: "",
				path: "",
				folder: folder,
				folderUid: folder.uid
			});
		} else {
			return false;
		}
	}

	static readNoteByFolder(folder) {
		//console.log(">> Loading notes");

		var valid_formats = [ '.md', '.markdown', '.txt' ];

		var valid_notes = [];
		if( fs.existsSync(folder.data.path) ) {

			var notes = fs.readdirSync(folder.data.path);
			for(var ni = 0; ni<notes.length; ni++){
				var note = notes[ni];
				var notePath = path.join( folder.data.path, note);
				if(fs.existsSync(notePath) && note.charAt(0) != ".") {
					var noteStat = fs.statSync(notePath);
					var noteExt = path.extname(note);
					if(noteStat.isFile() && valid_formats.indexOf(noteExt) >= 0 ){
						valid_notes.push(new Note({
							name: note,
							body: "",
							path: notePath,
							extension: noteExt,
							folder: folder,
							created_at: noteStat.birthtime,
							updated_at: noteStat.mtime
						}));
					} else if(noteStat.isFile() && noteExt == '.mdencrypted' ){
						valid_notes.push(new EncryptedNote({
							name: note,
							body: "",
							path: notePath,
							extension: noteExt,
							folder: folder,
							created_at: noteStat.birthtime,
							updated_at: noteStat.mtime
						}));
					}
				}
			}
		}

		return valid_notes;
	}

	static setModel(model) {
		if(!model){
			return { error: "No model" };
		}

		var body = model.data.body;
		if(model.isEncryptedNote){
			if(this._encrypted) return { error: "Encrypted" };
			body = model.encrypt();
		}

		var outer_folder = path.join( getBaseLibraryPath(), model.data.rack.data.fsName, model.data.folder.data.fsName );
		if(model.data.document_filename){
			var new_path = path.join(outer_folder, model.data.document_filename) + model.data.extension;

			if(new_path != model.data.path){
				var num = 1;
				while(num > 0){
					try{
						fs.statSync(new_path);
						if( body && body != fs.readFileSync(new_path).toString() ){
							new_path = path.join(outer_folder, model.data.document_filename)+num+model.data.extension;
						} else {
							new_path = null;
							break;
						}
					} catch(e){
						break; //path doesn't exist, I don't have to worry about overwriting something
					}
				}

				if(new_path && body.length > 0){
					fs.writeFileSync(new_path, body);
					model.path = new_path;
				}
			} else {
				try{
					//fs.accessSync(new_path, fs.constants.R_OK | fs.constants.W_OK );
					if( body.length > 0 && body != fs.readFileSync(new_path).toString() ){
						fs.writeFileSync(new_path, body);
					}
				} catch(e){
					console.log("Couldn't save the note. Permission Error");
					return { error: "Permission Error", path: new_path };
				}
			}
		}
	}

	static removeModelFromStorage(model) {
		if (!model) { return }
		if(fs.existsSync(model.data.path)) {
			fs.unlinkSync(model.data.path);
		}
	}
}

var encrypt = require('encryptjs');

class EncryptedNote extends Note {
	constructor(data) {
		super(data);

		this._ext = '.mdencrypted';
		this._encrypted = true;
		this._secretkey = null;
		this._descrypted_title = '';
	}

	get isEncrypted() {
		return this._encrypted;
	}

	get isEncryptedNote() {
		return true;
	}

	get title() {
		return this._descrypted_title || this._name;
	}

	get verifyString() {
		return 'sQhjzdTyiedGjqoCSbtft25da6W2zTpN22dH3wvKSzwxZNTfVV';
	}

	decrypt(secretkey) {
		if(!secretkey && !this._secretkey) return { error: 'Secret Key missing' };

		if(this._encrypted) {
			if(secretkey) this._secretkey = secretkey;
			if(this._body && this._body.length > 0) {
				var descrypted_body = encrypt.decrypt(this._body, this._secretkey, 256);
				if(descrypted_body.indexOf(this.verifyString) == 0) {
					descrypted_body = descrypted_body.replace(this.verifyString,'');
					this._body = descrypted_body;
					this._descrypted_title = this.splitTitleFromBody().title;
				} else {
					this._secretkey = null;
					return { error: 'Secret Key was not correct' };
				}
			}
			this._encrypted = false;
			return true;
		}

		return { error: 'Note was not encrypted' };
	}

	encrypt(secretkey) {
		if(this._encrypted) {
			return this._body;
		} else if(this._body && this._body.length > 0) {
			this._descrypted_title = this.splitTitleFromBody().title;
			if(secretkey) this._secretkey = secretkey;
			var encrypt_body = encrypt.encrypt(this.verifyString+this._body, this._secretkey, 256);
			return encrypt_body;
		} else {
			return '';
		}
	}

	static newEmptyNote(folder) {
		if(folder){
			return new EncryptedNote({
				name: "NewNote",
				body: "",
				path: "",
				folder: folder,
				folderUid: folder.uid
			});
		} else {
			return false;
		}
	}
}

class Folder extends Model {
	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';
		this.ordering = false;

		if(data.load_ordering && fs.existsSync(path.join(data.path, '.folder')) ){
			this.ordering = parseInt( fs.readFileSync( path.join(data.path, '.folder') ).toString() );
		}

		if(this.ordering === false || this.ordering === NaN){
			this.ordering = data.ordering || 0;
		}

		this.rackUid = data.rack ? data.rack.data.uid : null;
		this._rack = data.rack;
		this._path = data.path || '';
		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;
		this._contentLoaded = false;
		this.openNotes = false;
		this._notes = [];
	}

	remove(origNotes) {
		origNotes.forEach((note) => {
			if (note.data.folderUid && note.data.folderUid == this.uid) {
				Note.removeModelFromStorage(note);
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

	set path(newValue) {
		if(newValue != this._path){
			this._path = newValue;
		}
	}

	get folderExists() {
		return fs.existsSync(this._path);
	}

	set rack(r) {
		if (!r) { return; }

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

	readContents() {
		if(!this._contentLoaded){
			this._contentLoaded = true;
			return Note.readNoteByFolder(this);
		} else {
			return null;
		}
	}

	static readFoldersByRack(rack) {
		var valid_folders = [];
		if( fs.existsSync(rack.data.path) ) {
		
			var folders = fs.readdirSync(rack.data.path);
			for(var fi = 0; fi<folders.length; fi++){
				
				var folder = folders[fi];
				var folderPath = path.join(rack.data.path, folder);
				
				if(fs.existsSync(folderPath) && folder.charAt(0) != ".") {
					var folderStat = fs.statSync(folderPath);
					if(folderStat.isDirectory()){
						valid_folders.push( new Folder({
							name: folder,
							ordering: valid_folders.length,
							load_ordering: true,
							path: folderPath,
							rack: rack
						}) );
					}
				}
			}
		}
		return valid_folders;
	}

	static setModel(model) {
		if (!model || !model.data.name || !model.uid) { return }

		var new_path = path.join( getBaseLibraryPath(), model.data.rack.data.fsName, model.data.fsName );
		if(new_path != model.data.path || !fs.existsSync(new_path) ) {
			try{
				if(model.data.path && fs.existsSync(model.data.path)) {
					util_file.moveFolderRecursiveSync(model.data.path,
						path.join( getBaseLibraryPath(), model.data.rack.data.fsName ),model.data.fsName);

				} else {
					fs.mkdirSync(new_path);
				}
				model.path = new_path;
			} catch(e){
				return console.error(e);
			}
		}
		model.saveOrdering();
	}

	static removeModelFromStorage(model) {
		if (!model) { return }
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

	readContents() {
		return null;
	}

	remove() {
		arr.remove(this._rack.folders, (f) => {return f == this});
		this._rack.saveModel();
	}

	removeNote(note) {
		arr.remove(this.notes, (n) => {return n == note});
		this._rack.saveModel();
	}

	saveModel() {
		this._rack.saveModel();
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
			attributes: attributes || {},
			body: attributes['HREF'],
			folderUid: folder.uid,
			folder: folder,
			rack: folder._rack,
			updatedAt: today,
			createdAt: today,
			name: ''
		}
	}

	static updateNote(bookmark, name, url) {
		bookmark.name = name;
		bookmark.updatedAt = moment();
		bookmark.attributes['HREF'] = url;
		bookmark.attributes['LAST_MODIFIED'] = bookmark.updatedAt.format('X');
		if (bookmark.body != url) {
			bookmark.body = url;
			//refresh icon and screenshot
		}
	}
}

class Rack extends Model {

	constructor(data) {
		super(data);

		this.name = data.name.replace(/^\d+\. /, "") || '';

		this.ordering = false;

		if(data.load_ordering && fs.existsSync(path.join(data.path, '.rack')) ){
			this.ordering = parseInt( fs.readFileSync( path.join(data.path, '.rack') ).toString() );
		}

		if(this.ordering === false || this.ordering === NaN){
			this.ordering = data.ordering || 0;
		}

		this._path = data.path;
		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;
		this.openFolders = false;
		this._contentLoaded = false;

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

	set path(newValue) {
		if(newValue != this._path){
			this._path = newValue;
		}
	}

	get rackExists() {
		return fs.existsSync(this._path);
	}

	update(data) {
		super.update(data);
		this.name = data.name;
		this.ordering = data.ordering;
	}

	remove(origNotes, origFolders) {
		origFolders.forEach((folder) => {
			if (folder.rackUid == this.uid) {
				folder.remove(origNotes);
			}
		});
		this.removeFromStorage();
	}

	removeFromStorage() {
		if(fs.existsSync(this._path)) {
			if( fs.existsSync(path.join(this._path, '.rack')) ) fs.unlinkSync( path.join(this._path, '.rack') );
			fs.rmdirSync(this._path);
			this.uid = null;
		}
	}

	saveOrdering() {
		var rackConfigPath = path.join( this._path, '.rack');
		fs.writeFileSync(rackConfigPath, this.ordering);
	}

	readContents() {
		if(!this._contentLoaded){
			this._contentLoaded = true;
			this.folders = Folder.readFoldersByRack(this);
			return this.folders;
		} else {
			return null;
		}
	}

	saveModel() {
		var new_path = path.join( getBaseLibraryPath(), this.data.fsName );
		if(new_path != this._path || !fs.existsSync(new_path) ) {
			try{
				if(this._path && fs.existsSync(this._path)) {
					util_file.moveFolderRecursiveSync(this._path, getBaseLibraryPath(), this.data.fsName);
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


	static readRacks() {

		var valid_racks = [];
		if( fs.existsSync(getBaseLibraryPath()) ) {
			
			var racks = fs.readdirSync(getBaseLibraryPath());
			for(var ri = 0; ri<racks.length; ri++){
				
				var rack = racks[ri];
				var rackPath = path.join( getBaseLibraryPath(), rack);
				
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

			var separators = RackSeparator.readSeparators();
			if(separators) valid_racks = valid_racks.concat(separators);

			var bookmarks = BookmarkRack.readBookmarkRacks();
			if(bookmarks) valid_racks = valid_racks.concat(bookmarks);
		}

		return valid_racks;
	}
}

class RackSeparator extends Rack {

	constructor(data) {
		if(!data) data = { name: '' };
		data.load_ordering = false;
		data.path = null;
		super(data);
	}

	get data() {
		return _.assign(super.data, {
			separator: true
		});
	}

	get rackExists() {
		return false;
	}

	readContents() {
		return null;
	}

	remove() {
		libini.removeKey(getBaseLibraryPath(), ['separator', this.uid]);
	}

	saveModel() {
		/* load INI file and save new rack separator data */
		libini.writeKey(getBaseLibraryPath(), ['separator', this.uid], this.ordering );
	}

	static readRacks() {
		return this.readSeparators();
	}

	static readSeparators() {
		var valid_racks = [];
		if( fs.existsSync(getBaseLibraryPath()) ) {
			var racks = libini.readKeyAsArray( getBaseLibraryPath(), 'separator');
			for (var r = 0; r < racks.length; r++) {
				valid_racks.push(new RackSeparator({
					uid: racks[r].key,
					name: racks[r].key,
					ordering: racks[r].value
				}));
			}
		}
		return valid_racks;
	}
}

class BookmarkRack extends Rack {
	constructor(data) {
		data.load_ordering = false;
		super(data);
		this._ext = data.extension || '.html';
		this._contentLoaded = false;
		this._bookmarks = {};
		this.readContents();
	}

	get data() {
		return _.assign(super.data, {
			bookmarks: true,
		});
	}

	get extension() {
		return this._ext;
	}

	get folders() {
		return this._bookmarks.children || [];
	}

	set folders(farray) {
		console.log('BookmarkRack - folders:', farray);
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

	set path(newValue) {
		if (newValue != this._path) {
			try {
				if (fs.existsSync(this._path)) fs.unlinkSync(this._path);
			} catch (e) {}

			this._path = newValue;
		}
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		} else {
			var new_path = path.join(getBaseLibraryPath(), this.document_filename) + this._ext;
			return new_path;
		}
	}

	get document_filename() {
		return this.title ? this.title.replace(/[^\w _-]/g, '').substr(0, 40) : '';
	}

	readContents() {
		if(!this._contentLoaded){
			this._contentLoaded = true;
			
			var content = fs.readFileSync(this.path).toString();
			this._bookmarks = bookmarksConverter.parse(content, this);
			this._name = this._bookmarks.name;
			this.ordering = this._bookmarks.ordering || 0;

		} else {
			return null;
		}
	}

	remove() {
		if(fs.existsSync(this.path)) {
			fs.unlinkSync(this.path);
		}
	}

	removeNote(note) {
		for(var i=0; i<this._bookmarks.children.length; i++) {
			if (this._bookmarks.children[i].uid == note.folderUid) {
				this._bookmarks.children[i].removeNote(note);
				break;
			}
		}
	}

	saveModel() {
		var outer_folder = getBaseLibraryPath();
		this._bookmarks.ordering = this.ordering;
		this._bookmarks.name = this._name;
		var string_html = bookmarksConverter.stringify(this._bookmarks);
		
		if(this.document_filename){
			var new_path = path.join(outer_folder, this.document_filename) + this._ext;
			if(new_path != this.path){
				var num = 1;
				while(num > 0){
					try{
						fs.statSync(new_path);
						if( string_html != fs.readFileSync(new_path).toString() ){
							new_path = path.join(outer_folder, this.document_filename)+num+this.extension;
						} else {
							new_path = null;
							break;
						}
					} catch(e){
						break; //path doesn't exist, I don't have to worry about overwriting something
					}
				}

				if(new_path){
					fs.writeFileSync(new_path, string_html);
					this.path = new_path;
				}
			} else {
				try{
					//fs.accessSync(new_path, fs.constants.R_OK | fs.constants.W_OK );
					if( string_html != fs.readFileSync(new_path).toString() ){
						fs.writeFileSync(new_path, string_html);
					}
				} catch(e){
					console.log("Couldn't save the note. Permission Error");
					return { error: "Permission Error", path: new_path };
				}
			}
		}
	}

	/*static readRacks() {
		return this.readBookmarkRacks();
	}*/

	static readBookmarkRacks() {
		var valid_racks = [];
		if( fs.existsSync(getBaseLibraryPath()) ) {

			var racks = fs.readdirSync(getBaseLibraryPath());
			for(var ri = 0; ri<racks.length; ri++){
				var rack = racks[ri];
				var rackPath = path.join( getBaseLibraryPath(), rack);
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
	}
}

const CLASS_MAPPER = {
	notes: Note,
	encryptedNotes: EncryptedNote,
	folders: Folder,
	racks: Rack,
	rackSeparators: RackSeparator,
	bookmarkRacks: BookmarkRack,
	bookmarkFolders: BookmarkFolder
};

function makeWatcher(racks, folders, notes) {
	var arrayMapper = {
		racks: racks,
		folders: folders,
		notes: notes
	};
	var watcher = chokidar.watch([], {
		depth: 1,
		ignoreInitial: true
	});
	watcher.on('add', (path) => {
		var d = readDataFile(path);
		if (!d) {return}
		if (!arrayMapper[d.dataType].find(uidFinder(d.uid))) {
			arrayMapper[d.dataType].push(new CLASS_MAPPER[d.dataType](d.data));
		}
	});
	watcher.on('change', (path) => {
		var d = readDataFile(path);
		if (!d) {return}
		var target = arrayMapper[d.dataType].find(uidFinder(d.uid));
		if (target) {
			target.update(d.data);
		}
	});
	/*
	watcher.on('unlink', (path) => {
		var d = detectPath(path);
		if (!d) {return}
		arr.remove(arrayMapper[d.dataType], uidFinder(d.uid));
	});
	*/
	watcher.add(getBaseLibraryPath());
	return watcher;
}

class Image {

	constructor (pilemdURL, name) {
		if (!pilemdURL.startsWith('pilemd://.images/')) {
			throw "Incorrect Image URL"
		}
		this.pilemdURL = pilemdURL
		this.name = name
	}

	makeFilePath() {
		var p = this.pilemdURL.slice(9);
		var basePath = getBaseLibraryPath();
		if (!basePath || basePath.length == 0) throw "Invalid Base Path";
		//var relativePath = path.join('images', this.name);
		return path.join(getBaseLibraryPath(), p)
		//return new this('pilemd://' + relativePath, this.name);
	}

	convertDataURL() {
		return Datauri.sync(this.makeFilePath());
	}

	static appendSuffix(filePath) {
		var c = 'abcdefghijklmnopqrstuvwxyz';
		var r = '';
		for (var i = 0; i < 8; i++) {
			r += c[Math.floor(Math.random() * c.length)];
		}
		var e = path.extname(filePath);
		if (e.length > 0) {
			return filePath.slice(0, -e.length) + '_' + r + e
		} else {
			return filePath + '_' + r
		}
	}

	static fromClipboard(im){
		//create a name based on current date and save it.
		var d = new Date();
		var name = d.getFullYear().toString() + (d.getMonth()+1).toString()
			+ d.getDate().toString() + '_' + d.getHours().toString()
			+d.getMinutes().toString() + d.getSeconds().toString() + ".png";
	
		var dirPath = path.join(getBaseLibraryPath(), '.images');
		try {
			fs.mkdirSync(dirPath)
		} catch (e) {}
		var savePath = path.join(dirPath, name);
		// Check exists or not.
		try {
			var fd = fs.openSync(savePath, 'r');
			if (fd) {fs.close(fd)}
			name = this.appendSuffix(name);
			savePath = path.join(dirPath, name);
		} catch(e) {}  // If not exists
		fs.writeFileSync(savePath, im.toPNG());
		var relativePath = path.join('.images', name);
		console.log(name);
		return new this('pilemd://' + relativePath, name);
	}

	static fromBinary(name, frompath) {
		// Try creating images dir.
		var dirPath = path.join(getBaseLibraryPath(), '.images');
		try {fs.mkdirSync(dirPath)} catch (e) {}

		var savePath = path.join(dirPath, name);
		// Check exists or not.
		try {
			var fd = fs.openSync(savePath, 'r');
			if (fd) {fs.close(fd)}
			name = this.appendSuffix(name);
			savePath = path.join(dirPath, name);
		} catch(e) {}  // If not exists
		fs.writeFileSync(savePath, fs.readFileSync(frompath));
		var relativePath = path.join('.images', name);
		return new this('pilemd://' + relativePath);
	}
}


module.exports = {
	Note: Note,
	EncryptedNote: EncryptedNote,
	Folder: Folder,
	BookmarkFolder: BookmarkFolder,
	Rack: Rack,
	RackSeparator: RackSeparator,
	BookmarkRack: BookmarkRack,
	getBaseLibraryPath: getBaseLibraryPath,
	setBaseLibraryPath: setBaseLibraryPath,
	doesLibraryExists: doesLibraryExists,
	makeWatcher: makeWatcher,
	Image: Image
};
