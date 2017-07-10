const fs 		= require('fs');
const path 		= require('path');
const chokidar 	= require('chokidar');

const _ 		= require('lodash');
const moment 	= require('moment');
const Datauri 	= require('datauri');

const arr 		= require('./utils/arr');
const uid 		= require('./utils/uid');
const util_file = require('./utils/file');

const BASE_LIB_PATH_KEY = 'libpath';

var baseLibraryPath = '';

function setBaseLibraryPath(path) {
	baseLibraryPath = path;
	return baseLibraryPath;
	//return localStorage.setItem(BASE_LIB_PATH_KEY, path);
}

function getBaseLibraryPath() {
	return baseLibraryPath;
}

function doesLibraryExists() {
	return fs.existsSync( getBaseLibraryPath() );
}

class Model {
	constructor(data) {
		this.uid = data.uid || uid.timeUID();
	}

	get data() { return { uid: this.uid } }

	update(data) {
		this.uid = data.uid;
	}
}

Model.storagePrefix = 'models';

class Note extends Model {
	constructor(data) {
		super(data);

		this._ext = data.extension || ".md";
		
		var re = new RegExp("\\"+this._ext+"$");

		this._name = data.name.replace(re, '');
		this._body = data.body.replace(/    /g, '\t');
		this._path = data.path;
		this._rack = data.rack || data.folder.data.rack;
		this._folder = data.folder;

		this.folderUid = data.folder ? data.folder.data.uid : null;
		this.doc = null;

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
		})
	}

	get properties() {
		return {
			lineCount : ( this._body.match(/\n/g) || []).length,
			wordCount : this._body.replace(/\n/g," ").replace(/ +/g," ").split(" ").length,
			charCount : this._body.replace(/\W/g,"").length
		}
	}

	set path(newValue) {
		if(newValue != this._path){
			try{
				if(fs.existsSync(this._path)) fs.unlink(this._path);
			} catch(e){}

			this._path = newValue;
		}
	}

	get path() {
		if(this._path && fs.existsSync(this._path)){
			return this._path;
		} else {
			var new_path = path.join( getBaseLibraryPath(), this._rack.data.fsName, this._folder.data.fsName, this.document_filename)+this._ext;
			console.log(new_path);
			return new_path;
		}
	}

	get document_filename() {
		return this.title ? this.title.replace(/[^\w _-]/g, '').substr(0, 40) : "";
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
		if(!f){ return; }

		if(f.folderExists){
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
		if(fs.existsSync(this.path)){
			var content = fs.readFileSync(this.path).toString();
			content = content.replace(/    /g, '\t');
			if(content && content != this._body){
				this._body = content;
			}
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
					body: lines.slice(0, index).concat(lines.splice(index+1)).join('\n')
				};
			}
		});

		if(ret){
			return ret;
		}
		
		return {
			title: "",
			body: this.body
		}
	}

	cleanPreviewBody(text) {
		text = text.replace(/^\n/, "");
		text = text.replace(/\* \[ \]/g, "* ");
		text = text.replace(/\* \[x\]/g, "* ");
		return text;
	}

	get bodyWithoutTitle() {
		if(this.body){
			return this.cleanPreviewBody( this.splitTitleFromBody().body );
		} else {
			return "";
		}	
	}

	get title() {
		if(this.body){
			return this.splitTitleFromBody().title || this._name;
		} else {
			return this._name;
		}
	}

	get bodyWithDataURL() {
		return this.body.replace(
			/!\[(.*?)]\((pilemd:\/\/.*?)\)/mg, (match, p1, p2, offset, string) => {
				try {
					var dataURL = new Image(p2, path.basename(p2) ).convertDataURL();
				} catch (e) {
					console.log(e);
					return match
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
							body: "", //fs.readFileSync(notePath).toString(),
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

		var outer_folder = path.join( getBaseLibraryPath(), model.data.rack.data.fsName, model.data.folder.data.fsName );
		if(model.data.document_filename){
			var new_path = path.join(outer_folder, model.data.document_filename) + model.data.extension;

			if(new_path != model.data.path){
				var num = 1;
				while(num > 0){
					try{
						fs.statSync(new_path);
						if( model.data.body && model.data.body != fs.readFileSync(new_path).toString() ){
							new_path = path.join(outer_folder, model.data.document_filename)+num+model.data.extension;
						} else {
							new_path = null;
							break;
						}
					} catch(e){
						break; //path doesn't exist, I don't have to worry about overwriting something
					}
				}

				if(new_path && model.data.body.length > 0){
					fs.writeFileSync(new_path, model.data.body);
					model.path = new_path;
				}
			} else {
				try{
					//fs.accessSync(new_path, fs.constants.R_OK | fs.constants.W_OK );
					if( model.data.body.length > 0 && model.data.body != fs.readFileSync(new_path).toString() ){
						fs.writeFileSync(new_path, model.data.body);
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
			fs.unlink(model.data.path);
		}
	}
}
Note.storagePrefix = 'notes';


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
		//console.log(">> Loading folders");
		
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
			if( fs.existsSync(path.join(model.data.path, '.folder')) ) fs.unlink( path.join(model.data.path, '.folder') );
			fs.rmdirSync(model.data.path);
			model.uid = null;
		}
	}
}
Folder.storagePrefix = 'folders';


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
		Rack.removeModelFromStorage(this);
	}

	saveOrdering() {
		var rackConfigPath = path.join( this._path, '.rack');
		fs.writeFileSync(rackConfigPath, this.ordering);
	}

	readContents() {
		if(!this._contentLoaded){
			this._contentLoaded = true;
			return Folder.readFoldersByRack(this);
		} else {
			return null;
		}
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
		}

		return valid_racks;
	}

	static setModel(model) {
		if (!model || !model.data.name) { return }

		var new_path = path.join( getBaseLibraryPath(), model.data.fsName );
		if(new_path != model.data.path || !fs.existsSync(new_path) ) {
			try{
				if(model.data.path && fs.existsSync(model.data.path)) {
					util_file.moveFolderRecursiveSync(model.data.path, getBaseLibraryPath(), model.data.fsName);
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
}
Rack.storagePrefix = 'racks';


const CLASS_MAPPER = {
	notes: Note,
	folders: Folder,
	racks: Rack
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
	Folder: Folder,
	Rack: Rack,
	getBaseLibraryPath: getBaseLibraryPath,
	setBaseLibraryPath: setBaseLibraryPath,
	doesLibraryExists: doesLibraryExists,
	makeWatcher: makeWatcher,
	Image: Image
};
