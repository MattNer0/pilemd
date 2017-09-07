/**
 * Module to render HTML for preview
 */

const marked = require('marked');
const _ = require('lodash');
const highlightjs = require('highlight.js/lib/highlight');

const Image = require('./models').Image;

var checkbox_occurrance_dictionary = {};

highlightjs.registerLanguage('accesslog', require('highlight.js/lib/languages/accesslog'));
highlightjs.registerLanguage('actionscript', require('highlight.js/lib/languages/actionscript'));
highlightjs.registerLanguage('apache', require('highlight.js/lib/languages/apache'));
highlightjs.registerLanguage('applescript', require('highlight.js/lib/languages/applescript'));
highlightjs.registerLanguage('arduino', require('highlight.js/lib/languages/arduino'));
highlightjs.registerLanguage('xml', require('highlight.js/lib/languages/xml'));
highlightjs.registerLanguage('asciidoc', require('highlight.js/lib/languages/asciidoc'));
highlightjs.registerLanguage('autohotkey', require('highlight.js/lib/languages/autohotkey'));
highlightjs.registerLanguage('bash', require('highlight.js/lib/languages/bash'));
highlightjs.registerLanguage('basic', require('highlight.js/lib/languages/basic'));
highlightjs.registerLanguage('brainfuck', require('highlight.js/lib/languages/brainfuck'));
highlightjs.registerLanguage('clojure', require('highlight.js/lib/languages/clojure'));
highlightjs.registerLanguage('clojure-repl', require('highlight.js/lib/languages/clojure-repl'));
highlightjs.registerLanguage('cmake', require('highlight.js/lib/languages/cmake'));
highlightjs.registerLanguage('coffeescript', require('highlight.js/lib/languages/coffeescript'));
highlightjs.registerLanguage('cos', require('highlight.js/lib/languages/cos'));
highlightjs.registerLanguage('cpp', require('highlight.js/lib/languages/cpp'));
highlightjs.registerLanguage('cs', require('highlight.js/lib/languages/cs'));
highlightjs.registerLanguage('csp', require('highlight.js/lib/languages/csp'));
highlightjs.registerLanguage('css', require('highlight.js/lib/languages/css'));
highlightjs.registerLanguage('d', require('highlight.js/lib/languages/d'));
highlightjs.registerLanguage('markdown', require('highlight.js/lib/languages/markdown'));
highlightjs.registerLanguage('delphi', require('highlight.js/lib/languages/delphi'));
highlightjs.registerLanguage('diff', require('highlight.js/lib/languages/diff'));
highlightjs.registerLanguage('django', require('highlight.js/lib/languages/django'));
highlightjs.registerLanguage('dns', require('highlight.js/lib/languages/dns'));
highlightjs.registerLanguage('dockerfile', require('highlight.js/lib/languages/dockerfile'));
highlightjs.registerLanguage('dos', require('highlight.js/lib/languages/dos'));
highlightjs.registerLanguage('elixir', require('highlight.js/lib/languages/elixir'));
highlightjs.registerLanguage('ruby', require('highlight.js/lib/languages/ruby'));
highlightjs.registerLanguage('erb', require('highlight.js/lib/languages/erb'));
highlightjs.registerLanguage('erlang-repl', require('highlight.js/lib/languages/erlang-repl'));
highlightjs.registerLanguage('erlang', require('highlight.js/lib/languages/erlang'));
highlightjs.registerLanguage('fix', require('highlight.js/lib/languages/fix'));
highlightjs.registerLanguage('fsharp', require('highlight.js/lib/languages/fsharp'));
highlightjs.registerLanguage('go', require('highlight.js/lib/languages/go'));
highlightjs.registerLanguage('groovy', require('highlight.js/lib/languages/groovy'));
highlightjs.registerLanguage('haml', require('highlight.js/lib/languages/haml'));
highlightjs.registerLanguage('handlebars', require('highlight.js/lib/languages/handlebars'));
highlightjs.registerLanguage('haskell', require('highlight.js/lib/languages/haskell'));
highlightjs.registerLanguage('haxe', require('highlight.js/lib/languages/haxe'));
highlightjs.registerLanguage('hsp', require('highlight.js/lib/languages/hsp'));
highlightjs.registerLanguage('htmlbars', require('highlight.js/lib/languages/htmlbars'));
highlightjs.registerLanguage('http', require('highlight.js/lib/languages/http'));
highlightjs.registerLanguage('ini', require('highlight.js/lib/languages/ini'));
highlightjs.registerLanguage('java', require('highlight.js/lib/languages/java'));
highlightjs.registerLanguage('javascript', require('highlight.js/lib/languages/javascript'));
highlightjs.registerLanguage('json', require('highlight.js/lib/languages/json'));
highlightjs.registerLanguage('julia', require('highlight.js/lib/languages/julia'));
highlightjs.registerLanguage('kotlin', require('highlight.js/lib/languages/kotlin'));
highlightjs.registerLanguage('less', require('highlight.js/lib/languages/less'));
highlightjs.registerLanguage('lisp', require('highlight.js/lib/languages/lisp'));
highlightjs.registerLanguage('lua', require('highlight.js/lib/languages/lua'));
highlightjs.registerLanguage('makefile', require('highlight.js/lib/languages/makefile'));
highlightjs.registerLanguage('mathematica', require('highlight.js/lib/languages/mathematica'));
highlightjs.registerLanguage('matlab', require('highlight.js/lib/languages/matlab'));
highlightjs.registerLanguage('maxima', require('highlight.js/lib/languages/maxima'));
highlightjs.registerLanguage('perl', require('highlight.js/lib/languages/perl'));
highlightjs.registerLanguage('nginx', require('highlight.js/lib/languages/nginx'));
highlightjs.registerLanguage('objectivec', require('highlight.js/lib/languages/objectivec'));
highlightjs.registerLanguage('ocaml', require('highlight.js/lib/languages/ocaml'));
highlightjs.registerLanguage('php', require('highlight.js/lib/languages/php'));
highlightjs.registerLanguage('powershell', require('highlight.js/lib/languages/powershell'));
highlightjs.registerLanguage('prolog', require('highlight.js/lib/languages/prolog'));
highlightjs.registerLanguage('python', require('highlight.js/lib/languages/python'));
highlightjs.registerLanguage('q', require('highlight.js/lib/languages/q'));
highlightjs.registerLanguage('qml', require('highlight.js/lib/languages/qml'));
highlightjs.registerLanguage('r', require('highlight.js/lib/languages/r'));
highlightjs.registerLanguage('rib', require('highlight.js/lib/languages/rib'));
highlightjs.registerLanguage('rsl', require('highlight.js/lib/languages/rsl'));
highlightjs.registerLanguage('rust', require('highlight.js/lib/languages/rust'));
highlightjs.registerLanguage('scala', require('highlight.js/lib/languages/scala'));
highlightjs.registerLanguage('scheme', require('highlight.js/lib/languages/scheme'));
highlightjs.registerLanguage('scilab', require('highlight.js/lib/languages/scilab'));
highlightjs.registerLanguage('scss', require('highlight.js/lib/languages/scss'));
highlightjs.registerLanguage('smalltalk', require('highlight.js/lib/languages/smalltalk'));
highlightjs.registerLanguage('sml', require('highlight.js/lib/languages/sml'));
highlightjs.registerLanguage('sqf', require('highlight.js/lib/languages/sqf'));
highlightjs.registerLanguage('sql', require('highlight.js/lib/languages/sql'));
highlightjs.registerLanguage('stan', require('highlight.js/lib/languages/stan'));
highlightjs.registerLanguage('stylus', require('highlight.js/lib/languages/stylus'));
highlightjs.registerLanguage('swift', require('highlight.js/lib/languages/swift'));
highlightjs.registerLanguage('tex', require('highlight.js/lib/languages/tex'));
highlightjs.registerLanguage('tp', require('highlight.js/lib/languages/tp'));
highlightjs.registerLanguage('twig', require('highlight.js/lib/languages/twig'));
highlightjs.registerLanguage('typescript', require('highlight.js/lib/languages/typescript'));
highlightjs.registerLanguage('vala', require('highlight.js/lib/languages/vala'));
highlightjs.registerLanguage('vbnet', require('highlight.js/lib/languages/vbnet'));
highlightjs.registerLanguage('vbscript', require('highlight.js/lib/languages/vbscript'));
highlightjs.registerLanguage('vbscript-html', require('highlight.js/lib/languages/vbscript-html'));
highlightjs.registerLanguage('vhdl', require('highlight.js/lib/languages/vhdl'));
highlightjs.registerLanguage('vim', require('highlight.js/lib/languages/vim'));
highlightjs.registerLanguage('x86asm', require('highlight.js/lib/languages/x86asm'));
highlightjs.registerLanguage('xl', require('highlight.js/lib/languages/xl'));
highlightjs.registerLanguage('xquery', require('highlight.js/lib/languages/xquery'));
highlightjs.registerLanguage('yaml', require('highlight.js/lib/languages/yaml'));

