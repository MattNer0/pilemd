<template lang="pug">
	.noteBar(v-if="note && note.title")
		nav: ul
			li: a(@click="menu_codeBlock", href="#", v-show="!isPreview")
				i.material-icons code
				|  Code block
			li: a(@click="menu_checkMark", href="#", v-show="!isPreview")
				i.material-icons done
				|  Checkbox
			li.right-align: a(@click="menu_preview", href="#", title="Preview")
				template(v-if="isPreview")
					i.material-icons visibility_off
				template(v-else)
					i.material-icons visibility
			li.right-align
				div: dropdown(:visible="properties_visible", :position="position", v-on:clickout="properties_visible = false")
					span.link(@click="properties_visible = !properties_visible", title="Properties")
						i.material-icons info_outline
					.dialog(slot="dropdown")
						.properties-dialog(@click="close_properties")
							table
								tr
									td: strong Line Count: 
									td.right: span {{ note.properties.lineCount }}
								tr
									td: strong Word Count: 
									td.right: span {{ note.properties.wordCount }}
								tr
									td: strong Char Count: 
									td.right: span {{ note.properties.charCount }}
							hr
							table
								tr
									td: strong Modified: 
									td.right: span {{ note.data.updated_at.format('MMM DD, YYYY') }}

			li.right-align
				div: dropdown(:visible="fontsize_visible", :position="position", v-on:clickout="fontsize_visible = false")
					span.link(@click="fontsize_visible = !fontsize_visible", title="Font Size")
						i.material-icons format_size
					.dialog(slot="dropdown"): ul
						li: a(@click="menu_fontsize(10)", href="#")
							i.material-icons(v-if="fontsize == 10") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
							|  10
						li: a(@click="menu_fontsize(12)", href="#")
							i.material-icons(v-if="fontsize == 12") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
							|  12
						li: a(@click="menu_fontsize(14)", href="#")
							i.material-icons(v-if="fontsize == 14") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
							|  14
						li: a(@click="menu_fontsize(15)", href="#")
							i.material-icons(v-if="fontsize == 15") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
							|  15
						li: a(@click="menu_fontsize(16)", href="#")
							i.material-icons(v-if="fontsize == 16") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
							|  16
						li: a(@click="menu_fontsize(18)", href="#")
							i.material-icons(v-if="fontsize == 18") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
							|  18
						li: a(@click="menu_fontsize(20)", href="#")
							i.material-icons(v-if="fontsize == 20") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
							|  20
						li: a(@click="menu_fontsize(24)", href="#")
							i.material-icons(v-if="fontsize == 24") radio_button_checked
							i.material-icons.faded(v-else) radio_button_unchecked
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
				'properties_visible': false,
				'position': [ "right", "top", "right", "top" ]
			};
		},
		components: {
			'dropdown': myDropdown
		},
		methods: {
			codeMirror: function() {
				return this.$root.codeMirror;
			},
			close_properties: function() {
				this.properties_visible = false;
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