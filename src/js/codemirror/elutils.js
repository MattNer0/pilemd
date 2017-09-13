const electron = require('electron');
const clipboard = electron.clipboard;
const _ = require('lodash');
const Image = require('../models').Image;
const IMAGE_TAG_TEMP = _.template('![<%- filename %>](<%- fileurl %>)\n');

function flashSelection(cm) {
	cm.setExtending(false);
	cm.setCursor(cm.getCursor());
}

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

/**
 * Copies the current selected text into clipboard.
 *
 * @param  {Object}  cm  The CodeMirror instance
 */
function copyText(cm) {
	var text = cm.getSelection();
	if (text.length > 0) {
		clipboard.writeText(text);
	}
}

/**
 * Cuts the current selected text into clipboard.
 *
 * @param  {Object}  cm  The CodeMirror instance
 */
function cutText(cm) {
	var text = cm.getSelection();
	if (text.length > 0) {
		clipboard.writeText(text);
		cm.replaceSelection('');
	}
}

/**
 * Handles pasting text into the editor
 *
 * @param  {Object}  cm  The CodeMirror instance
 */
function pasteText(cm) {
	if (clipboard.availableFormats().indexOf('image/png') != -1 || clipboard.availableFormats().indexOf('image/jpg') != -1) {
		var im = clipboard.readImage();
		var image = Image.fromClipboard(im);
		cm.doc.replaceRange(
			IMAGE_TAG_TEMP({filename: image.name, fileurl: image.pilemdURL}),
			cm.doc.getCursor()
		);
	} else {
		var pasted = clipboard.readText();
		if (pasted.indexOf('http') == 0) {
			pasted = pasted.replace(new RegExp('(\.jpg|\.png)[?&].*$'), '$1');
		}
		if (isImage(pasted)) {
			var f = {name: pasted.split('/').pop(), path: pasted};
			if (!uploadFile(cm, f)) cm.replaceSelection(pasted);
		} else if (isCheckbox(pasted)) {
			var c = cm.getCursor();
			var thisLine = cm.getLine(c.line);
			if (isCheckbox(thisLine)) {
				cm.replaceSelection(pasted.replace(/^\* \[[x ]\] /g, ''));
			} else {
				cm.replaceSelection(pasted);
			}
		} else {
			cm.replaceSelection(pasted);
		}
	}
}

/**
 * Check if the string contains an image url.
 * Only cares about '.png' and '.jpg' extensions
 *
 * @param   {String}   text  The string
 * @return  {Boolean}        True if string contains image
 */
function isImage(text) {
	return text.split('.').pop() === 'png' || text.split('.').pop() === 'jpg';
}

/**
 * Check if the string contains a markdown checkbox
 *
 * @param   {String}   text  The string
 * @return  {Boolean}        True if string contains checkbox
 */
function isCheckbox(text) {
	return text.match(/^\* \[[x ]\] .*/g);
}

/**
 * Upload image file into library directory.
 *
 * @param   {Object}   cm    The CodeMirror instance
 * @param   {Object}   file  The file to upload
 * @return  {Boolean}        True if file was uploaded correctly, False otherwise
 */
function uploadFile(cm, file) {
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

/**
 * Select all text in the editor.
 *
 * @param  {Object}  cm  The CodeMirror instance
 */
function selectAllText(cm) {
	cm.execCommand('selectAll');
}

module.exports = {
	killLine: killLine,
	copyText: copyText,
	cutText: cutText,
	pasteText: pasteText,
	selectAllText: selectAllText
};
