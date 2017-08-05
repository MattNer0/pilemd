<template lang="pug">
	.CodeMirror-menu(v-show="!$root.isPreview && $root.selectedNote.title")
		nav: ul
			li: a(@click="menu_codeBlock()", href="#")
				i.material-icons code
				|  Code block
			li: a(@click="menu_checkMark()", href="#")
				i.material-icons done
				|  Checkbox
</template>

<script>
	const remote = require('electron').remote;

	export default {
		name: 'codemirrorMenu',
		props: [],
		methods: {
			codeMirror: function() {
				return this.$parent.codeMirror;
			},
			menu_codeBlock: function() {
				var cm = this.codeMirror();
				var cursor = cm.getCursor();

				if(cursor.ch == 0){
					if(cm.doc.getLine(cursor.line).length > 0){
						cm.doc.replaceRange( "```\n\n```\n", cursor);
					} else {
						cm.doc.replaceRange( "```\n\n```", cursor);
					}
				} else {
					cursor.ch = cm.doc.getLine(cursor.line).length;
					cm.doc.replaceRange( "\n```\n\n```", cursor);
					cursor.line += 1;
				}
				
				
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
					if(cm.doc.getLine(cursor.line).length > 0){
						cm.doc.replaceRange( "* [ ] \n", cursor);
					} else {
						cm.doc.replaceRange( "* [ ] ", cursor);
					}
				} else {
					cursor.ch = cm.doc.getLine(cursor.line).length;
					cm.doc.replaceRange( "\n* [ ] ", cursor);
					cursor.line += 1;
				}
				
				cm.doc.setCursor({
					line: cursor.line,
					ch: cursor.ch+5
				});
				cm.focus();
			}
		}
	}
</script>