const CHECKBOX_TEMP = _.template(
	'<li class="checkbox <%- checked ? \'checkbox-checked\' : \'\' %>"><label>' +
		'<span><input data-value="<%- data %>" type="checkbox" <%- checked ? \'checked\' : \'\' %> /></span> <%= text %>' +
	'</label></li>'
);

var renderer = new marked.Renderer();

var checkboxes = [];
renderer.listitem = function(text) {
	if (/^<p>\s*\[[x ]\]\s*/.test(text)) {
		text = text.replace(/<[\/]{0,1}p>/g, '');
	}

	if (/^\s*\[[x ]\]\s*/.test(text)) {

		var clean_text = text.replace(/^\s*\[ \]\s*/, '').replace(/^\s*\[x\]\s*/, '');

		var escapedText = clean_text.toLowerCase().replace(/[^\w]+/g, '-');
		var duplicateIndex = checkboxes.map(function(h) { return h.text }).indexOf(escapedText);
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
		return CHECKBOX_TEMP({
			checked: (/^\s*\[x\]\s*/.test(text)),
			data: (duplicateText || escapedText),
			text: clean_text
		});
	} else {
		return '<li>' + text + '</li>';
	}
};

// Settings for Markdown
// Injecting GFM task lists

const IMGTAG_TEMP = _.template(
	'<a href="#" onclick="appVue.openImg(\'<%- link %>\'); return false">' +
	'<img src="<%- link %>" alt="<%- alt %>" />' +
	'</a>'
);

