const fs = require('fs');
const path = require('path');

const util_file = require('../utils/file');
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

	static moveLibrary(source, target) {
		if (fs.existsSync(target) && fs.lstatSync(target).isDirectory()) {
			var files = fs.readdirSync(target);
			if (files.length > 0) return false;
		}

		util_file.moveFolderRecursiveSync(
			source,
			path.dirname(target),
			path.basename(target)
		);
		return true;
	}
}

module.exports = Library;
