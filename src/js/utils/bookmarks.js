String.prototype.formatUnicorn = String.prototype.formatUnicorn || () => {
	'use strict';
	var str = this.toString();
	if (arguments.length) {
		var t = typeof arguments[0];
		var key;
		var args = ('string' === t || 'number' === t) ? Array.prototype.slice.call(arguments) : arguments[0];

		for (key in args) {
			str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key]);
		}
	}
	return str;
};

function parseTag(tag) {
	var match = /<(.+?)>([^<>]*)<\/(.+?)>/g.exec(tag);
	if (match) {
		var attributes_array = match[1].split(' ').slice(1);
		var attributes_object = {};

		attributes_array.forEach(function(attr) {
			var attr_match = /(.+?)=["'](.*?)["']/g.exec(attr);
			attributes_object[attr_match[1]] = attr_match[2];
		});

		return {
			input: match.input,
			tag: match[3].toUpperCase(),
			text: match[2],
			attributes: attributes_object
		};
	} else {
		return {
			tag: tag
		};
	}
}

module.exports = {

	parse(file_content, rack) {
		const moment = require('moment');
		const BookmarkFolder = require('../models').BookmarkFolder;

		var result_json = {
			title: '',
			name: '',
			children: []
		};

		var result_folder = {};
		var folder_index = 0;

		var lines_array = file_content.split('\n');
		lines_array.forEach(function(row, index) {
			row = row.trim();
			if (/^<dd>/i.test(row)) {

			} else if (row && !/^<!.+>/.test(row) && !/^<meta.+>/i.test(row)) {
				row = row.replace(/^<DT>/, '');
				row = row.replace(/<p>/, '');

				var tags = parseTag(row);
				switch (tags.tag) {
					case 'TITLE':
						result_json.title = tags.text;
						break;
					case 'H1':
						result_json.name = tags.text;
						result_json.ordering = tags.attributes['ORDERING'] ? parseInt(tags.attributes['ORDERING']) : 0;
						break;
					case 'H3':
						result_folder = new BookmarkFolder({
							attributes: tags.attributes,
							name: tags.text,
							rack: rack,
							ordering: folder_index
						});
						break;
					case 'A':
						if (result_folder.name) {
							result_folder.notes.push({
								attributes: tags.attributes || {},
								body: tags.attributes['HREF'],
								folderUid: result_folder.uid,
								name: tags.text,
								rack: rack,
								folder: result_folder,
								dragHover: false,
								sortUpper: false,
								sortLower: false,
								updatedAt: moment(tags.attributes['LAST_MODIFIED'], 'X'),
								createdAt: moment(tags.attributes['ADD_DATE'], 'X')
							});
						}
						// bookmark
						break;
					case '</DL>':
						if (result_folder.name) {
							result_json.children.push(result_folder);
							folder_index += 1;
							result_folder = {};
						}
						break;
				}
			}
		});
		return result_json;
	},

	serialize_attributes(attributes) {
		var attrs_string = '';
		var attrsKeys = Object.keys(attributes);
		for (var i = 0; i < attrsKeys.length; i++) {
			attrs_string += '{key}="{value}" '.formatUnicorn({
				key: attrsKeys[i],
				value: attributes[attrsKeys[i]]
			});
		}
		return attrs_string.trim();
	},

	stringify_bookmark(bookmark) {
		return '        <DT><A {attrs}>{name}</A>'.formatUnicorn({
			attrs: this.serialize_attributes(bookmark.attributes),
			name: bookmark.name
		});
	},

	stringify_folder(bookmarks_folder) {
		var farray = [];

		farray.push('    <DT><H3 {attrs}>{name}</H3>'.formatUnicorn({
			attrs: this.serialize_attributes(bookmarks_folder.data.attributes),
			name: bookmarks_folder.name
		}));
		farray.push('    <DL><p>');
		for (var i = 0; i < bookmarks_folder.notes.length; i++) {
			farray.push(this.stringify_bookmark(bookmarks_folder.notes[i]));
		}
		farray.push('    </DL><p>');

		return farray;
	},

	stringify(bookmarks) {
		var barray = [];

		barray.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
		barray.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
		barray.push('<TITLE>{title}</TITLE>'.formatUnicorn(bookmarks));
		barray.push('<H1 ORDERING="{ordering}">{name}</H1>'.formatUnicorn(bookmarks));
		barray.push('<DL><p>');
		for (var i = 0; i < bookmarks.children.length; i++) {
			barray = barray.concat(this.stringify_folder(bookmarks.children[i]));
		}
		barray.push('</DL>');
		return barray.join('\n');
	}
};
