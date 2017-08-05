<template lang="pug">
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
			li(v-if="$root.selectedNote.data")
				a(@click="menu_preview()", href="#")
					span(v-if="$root.isPreview")
						i.material-icons visibility_off
						|  Preview
					span(v-else)
						i.material-icons visibility
						|  Preview
			li: div
				i.material-icons search
				input#search-bar.my-search(v-model="search", type="search", placeholder="Search notes...")
			li.has-sub.right-align
				a.menu-button(href="#")
					span
					span
					span
				ul
					li: a(@click="$root.addNote()", href="#") New Note
					li: a(@click="$root.openSync()", href="#") Open Existing Sync Folder
					li: a(@click="$root.moveSync()", href="#") Move Sync Folder
					li: a(@click="menu_devTools()", href="#") Open DevTools
					li: a(@click="$root.openCredits()", href="#") Credits
					li: a(@click="$root.menu_close()", href="#") Quit
</template>

<script>
	const remote = require('electron').remote;

	export default {
		name: 'titleMenu',
		props: ['selectedNote', 'selectedRackOrFolder', 'isFullScreen', 'isPreview'],
		data: function() {
			return {
				'search': ""
			};
		},
		created: function() {
			this.$watch('search', () => {
				this.$parent.search = this.search;
			});
		},
		methods: {
			menu_preview: function() {
				this.$parent.isPreview = !this.$parent.isPreview;
			},
			menu_devTools: function() {
				var win = remote.getCurrentWindow();
				win.webContents.openDevTools();
			}
		}
	}
</script>