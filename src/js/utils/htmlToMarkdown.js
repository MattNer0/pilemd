const toMarkdown = require('to-markdown');

module.exports = {

	parseScript() {
		var elements = [
			"document.querySelector('article') ? document.querySelector('article').innerHTML",
			"document.querySelector('#article_item') ? document.querySelector('#article_item').innerHTML",
			"document.querySelector('*[role=\"article\"]') ? document.querySelector('*[role=\"article\"]').innerHTML",
			"document.querySelector('*[role=\"main\"]') ? document.querySelector('*[role=\"main\"]').innerHTML",
			"document.querySelector('.post-container') ? document.querySelector('.post-container').innerHTML",
			"document.querySelector('.content-body') ? document.querySelector('.content-body').innerHTML",
			"document.querySelector('p + p + p + p') ? document.querySelector('p + p + p + p').parentNode.innerHTML",
			"document.querySelector('body').innerHTML"
		];

		return elements.join(' : ');
	},

	convert(html_source, page_url, page_title) {
		var new_md = toMarkdown(html_source, {
			gfm: true,
			converters: [{
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
				filter: ['script', 'noscript', 'form', 'nav', 'iframe', 'input'],
				replacement: function() {
					return '';
				}
			}]
		});
		new_md = new_md.replace(/\n+/gi, '\n');
		new_md = new_md.replace(/(!\[\]\(.+?\))(\s*\1+)/gi, '$1');
		new_md = new_md.replace(/(\[!\[.*?\].+?\]\(.+?\))/gi, '\n$1\n');
		new_md = new_md.replace(/\]\(\/\//gi, '](http://');

		if (!new_md.match(/^# /gm)) {
			new_md = '# ' + page_title + '\n\n' + new_md;
		}

		if (new_md && page_url) new_md = '[Source](' + page_url + ')\n\n' + new_md;

		return new_md;
	}
};
