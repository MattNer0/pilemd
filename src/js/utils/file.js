var fs = require('fs');
var path = require('path');

function safeName(name) {
	return name.replace(/[\/\\¥]/g, '-');
}

function copyFileSync( source, target ) {

	var targetFile = target;

	//if target is a directory a new file with the same name will be created
	if ( fs.existsSync( target ) ) {
		if ( fs.lstatSync( target ).isDirectory() ) {
			targetFile = path.join( target, path.basename( source ) );
		}
	}

	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source, target ) {
	var files = [];

	//check if folder needs to be created or integrated
	var targetFolder = path.join( target, path.basename( source ) );
	if ( !fs.existsSync( targetFolder ) ) {
		fs.mkdirSync( targetFolder );
	}

	//copy
	if ( fs.lstatSync( source ).isDirectory() ) {
		files = fs.readdirSync( source );
		files.forEach( function ( file ) {
			var curSource = path.join( source, file );
			if ( fs.lstatSync( curSource ).isDirectory() ) {
				copyFolderRecursiveSync( curSource, targetFolder );
			} else {
				copyFileSync( curSource, targetFolder );
			}
		} );
	}
}

// - move

function moveFileSync( source, target ) {

	var targetFile = target;

	//if target is a directory a new file with the same name will be created
	if ( fs.existsSync( target ) ) {
		if ( fs.lstatSync( target ).isDirectory() ) {
			targetFile = path.join( target, path.basename( source ) );
		}
	}

	fs.renameSync( source, targetFile);
}

function moveFolderRecursiveSync( source, target, new_name ) {
	var files = [];

	//check if folder needs to be created or integrated
	var targetFolder = path.join( target, new_name ? new_name : path.basename( source ) );
	if ( !fs.existsSync( targetFolder ) ) {
		fs.mkdirSync( targetFolder );
	}

	//copy
	if ( fs.lstatSync( source ).isDirectory() ) {
		files = fs.readdirSync( source );
		files.forEach( function ( file ) {
			var curSource = path.join( source, file );
			if ( fs.lstatSync( curSource ).isDirectory() ) {
				moveFolderRecursiveSync( curSource, targetFolder );
			} else {
				moveFileSync( curSource, targetFolder );
			}
		});
		fs.rmdirSync(source);
	}
}

module.exports = {
	safeName: safeName,
	copyFolderRecursiveSync: copyFolderRecursiveSync,
	moveFolderRecursiveSync: moveFolderRecursiveSync,
};
