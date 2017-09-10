var fs = require('fs');
var path = require('path');

/**
 * Copy source file into the target directory.
 *
 * @param      {String}   source  The source
 * @param      {String}   target  The target
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
 * Move source file into the target directory.
 *
 * @param      {String}   source  The source
 * @param      {String}   target  The target
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
	safeName(name) {
		return name.replace(/[\/\\¥]/g, '-');
	},
	copyFolderRecursiveSync(source, target) {
		var files = [];

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
	}
};
