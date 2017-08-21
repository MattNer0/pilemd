<template lang="pug">
	#title-bar
		nav#cssmenu
			ul
				li
					a(@click="$root.toggleFullScreen()", href="#"): span
						i.material-icons(v-if="isFullScreen") fullscreen_exit
						i.material-icons(v-else) fullscreen
						|  Sidebar
				li: div
					i.material-icons search
					input#search-bar.my-search(v-model="search", type="text", placeholder="Search notes...")
					i.material-icons(v-show="search", @click="clear_search") clear
				
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
		props: ['isFullScreen'],
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
		methods: {
			clear_search() {
				this.search = "";
			},
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
		},
		watch: {
			search() {
				this.$parent.search = this.search;
			}
		}
	}
</script>