renderer.image = function(href, title, text) {
	return IMGTAG_TEMP({link: href, alt: title || ''});
};

var headings = [];
renderer.heading = function(text, level) {
	var escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
	var duplicateIndex = headings.map(function(h) { return h.text }).indexOf(escapedText);
	var duplicateText;
	if (duplicateIndex === -1) {
		headings.push({
		  text: escapedText,
		  count: 0
		});
	} else {
		headings[duplicateIndex].count++;
		duplicateText = escapedText + '-' + headings[duplicateIndex].count;
	}
	return '<h' + level + ' id="' + (duplicateText || escapedText) + '">' + text + '</h' + level + '>';
};

const ATAG_TO_EXTERNAL_TEMP = _.template(
	'<a href="<%- href %>" title="<%- title %>" ' +
	'onclick="require(\'electron\').shell.openExternal(\'<%- href %>\'); ' +
	'return false;"' +
	'oncontextmenu="var remote = new require(\'electron\').remote; ' +
	'var Menu = remote.Menu;' +
	'var MenuItem = remote.MenuItem;' +
	'var m = new Menu();' +
	'm.append(new MenuItem({label: \'Copy Link\',' +
	'click: function() {require(\'electron\').clipboard.writeText(\'<%- href %>\')}}));' +
	'm.popup(remote.getCurrentWindow()); return false;">' +
	'<%= text %>' +
	'</a>'
);

const ATAG_TO_INTERNAL_TEMP = _.template(
	'<a href="<%- href %>" title="<%- title %>"><%= text %></a>'
);

render.link = function(href, title, text) {
	if (href.indexOf('http') == 0) {
		return ATAG_TO_EXTERNAL_TEMP({
			href: href,
			title: title,
			text: text
		});
	} else {
		return ATAG_TO_INTERNAL_TEMP({
			href: href,
			title: title,
			text: text
		});
	}
};

