const fs = require('fs');
const path = require('path');

const Datauri = require('datauri');

var Library;

class Image {
	constructor (pilemdURL, name, note) {
		if (!pilemdURL.startsWith('pilemd://')) {
			throw "Incorrect Image URL";
		}

		this.pilemdURL = pilemdURL;
		this.name = name;
		this._note = note;
	}

	makeFilePath() {
		// remove pilemd
		var p = this.pilemdURL.replace(/^pilemd:\/\//i,'');
		if(p.indexOf('.images/') == 0) {
			return path.join(Library.baseLibraryPath, p);
		}

		var basePath = this._note.imagePath;
		if (!basePath || basePath.length == 0) throw "Invalid Base Path";
		return path.join(basePath, p);
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
			return filePath.slice(0, -e.length) + '_' + r + e;
		}
		return filePath + '_' + r;
	}

	static fromClipboard(im, note) {
		var dirPath = path.join(Library.baseLibraryPath, '.images');
		if (note) {
			dirPath = note.imagePath;
		}
		//create a name based on current date and save it.
		var d = new Date();
		var name = d.getFullYear().toString() + (d.getMonth()+1).toString() +
			d.getDate().toString() + '_' + d.getHours().toString() +
			d.getMinutes().toString() + d.getSeconds().toString() + ".png";

		try {
			fs.mkdirSync(dirPath);
		} catch (e) {
			// can't make dir
		}
		var savePath = path.join(dirPath, name);
		// check exists or not.
		try {
			var fd = fs.openSync(savePath, 'r');
			if (fd) {
				fs.close(fd);
			}
			name = this.appendSuffix(name);
			savePath = path.join(dirPath, name);
		} catch(e) {
			// if not exists
		}
		fs.writeFileSync(savePath, im.toPNG());
		return new this('pilemd://' + name, name);
	}

	static fromBinary(name, frompath, note) {
		var dirPath = path.join(Library.baseLibraryPath, '.images');
		if (note) {
			dirPath = note.imagePath;
		}
		// try creating images dir.
		try {
			fs.mkdirSync(dirPath);
		} catch (e) {
			// can't make dir
		}
		var savePath = path.join(dirPath, name);
		// check exists or not.
		try {
			var fd = fs.openSync(savePath, 'r');
			if (fd) {
				fs.close(fd);
			}
			name = this.appendSuffix(name);
			savePath = path.join(dirPath, name);
		} catch(e) {
			// if not exists
		}
		fs.writeFileSync(savePath, fs.readFileSync(frompath));
		return new this('pilemd://' + name, name);
	}
}

module.exports = function(library) {
	Library = library;
	return Image;
};
