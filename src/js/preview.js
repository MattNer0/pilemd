/*
 * module to render HTML for preview
 */

const marked = require('marked');
const _ = require('lodash');
const highlightjs = require('highlight.js');

highlightjs.configure({
	useBR: true
});

var checkboxes = [];
var headings = [];
var headings_id = [];

const temp_CHECKBOX = _.template('<li class="checkbox <%- checked ? \'checkbox-checked\' : \'\' %>"><label>' +
	'<span><input data-value="<%- data %>" type="checkbox" <%- checked ? \'checked\' : \'\' %> /><span></span></span> <%= text %>' +
	'</label></li>');

const temp_IMGTAG = _.template('<a href="#" onclick="appVue.openImg(\'<%- link %>\'); return false">' +
	'<img src="<%- link %>" alt="<%- alt %>" />' +
	'</a>');

const temp_ATAG_TO_EXTERNAL = _.template('<a href="<%- href %>" title="<%- title %>" ' +
	'onclick="require(\'electron\').shell.openExternal(\'<%- href %>\'); ' +
	'return false;"' +
	'oncontextmenu="appVue.contextOnPreviewLink(event, \'<%- href %>\')">' +
	'<%= text %>' +
	'</a>');

const temp_ATAG_TO_INTERNAL = _.template('<a href="<%- href %>" title="<%- title %>"><%= text %></a>');

var renderer = new marked.Renderer();

renderer.listitem = function(text) {
	if (/^<p>\s*\[[x ]\]\s*/.test(text)) {
		text = text.replace(/<[/]{0,1}p>/g, '');
	}

	if (/^\s*\[[x ]\]\s*/.test(text)) {
		var clean_text = text.replace(/^\s*\[ \]\s*/, '').replace(/^\s*\[x\]\s*/, '');
		var escapedText = clean_text.toLowerCase().replace(/[^\w]+/g, '-');
		var duplicateIndex = checkboxes.map(function(h) {
			return h.text;
		}).indexOf(escapedText);
		var duplicateText;
		if (duplicateIndex === -1) {
			checkboxes.push({
				text: escapedText,
				count: 0
			});
		} else {
			checkboxes[duplicateIndex].count++;
			duplicateText = escapedText + '-' + checkboxes[duplicateIndex].count;
		}
		return temp_CHECKBOX({
			checked: (/^\s*\[x\]\s*/.test(text)),
			data: (duplicateText || escapedText),
			text: clean_text
		});
	}
	return '<li>' + text + '</li>';
};

renderer.image = function(href, title) {
	return temp_IMGTAG({
		link: href,
		alt: title || ''
	});
};

renderer.heading = function(text, level) {
	var escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
	var duplicateIndex = headings.map(function(h) {
		return h.text;
	}).indexOf(escapedText);
	var duplicateText;
	if (duplicateIndex === -1) {
		headings.push({
			text : escapedText,
			count: 0
		});
	} else {
		headings[duplicateIndex].count++;
		duplicateText = escapedText + '-' + headings[duplicateIndex].count;
	}
	headings_id.push({
		id   : 'h_' + (duplicateText || escapedText),
		text : text,
		level: level
	});
	return '<h' + level + ' id="h_' + (duplicateText || escapedText) + '">' + text + '</h' + level + '>';
};

renderer.link = function(href, title, text) {
	if (href.indexOf('http') == 0) {
		return temp_ATAG_TO_EXTERNAL({
			href: href,
			title: title,
			text: text
		});
	}
	return temp_ATAG_TO_INTERNAL({
		href: href,
		title: title,
		text: text
	});
};

function cleanHighlighted(value, lang) {
	value = value.replace(/\n/g, '<br/>');
	value = value.replace(/    /g, '&nbsp;&nbsp;&nbsp;&nbsp;');
	return value;
}

marked.setOptions({
	renderer   : renderer,
	gfm        : true,
	tables     : true,
	breaks     : true,
	pedantic   : false,
	sanitize   : true,
	smartLists : true,
	smartypants: false,
	highlight(code, lang) {
		return '<div class="hljs">' + cleanHighlighted(highlightjs.highlightAuto(code, [lang]).value, lang) + '</div>';
	}
});

var forEach = function(array, callback, scope) {
	for (var i = 0; i < array.length; i++) {
		callback.call(scope, i, array[i]);
	}
};

/**
 * @function clickCheckbox
 * @param  {Object} cm    CodeMirror component
 * @param  {Object} note  Note objct
 * @param  {Number} index Checkbox index
 * @param  {Object} el    DOM element object
 * @return {Void} Void
 */
function clickCheckbox(vue, note, index, el) {
	var cm = vue.$refs.refCodeMirror;
	el.onclick = function(event) {
		event.preventDefault();
		if (event.target.tagName == 'A') return;
		var i = 0;
		var ok = note.body.replace(/[*-]\s*(\[[x ]\])/g, function(x) {
			x = x.replace(/\s/g, ' ');
			var start = x.charAt(0);
			if (i == index) {
				i++;
				if (x == start + ' [x]') {
					return start + ' [ ]';
				}
				return start + ' [x]';
			}
			i++;
			return x;
		});
		note.body = ok;
		cm.refreshNoteBody();
		vue.updatePreview(true);
	};
}

module.exports = {
	/**
	 * @function render
	 * @param {Object} note Selected note
	 * @param {Object} vue  Vue Instance
	 * @return {String} Html version of note content
	 */
	render(note, vue) {
		headings = [];
		checkboxes = [];
		headings_id = [];
		var p = marked(note.bodyWithDataURL);
		vue.$nextTick(() => {
			forEach(document.querySelectorAll('li.checkbox'), (index, el) => {
				clickCheckbox(vue, note, index, el);
			});
		});
		return p;
	},
	getHeadings() {
		return headings_id;
	}
};