marked.setOptions({
	renderer: renderer,
	gfm: true,
	tables: true,
	breaks: true,
	pedantic: false,
	sanitize: true,
	smartLists: true,
	smartypants: false,
	highlight: function(code) {
		return '<div class="hljs">' + highlightjs.highlightAuto(code).value + '</div>';
	}
});

/*function replaceAtagToExternal(bodyHTML) {
	return bodyHTML.replace(
		/<a.*?href="(https?:\/\/.*?)".*?>(.*?)<\/a>/mg,
		(match, p1, p2, offset, string) => {
			return ATAG_TO_EXTERNAL_TEMP({link: p1, text: p2});
		});
}*/

function findLineNumber(body, element, value, encoded, start) {
	if (!checkbox_occurrance_dictionary[encoded]) checkbox_occurrance_dictionary[encoded] = 0;
	if (start) checkbox_occurrance_dictionary[encoded] = start;

	var pos = body.indexOf(value, checkbox_occurrance_dictionary[encoded]);

	if (pos >= 0) {
		element.dataset.index = pos;
		checkbox_occurrance_dictionary[encoded] = pos + value.length;
	} else {
		console.log('not found?', value);
	}
}

var forEach = function(array, callback, scope) {
	for (var i = 0; i < array.length; i++) {
		callback.call(scope, i, array[i]); // passes back stuff we need
	}
};

function render(note, v) {
	headings = [];
	checkboxes = [];
	checkbox_occurrance_dictionary = {};
	//var p = replaceAtagToExternal(marked(note.bodyWithDataURL));
	var p = marked(note.bodyWithDataURL);
	v.$nextTick(() => {
		//var checks = note.bodyWithDataURL.match(/[\*\-]\s*\[[x ]\]\s*(.*)/g);
		forEach(document.querySelectorAll('li.checkbox'), function(index, el) {
			//var line_text = el.innerText || el.textContent;
			el.onclick = function(event) {
				event.preventDefault();
				var i = 0;
				var ok = note.body.replace(/[\*\-]\s*(\[[x ]\])/g, function(x) {
					x = x.replace(/\s/g, ' ');
					var start = x.charAt(0);
					if (i == index) {
						i++;
						if (x == start + ' [x]') {
							return start + ' [ ]';
						} else {
							return start + ' [x]';
						}
					} else {
						i++;
						return x;
					}
				});
				note.body = ok;

				var ul = el.parentNode;

				if (ul.tagName == 'UL' && ul.className != 'todo-ul') {
					ul.className = 'todo-ul';

					var last_checkbox;
					for (var i = ul.childNodes.length - 1; i >= 0; i--) {
						if (ul.childNodes[i].className.indexOf('checkbox') >= 0) {
							last_checkbox = ul.childNodes[i];
							break;
						}
					}

					if (last_checkbox) {

						var newLi = document.createElement('li');
						newLi.className = 'new-todo-form';
						newLi.innerHTML = '<form><input type="text" /><button type="submit">+</button></form>';
						ul.insertBefore(newLi, last_checkbox.nextSibling);

						var newForm = newLi.querySelector('form');

						newForm.addEventListener('submit', function(event) {
							event.preventDefault();

							var inputText = event.target.querySelector('input').value;
							event.target.querySelector('input').value = '';
							var last_checkbox = event.target.parentNode.previousSibling.querySelector('.my-el-todo-list');

							if (inputText && last_checkbox) {
								var value = decodeURI(last_checkbox.dataset.value);
								if (value) {
									var body = note.body;
									note.body = body.replace(value + '\n', value + '\n' + '* [ ] ' + inputText + '\n');

									var div = document.createElement('div');
									div.innerHTML = renderCheckboxText(' [ ] ' + inputText);
									var elements = div.childNodes;

									event.target.parentNode.parentNode.insertBefore(elements[0], event.target.parentNode);
									var this_checkbox = div.querySelector('.my-el-todo-list');
									console.log(this_checkbox, elements);
									findLineNumber(note.body, this_checkbox, decodeURI(this_checkbox.dataset.value), this_checkbox.dataset.value, last_checkbox.dataset.index);
								}
							}
						}, false);
					}
				}
			};
		});
	});
	return p;
}

module.exports = {
	render: render
};
