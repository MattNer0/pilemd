(function(CodeMirror) {
	'use strict';

	CodeMirror.defineMode('piledmd', function(config, modeConfig) {

		var piledmdOverlay = {
			startState: function() {
				return {
					code: false,
					codeBlock: false,
					ateSpace: false
				};
			},
			copyState: function(s) {
				return {
					code: s.code,
					codeBlock: s.codeBlock,
					ateSpace: s.ateSpace
				};
			},
			token: function(stream, state) {
				stream.next();
				return null;
			},
			closeBrackets: {triples: '`'}
		};

		var markdownConfig = {
			underscoresBreakWords: false,
			taskLists: true,
			fencedCodeBlocks: '```',
			strikethrough: true,
			highlightFormatting: true,
			tokenTypeOverrides: {
				header: 'piled-header',
				code: 'piled-code',
				quote: 'piled-quote',
				list1: 'piled-list1',
				list2: 'piled-list2',
				list3: 'piled-list3',
				hr: 'piled-hr',
				image: 'piled-image',
				formatting: 'piled-formatting',
				link: 'piled-link',
				linkInline: 'piled-link-inline',
				linkEmail: 'piled-link-email',
				linkText: 'piled-link-text',
				linkHref: 'piled-link-href',
				em: 'piled-em',
				strong: 'piled-strong',
				strikethrough: 'piled-strikethrough'
			}
		};
		for (var attr in modeConfig) {
			markdownConfig[attr] = modeConfig[attr];
		}
		markdownConfig.name = 'gfm';
		return CodeMirror.getMode(config, markdownConfig);

	}, 'gfm');

	CodeMirror.defineMIME('text/x-piledmd', 'piledmd');
})(require('codemirror'), require('codemirror/addon/mode/overlay'), require('codemirror/mode/markdown/markdown')
);
