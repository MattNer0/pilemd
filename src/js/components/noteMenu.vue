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
			li.right-align
				div: dropdown(:visible="fontsize_visible", :position="position", v-on:clickout="fontsize_visible = false")
					span.link(@click="fontsize_visible = !fontsize_visible")
						i.material-icons format_size
						|  FontSize
					.dialog(slot="dropdown"): ul
						li: a(@click="menu_fontsize(10)", href="#")
							i.material-icons(v-if="fontsize == 10") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  10
						li: a(@click="menu_fontsize(12)", href="#")
							i.material-icons(v-if="fontsize == 12") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  12
						li: a(@click="menu_fontsize(14)", href="#")
							i.material-icons(v-if="fontsize == 14") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  14
						li: a(@click="menu_fontsize(15)", href="#")
							i.material-icons(v-if="fontsize == 15") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  15
						li: a(@click="menu_fontsize(16)", href="#")
							i.material-icons(v-if="fontsize == 16") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  16
						li: a(@click="menu_fontsize(18)", href="#")
							i.material-icons(v-if="fontsize == 18") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  18
						li: a(@click="menu_fontsize(20)", href="#")
							i.material-icons(v-if="fontsize == 20") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  20
						li: a(@click="menu_fontsize(24)", href="#")
							i.material-icons(v-if="fontsize == 24") check_box
							i.material-icons(v-else) check_box_outline_blank
							|  24
</template>

<script>
	const remote = require('electron').remote;

	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'noteMenu',
		props: ['note', 'isFullScreen', 'isPreview', 'fontsize'],
		data: function() {
			return {
				'fontsize_visible': false,
				'position': [ "right", "bottom", "right", "top" ]
			};
		},
		components: {
			'dropdown': myDropdown
		},
		methods: {
			codeMirror: function() {
				return this.$root.codeMirror;
			},
			menu_fontsize: function(size) {
				this.$parent.fontsize = size;
				this.fontsize_visible = false;
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