const toMarkdown = require('to-markdown');

module.exports = {
	convert(html_source, page_url) {
		var new_md = toMarkdown(html_source, { gfm: true, converters: [{
				filter: ['span', 'article'],
				replacement: function(content) {
					return content;
				}
			},{
				filter: 'div',
				replacement: function(content) {
					return '\n' + content + '\n';
				}
			},{
				filter: ['script', 'noscript', 'form', 'nav'],
				replacement: function(content) {
					return '';
				}
			}]
		});
		new_md = new_md.replace(/\n+/gi, '\n');
		new_md = new_md.replace(/(\!\[\]\(.+?\))(\s*\1+)/gi, '$1');
		new_md = new_md.replace(/(\[\!\[.*?\].+?\]\(.+?\))/gi, '\n$1\n');
		new_md = new_md.replace(/\]\(\/\//gi, '](http://');
		if (new_md && page_url) new_md = '[Source](' + page_url + ')\n\n' + new_md;
		return new_md;
	}
};
