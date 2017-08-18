<template lang="pug">
	.noteBar(v-show="note.title")
		nav: ul
			li: a(@click="menu_codeBlock", href="#", v-show="!isPreview")
				i.material-icons code
				|  Code block
			li: a(@click="menu_checkMark", href="#", v-show="!isPreview")
				i.material-icons done
				|  Checkbox
			li.right-align: a(@click="menu_preview", href="#")
				template(v-if="isPreview")
					i.material-icons visibility_off
					|  Preview
				template(v-else)
					i.material-icons visibility
					|  Preview
</template>

<script>
	const remote = require('electron').remote;

	export default {
		name: 'noteMenu',
		props: ['note', 'isFullScreen', 'isPreview'],
		methods: {
			codeMirror: function() {
				return this.$root.codeMirror;
			},
			menu_preview: function() {
				this.$parent.isPreview = !this.$parent.isPreview;
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