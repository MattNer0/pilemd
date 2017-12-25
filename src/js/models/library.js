const fs = require('fs');
const path = require('path');

const elosenv = require('../utils/elosenv');

class Library {
	constructor (path) {
		if (path) {
			this._path = path;
		} else {
			this._path = '';
		}
	}

	get baseLibraryPath() {
		return this._path;
	}

	set baseLibraryPath(value) {
		this._path = value;
	}

	doesLibraryExists() {
		if (this._path) return fs.existsSync(this._path);
		return false;
	}

	initialLibrary() {
		var p = path.join(elosenv.workingDirectory(), 'library');
		try {
			fs.accessSync(p, fs.W_OK | fs.R_OK);
		} catch (e) {
			p = path.join(elosenv.homePath(), 'library');
		}
		try {
			if (!fs.existsSync(p)) fs.mkdirSync(p);
		} catch (e) {
			console.warn(e.message);
		}
		return p;
	}
}

module.exports = Library;
