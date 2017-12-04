var fs = require('fs');
var path = require('path');
var url = require('url');

const electron = require('electron');

/**
 * copy source file into the target directory.
 *
 * @param  {String}   source  The source
 * @param  {String}   target  The target
 * @return {Void} Function doesn't return anything
 */
function copyFileSync(source, target) {
	var targetFile = target;

	//if target is a directory a new file with the same name will be created
	if (fs.existsSync(target)) {
		if (fs.lstatSync(target).isDirectory()) {
			targetFile = path.join(target, path.basename(source));
		}
	}
	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

/**
 * move source file into the target directory.
 *
 * @param  {String}   source  The source
 * @param  {String}   target  The target
 * @return {Void} Function doesn't return anything
 */
function moveFileSync(source, target) {
	var targetFile = target;

	//if target is a directory a new file with the same name will be created
	if (fs.existsSync(target)) {
		if (fs.lstatSync(target).isDirectory()) {
			targetFile = path.join(target, path.basename(source));
		}
	}
	fs.renameSync(source, targetFile);
}

module.exports = {
	deleteFile(path) {
		if (path && fs.existsSync(path)) {
			if (!electron.shell.moveItemToTrash(path)) {
				fs.unlinkSync(path);
			}
		}
	},
	safeName(name) {
		return name.replace(/[/\\¥]/g, '-');
	},
	copyFolderRecursiveSync(source, target) {
		var files = [];

		if (!fs.existsSync(source)) {
			return;
		}

		//check if folder needs to be created or integrated
		var targetFolder = path.join(target, path.basename(source));
		if (!fs.existsSync(targetFolder)) {
			fs.mkdirSync(targetFolder);
		}

		if (fs.lstatSync(source).isDirectory()) {
			files = fs.readdirSync(source);
			files.forEach((file) => {
				var curSource = path.join(source, file);
				if (fs.lstatSync(curSource).isDirectory()) {
					this.copyFolderRecursiveSync(curSource, targetFolder);
				} else {
					copyFileSync(curSource, targetFolder);
				}
			});
		}
	},
	moveFolderRecursiveSync(source, target, new_name) {
		var files = [];

		if (!fs.existsSync(source)) {
			return;
		}

		//check if folder needs to be created or integrated
		var targetFolder = path.join(target, new_name ? new_name : path.basename(source));
		if (!fs.existsSync(targetFolder)) {
			fs.mkdirSync(targetFolder);
		}

		if (fs.lstatSync(source).isDirectory()) {
			files = fs.readdirSync(source);
			files.forEach((file) => {
				var curSource = path.join(source, file);
				if (fs.lstatSync(curSource).isDirectory()) {
					this.moveFolderRecursiveSync(curSource, targetFolder);
				} else {
					moveFileSync(curSource, targetFolder);
				}
			});
			fs.rmdirSync(source);
		}
	},
	getFileNameFromUrl(file_url) {
		return this.getFileDataFromUrl(file_url).basename;
	},
	getFileExtensionFromUrl(file_url) {
		return this.getFileDataFromUrl(file_url).extname;
	},
	getFileDataFromUrl(file_url) {
		var path_url = url.parse(file_url).pathname;
		return {
			basename: path.basename(path_url),
			extname: path.extname(path_url)
		};
	},
	downloadMultipleFiles(array_urls, target_folder) {
		array_urls.forEach((url) => {
			this.downloadFile(url, target_folder);
		});
	},
	downloadFile(source_url, target_folder, filename) {
		var http = require('http');
		var fs = require('fs');

		if (!filename) filename = this.getFileNameFromUrl(source_url);
		if (!target_folder || !filename) return;

		var file = path.join(target_folder, filename);
		http.get(source_url, function(res) {
			var imagedata = '';
			res.setEncoding('binary');
			res.on('data', function(chunk) {
				imagedata += chunk;
			});
			res.on('end', function() {
				fs.writeFile(file, imagedata, 'binary', function(err) {
					if (err) throw err;
					console.log('Downloaded', filename, 'to', target_folder);
				});
			});
		});
	}
};
