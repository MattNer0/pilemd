const electron = require('electron');
const clipboard = electron.clipboard;
const _ = require('lodash');
const Image = require('../models').Image;
const IMAGE_TAG_TEMP = _.template('![<%- filename %>](<%- fileurl %>)\n');

function flashSelection(cm) {
	cm.setExtending(false);
	cm.setCursor(cm.getCursor());
}


/* Electron things */
function killLine(cm) {
	flashSelection(cm);
	var c = cm.getCursor();
	var thisLine = cm.getRange(c, {line: c.line + 1, ch: 0});
	if (thisLine == '\n') {
		clipboard.writeText('\n');
		cm.replaceRange('', c, {line: c.line + 1, ch: 0});
	} else {
		clipboard.writeText(cm.getRange(c, {line: c.line}));
		cm.replaceRange('', c, {line: c.line});
	}
}

function copyText(cm) {
	var text = cm.getSelection();
	if (text.length > 0) {
		clipboard.writeText(text);
	}
}

function cutText(cm) {
	var text = cm.getSelection();
	if (text.length > 0) {
		clipboard.writeText(text);
		cm.replaceSelection('');
	}
}

function pasteText(cm) {
	if(clipboard.availableFormats().indexOf('image/png') != -1 || clipboard.availableFormats().indexOf('image/jpg') != -1){
 		var im = clipboard.readImage();
 		var image = Image.fromClipboard(im);
 		cm.doc.replaceRange(
 			IMAGE_TAG_TEMP({filename: image.name, fileurl: image.pilemdURL}),
 			cm.doc.getCursor()
 		);
 	} else {
 		var pasted = clipboard.readText();
		if(pasted.indexOf('http') == 0) {
			pasted = pasted.replace(new RegExp('(\.jpg|\.png)[?&].*$'), '$1');
		}
		if(isImage(pasted)){
 			var f = {name: pasted.split('/').pop(), path: pasted};
 			if(!uploadFile(cm, f)) cm.replaceSelection(pasted);
 		} else {
 			cm.replaceSelection(pasted);
 		}
 	}
}

function isImage(text){
	return text.split('.').pop() === 'png' || text.split('.').pop() === 'jpg';
}

function uploadFile(cm, file){
 	try {
		var image = Image.fromBinary(file.name, file.path);
 	} catch (err) {
		console.warn('uploadFile', err);
 		return false;
 	}

	cm.doc.replaceRange(
		IMAGE_TAG_TEMP({filename: file.name, fileurl: image.pilemdURL}),
		cm.doc.getCursor()
	);
	return true;
}

module.exports = {
	killLine: killLine,
	copyText: copyText,
	cutText: cutText,
	pasteText: pasteText
};
