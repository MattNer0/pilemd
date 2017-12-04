const fs = require('fs');
const path = require('path');

const encrypt = require('encryptjs');

const moment = require('moment');
const _ = require('lodash');

const arr = require('../utils/arr');
const util_file = require('../utils/file');

const Model = require('./baseModel');

var Library;

/**
 * @function getValidMarkdownFormats
 * @return {Array} Array of valid formats
 */
function getValidMarkdownFormats() {
	return ['.md', '.markdown', '.txt', '.mdencrypted'];
}

class Note extends Model {
	constructor(data) {
		super(data);

		this._ext = data.extension || '.md';

		var re = new RegExp('\\' + this._ext + '$');

		this._name = data.name.replace(re, '');
		this._body = data.body.replace(/ {4}/g, '\t');
		this._path = data.path;
		if (data.folder || data.rack) {
			this._rack = data.rack || data.folder.data.rack;
		} else {
			this._rack = null;
		}
		this._folder = data.folder;
		this.folderUid = data.folder ? data.folder.data.uid : null;
		this.doc = null;

		if (this._body == '') {
			this._loadedBody = false;
		} else {
			this._loadedBody = true;
		}

		this._removed = false;
		this._metadata = {};
		this.dragHover = false;
		this.sortUpper = false;
		this.sortLower = false;
	}

	get updatedAt() {
		return moment(this._metadata.updatedAt);
	}

	set updatedAt(value) {
		this.setMetadata('updatedAt', value);
	}

	get createdAt() {
		return moment(this._metadata.createdAt);
	}

	set createdAt(value) {
		this.setMetadata('createdAt', value);
	}

