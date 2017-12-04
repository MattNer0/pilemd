const fs = require('fs');

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
		if (this._path) {
			return fs.existsSync(this._path);
		}
		return false;
	}
}

module.exports = Library;
