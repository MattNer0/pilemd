<template lang="pug">
	#title-bar
		nav#cssmenu
			ul
				li
					a(@click="$root.addNote()", href="#"): span
						i.material-icons note_add
						|  New Note
				li
					a(@click="$root.toggleFullScreen()", href="#"): span
						i.material-icons input
						|  Sidebar
				li(v-show="$root.selectedNote.data")
					a(@click="$root.toggleProperties()", href="#"): span
						i.material-icons.rotate input
						|  Properties
				li: div
					i.material-icons search
					input#search-bar.my-search(v-model="search", type="search", placeholder="Search notes...")
				
				li.has-sub.right-align
					dropdown(:visible="menu_visible", :position="position", v-on:clickout="menu_visible = false")
						i.link.material-icons(@click="menu_visible = !menu_visible") more_vert
						.dialog(slot="dropdown"): ul
							li: a(@click="menu_open_folder", href="#") Open Existing Sync Folder
							li: a(@click="menu_move_folder", href="#") Move Sync Folder
							li: a(@click="menu_devTools", href="#") Open DevTools
							li: a(@click="menu_credits", href="#") Credits
</template>

<script>
	const remote = require('electron').remote;

	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'titleMenu',
		props: ['selectedNote', 'selectedRackOrFolder', 'isFullScreen', 'isPreview'],
		data: function() {
			return {
				'search': "",
				'menu_visible': false,
				'position': [ "right", "top", "right", "top" ]
			};
		},
		components: {
			'dropdown': myDropdown
		},
		created: function() {
			this.$watch('search', () => {
				this.$parent.search = this.search;
			});
		},
		methods: {
			menu_open_folder: function() {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					self.$parent.openSync();
				}, 100);
			},
			menu_move_folder: function() {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					self.$parent.moveSync();
				}, 100);
			},
			menu_devTools: function() {
				this.menu_visible = false;
				var win = remote.getCurrentWindow();
				win.webContents.openDevTools();
			},
			menu_credits: function() {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					self.$parent.openCredits();
				}, 100);
			}
		}
	}
</script>