	get data() {
		return _.assign(super.data, {
			body: this._body,
			path: this._path,
			extension: this._ext,
			document_filename: this.document_filename,
			folderUid: this.folderUid,
			rack: this._rack,
			folder: this._folder
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

	get metadataregex() {
		return /^((\+\+\++\n)|([a-z]+)\s?[:=]\s+[`'"]?([\w\W\s]+?)[`'"]?\s*\n(?=(\w+\s?[:=])|\n|(\+\+\++\n)?))\n*/gmiy;
	}

	get metadata() {
		return this._metadata;
	}

	get metadataKeys() {
		return Object.keys(this._metadata);
	}

	set metadata(newValue) {
		this._metadata = newValue;
		var str = '+++\n';
		Object.keys(newValue).forEach((key) => {
			if (newValue[key]) str += key + ' = "' + newValue[key] + '"\n';
		});
		this._body = str + '+++\n\n' + this.bodyWithoutMetadata;
	}

	set path(newValue) {
		if (!this._path || newValue != this._path) {
			try {
				util_file.deleteFile(this._path);
			} catch (e) {
				console.error(e);
			}

			var imageFolderPath = this.imagePath;

			// what if new folder already exists?
			if (imageFolderPath && imageFolderPath.length > 1 && fs.existsSync(imageFolderPath)) {
				util_file.moveFolderRecursiveSync(
					imageFolderPath,
					path.dirname(newValue),
					'.' + path.basename(newValue, path.extname(newValue))
				);
			}

			this._path = newValue;
		}
	}

	get path() {
		if (this._path && fs.existsSync(this._path)) {
			return this._path;
		}
		var new_path = path.join(
			Library.baseLibraryPath,
			this._rack.data.fsName,
			this._folder.data.fsName,
			this.document_filename
		) + this._ext;
		return new_path;
	}

	get imagePath() {
		if (this._path) {
			return path.join(path.dirname(this._path), '.' + path.basename(this._path, path.extname(this._path)));
		}
		return '';
	}

	get relativePath() {
		return this.path.replace(Library.baseLibraryPath+'/', '');
	}

	get document_filename() {
		return this.title ? this.title.replace(/[^\w _-]/g, '').substr(0, 40) : '';
	}

	get body() {
		return this._body;
	}

	set body(newValue) {
		if (newValue != this._body) {
			if (!this._metadata.createdAt) this._metadata.createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
			this._metadata.updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
			this._body = newValue;
		}
	}

	get bodyWithoutMetadata() {
		return this._body.replace(this.metadataregex, '').replace(/^\n+/, '');
	}

	set folder(f) {
		if (!f) {
			return;
		}

		if (f.folderExists) {
			this._rack = f.data.rack;
			this._folder = f;
			this.folderUid = f.uid;
		}
	}

	get bodyWithoutTitle() {
		if (this.body) {
			return this.cleanPreviewBody(this.splitTitleFromBody().body);
		}
		return '';
	}

	get title() {
		if (this.body) {
			return this.splitTitleFromBody().title || this._name;
		}
		return this._name;
	}

	get bodyWithDataURL() {
		var body = this.body;
		body = body.replace(
			/!\[(.*?)]\((pilemd:\/\/.*?)\)/mg,
			(match, p1, p2) => {
				var dataURL;
				try {
					dataURL = new Image(p2, path.basename(p2), this).convertDataURL();
				} catch (e) {
					console.warn(e);
					return match;
				}
				return '![' + p1 + '](' + dataURL + ')';
			}
		);

		body = body.replace(
			/^\[(\d+)]:\s(pilemd:\/\/.*?)$/mg,
			(match, p1, p2) => {
				var dataURL;
				try {
					dataURL = new Image(p2, path.basename(p2), this).convertDataURL();
				} catch (e) {
					console.warn(e);
					return match;
				}
				return '[' + p1 + ']: ' + dataURL;
			}
		);

		return body;
	}

	get bodyWithMetadata() {
		if (this._body) {
			var str = '+++\n';
			Object.keys(this._metadata).forEach((key) => {
				if (this._metadata[key]) str += key + ' = "' + this._metadata[key] + '"\n';
			});
			return str + '+++\n\n' + this._body;
		}
		return '';
	}

	get img() {
		var matched = (/(https?|pilemd):\/\/[-a-zA-Z0-9@:%_+.~#?&//=]+?\.(png|jpeg|jpg|gif)/).exec(this.body);
		if (!matched) {
			return null;
		} else if (matched[1] == 'http' || matched[1] == 'https') {
			return matched[0];
		}
		var dataUrl;
		try {
			dataUrl = new Image(matched[0], path.basename(matched[0]), this).convertDataURL();
		} catch (e) {
			dataUrl = null;
		}
		return dataUrl;
	}

	downloadImages() {
		var createdDir = false;
		var imageFormats = ['.png', '.jpg', '.gif', '.bmp'];

		var urlDownloads = [];

		this.body = this.body.replace(
			/!\[(.*?)]\((https?:\/\/.*?)\)/img,
			(match, p1, p2) => {
				var file_data = util_file.getFileDataFromUrl(p2);
				if (file_data.extname && imageFormats.indexOf(file_data.extname) >= 0) {
					if (!createdDir) {
						try {
							fs.mkdirSync(this.imagePath);
						} catch (e) {
							// directory exists
						}
						createdDir = true;
					}
					try {
						if (urlDownloads.indexOf(p2) == -1) urlDownloads.push(p2);
					} catch (e) {
						console.warn(e);
						return match;
					}

					return '![' + p1 + '](pilemd://' + file_data.basename + ')';
				}
				return match;
			}
		);

		this.body = this.body.replace(
			/^\[(\d+)\]:\s(https?:\/\/.*?$)/img,
			(match, p1, p2) => {
				var file_data = util_file.getFileDataFromUrl(p2);
				if (file_data.extname && imageFormats.indexOf(file_data.extname) >= 0) {
					if (!createdDir) {
						try {
							fs.mkdirSync(this.imagePath);
						} catch (e) {
							// directory exists
						}
						createdDir = true;
					}
					try {
						if (urlDownloads.indexOf(p2) == -1) urlDownloads.push(p2);
					} catch (e) {
						console.warn(e);
						return match;
					}

					return '[' + p1 + ']: pilemd://' + file_data.basename;
				}
				return match;
			}
		);

		if (urlDownloads.length > 0) util_file.downloadMultipleFiles(urlDownloads, this.imagePath);
	}

	setMetadata(key, value) {
		if (key) this._metadata[key] = value;
	}

	isFolder(f) {
		return this.folderUid == f.uid;
	}

	isRack(r) {
		return this._folder.rackUid == r.uid;
	}

	parseMetadata() {
		var re = this.metadataregex;
		var metadata = {};
		var m;

		/**
		 * @function cleanMatch
		 * @param  {type} m {description}
		 * @return {type} {description}
		 */
		function cleanMatch(m) {
			if (!m) return m;
			var newM = [];
			for (var i = 1; i < m.length; i++) {
				if(m[i]) {
					newM.push(m[i]);
				}
			}
			return newM;
		}

		var first_meta = this._body.match(re);
		if (first_meta && this._body.indexOf(first_meta[0]) == 0) {
			do {
				m = re.exec(this._body);
				m = cleanMatch(m);
				if (m && m[1].match(/^\+\+\++/)) {
					// +++
				} else if (m) {
					m[2] = m[2].replace(/\s+/g,' ');
					if (m[1] === 'updatedAt' || m[1] === 'createdAt') {
						metadata[m[1]] = moment(m[2]).format('YYYY-MM-DD HH:mm:ss');
					} else {
						metadata[m[1]] = m[2];
					}
				}
			} while (m);
			this._metadata = metadata;
			this._body = this.bodyWithoutMetadata;
		}

		if(!this._metadata.createdAt) {
			this.initializeCreationDate();
		}
	}

	loadBody() {
		if (this._loadedBody) return;

		if (fs.existsSync(this.path)) {
			var content = fs.readFileSync(this.path).toString();
			content = content.replace(/ {4}/g, '\t');
			if (content && content != this._body) {
				this._body = content;

				if (!this.isEncryptedNote) {
					this.parseMetadata();
					this.downloadImages();
				}
			}
			this._loadedBody = true;
		}
	}

	initializeCreationDate() {
		var noteData = Note.isValidNotePath(this._path);
		if (noteData) {
			if(!this._metadata.createdAt) {
				this._metadata.createdAt = moment(noteData.stat.birthtime).format('YYYY-MM-DD HH:mm:ss');
			}
			if(!this._metadata.updatedAt) {
				this._metadata.updatedAt = moment(noteData.stat.mtime).format('YYYY-MM-DD HH:mm:ss');
			}
		}
	}

	update(data) {
		super.update(data);

		this._body = data.body;
		this.folderUid = data.folderUid;
	}

	splitTitleFromBody() {
		var ret;
		var lines = this.bodyWithoutMetadata.split('\n');
		lines.forEach((row, index) => {
			if (ret) {
				return;
			}
			if (row.length > 0) {
				ret = {
					title: _.trimStart(row, '# '),
					meta: this.metadata,
					body: lines.slice(0, index).concat(lines.splice(index + 1)).join('\n')
				};
			}
		});

		if (ret) return ret;

		return {
			title: '',
			meta: this.metadata,
			body: this.body
		};
	}

	cleanPreviewBody(text) {
		text = text.replace(/^\n/, '');
		text = text.replace(/\* \[ \]/g, '* ');
		text = text.replace(/\* \[x\]/g, '* ');
		return text;
	}

	saveModel() {
		if(this._removed) return;

		var body = this.bodyWithMetadata;
		if (this.isEncryptedNote) {
			if (this._encrypted) return { error: "Encrypted" };
			body = this.encrypt();
		}

		var outer_folder;
		if (this._rack && this._folder) {
			outer_folder = path.join( Library.baseLibraryPath, this._rack.data.fsName, this._folder.data.fsName );
		} else {
			outer_folder = path.dirname(this._path);
		}

		if (body.length == 0) {
			return { saved: true };
		}

		if (this.document_filename) {
			var new_path = path.join(outer_folder, this.document_filename) + this._ext;

			if (new_path != this._path) {
				var num = 1;
				while (num > 0) {
					if (fs.existsSync(new_path)) {
						if (body && body != fs.readFileSync(new_path).toString()) {
							new_path = path.join(outer_folder, this.document_filename)+num+this._ext;
						} else {
							new_path = null;
							break;
						}
						num++;
					} else {
						break;
					}
				}

				if (new_path) {
					console.log(new_path, body);
					fs.writeFileSync(new_path, body);
					this.path = new_path;
					return { saved: true };
				}
				return { saved: false };
			}

			try {
				//fs.accessSync(new_path, fs.constants.R_OK | fs.constants.W_OK );
				if (!fs.existsSync(new_path) || (body.length > 0 && body != fs.readFileSync(new_path).toString())) {
					fs.writeFileSync(new_path, body);
					this.path = new_path;
					return { saved: true };
				}
				return { saved: false };
			} catch(e) {
				console.warn("Couldn't save the note. Permission Error");
				return {
					error: "Permission Error",
					path: new_path
				};
			}
		}
	}

	remove() {
		util_file.deleteFile(this._path);
		this._removed = true;
	}

	static latestUpdatedNote(notes) {
		return _.max(notes, function(n) {
			return n.updatedAt;
		});
	}

	static beforeNote(notes, note, property) {
		var sorted = arr.sortBy(notes, property);
		var before = sorted[sorted.indexOf(note)+1];
		if (!before) {
			// the note was latest one;
			return sorted.slice(-2)[0];
		}
		return before;
	}

	static newEmptyNote(folder) {
		if (folder) {
			return new Note({
				name: "NewNote",
				body: "",
				path: "",
				folder: folder,
				folderUid: folder.uid
			});
		}
		return false;
	}

	static isValidNotePath(notePath) {
		var valid_formats = getValidMarkdownFormats();
		var noteStat = fs.statSync(notePath);
		var noteExt = path.extname(notePath);
		if (noteStat.isFile() && valid_formats.indexOf(noteExt) >= 0 ) {
			return {
				ext: noteExt,
				stat: noteStat
			};
		}
		return false;
	}

	/**
	 * loads every note inside a folder.
	 *
	 * @param      {Object}  folder  The folder
	 * @return     {Array}           Array of notes inside the folder
	 */
	static readNoteByFolder(folder) {
		if(!fs.existsSync(folder.data.path)) return [];

		var valid_notes = [];
		var notes = fs.readdirSync(folder.data.path);
		notes.forEach((note) => {
			var notePath = path.join( folder.data.path, note);
			if(fs.existsSync(notePath) && note.charAt(0) != ".") {
				var noteData = this.isValidNotePath(notePath);
				if (noteData) {
					//note encrypted
					if(noteData.ext == '.mdencrypted' ) {
						valid_notes.push(new EncryptedNote({
							name: note,
							body: "",
							path: notePath,
							extension: noteData.ext,
							folder: folder
						}));
					} else {
						valid_notes.push(new Note({
							name: note,
							body: "",
							path: notePath,
							extension: noteData.ext,
							folder: folder
						}));
					}
				}
			}
		});
		return valid_notes;
	}
}

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
		}
		return '';
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
		}
		return false;
	}
}

module.exports = function(library) {
	Library = library;
	return {
		Note         : Note,
		EncryptedNote: EncryptedNote
	};
};
