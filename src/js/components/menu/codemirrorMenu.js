const remote = require('electron').remote;

function codemirrorMenu(Vue, options) {

	Vue.component('codemirrorMenu', {
		replace: true,
		props: [],
		template: require('./codemirrorMenu.html'),
		methods: {
			codeMirror: function() {
				return this.$parent.codeMirror;
			},
			menu_codeBlock: function() {
				var cm = this.codeMirror();
				var cursor = cm.getCursor();
				cm.doc.replaceRange( "```\n\n```", cursor);
				cm.doc.setCursor({
					line: cursor.line+1,
					ch: 0
				});
				cm.focus();
			},
			menu_checkMark: function() {
				var cm = this.codeMirror();
				var cursor = cm.getCursor();
				
				if(cursor.ch == 0){
					cm.doc.replaceRange( "* [ ] ", cursor);
				} else {
					cm.doc.replaceRange( "\n\n* [ ] ", cursor);
					cursor = {
						line: cursor.line+2,
						ch: 0
					};
				}
				
				cm.doc.setCursor({
					line: cursor.line,
					ch: cursor.ch+5
				});
				cm.focus();
			}
		}
	});
}

module.exports = codemirrorMenu;