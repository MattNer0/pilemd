<template lang="pug">
	#title-bar
		nav#cssmenu
			ul
				li
					a(@click.prevent="toggleFullScreen", href="#"): span
						i.material-icons(v-if="isFullScreen") fullscreen_exit
						i.material-icons(v-else) fullscreen
						|  Toggle Sidebar
				li: div
					i.material-icons search
					input#search-bar.my-search(v-model="search", type="text", placeholder="Search notes...")
					i.material-icons(v-show="search", @click="clear_search") clear
				
				li.has-sub.right-align
					dropdown(:visible="menu_visible", :position="position", v-on:clickout="menu_visible = false")
						i.link.material-icons(@click="menu_visible = !menu_visible") more_vert
						.dialog(slot="dropdown"): ul
							li: a(@click.prevent="menu_openFolder", href="#") Select Library Directory
							//-li: a(@click.prevent="menu_moveFolder", href="#") Move Library Directory
							li: hr
							li: a(@click.prevent="menu_changeTheme('dark')", href="#")
								i.material-icons(v-if="selectedTheme == 'dark'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Dark Theme
							li: a(@click.prevent="menu_changeTheme('light')", href="#")
								i.material-icons(v-if="selectedTheme == 'light'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Light Theme
							li: a(@click.prevent="menu_changeTheme('original')", href="#")
								i.material-icons(v-if="selectedTheme == 'original'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  PileMd Theme
							li: hr
							//-li: a(@click.prevent="menu_devTools", href="#") Open DevTools
							li(v-if="isLinux && saveDesktop"): a(@click.prevent="menu_desktopEntry", href="#") Add Desktop Entry
							li: a(@click.prevent="menu_about", href="#") About
							li: hr
							li: a(@click.prevent="menu_quit", href="#") Quit

				li.has-sub.right-align
					dropdown(:visible="order_visible", :position="position", v-on:clickout="order_visible = false")
						span.link(@click="order_visible = !order_visible")
							i.material-icons sort
							span.sub-text(v-if="notesDisplayOrder == 'updatedAt'")
								| Sort by Update Date
							span.sub-text(v-if="notesDisplayOrder == 'createdAt'")
								| Sort by Creation Date
							span.sub-text(v-if="notesDisplayOrder == 'title'")
								| Sort by Title
						.dialog(slot="dropdown"): ul
							li: a(@click.prevent="menu_changeOrder('updatedAt')", href="#")
								i.material-icons(v-if="notesDisplayOrder == 'updatedAt'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Sort by Update Date
							li: a(@click.prevent="menu_changeOrder('createdAt')", href="#")
								i.material-icons(v-if="notesDisplayOrder == 'createdAt'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Sort by Creation Date
							li: a(@click.prevent="menu_changeOrder('title')", href="#")
								i.material-icons(v-if="notesDisplayOrder == 'title'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Sort by Title
</template>

<script>
	const remote = require('electron').remote;
	const fs = require('fs');
	const path = require('path');

	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'titleMenu',
		props: {
			'isFullScreen'      : Boolean,
			'selectedTheme'     : String,
			'notesDisplayOrder' : String,
			'toggleFullScreen'  : Function,
			'openSync'          : Function,
			'moveSync'          : Function,
			'openAbout'       : Function,
			'changeTheme'       : Function,
			'changeDisplayOrder': Function
		},
		data: function() {
			return {
				'search'          : "",
				'menu_visible'    : false,
				'order_visible'   : false,
				'saveDesktop'     : true,
				'position'        : [ "right", "top", "right", "top" ],
				'isLinux'         : remote.getGlobal('isLinux'),
				'desktopEntryPath': path.join(remote.app.getPath('home'), '.local', 'share', 'applications', 'pilemd.desktop')
			};
		},
		components: {
			'dropdown': myDropdown
		},
		mounted() {
			// check if I need to show the "Add Desktop Entry" option in the menu
			if (fs.existsSync(this.desktopEntryPath)) this.saveDesktop = false;
		},
		methods: {
			clear_search() {
				this.search = "";
			},
			menu_openFolder() {
				this.menu_visible = false;
				setTimeout(() => {
					this.openSync();
				}, 100);
			},
			menu_moveFolder() {
				this.menu_visible = false;
				setTimeout(() => {
					this.moveSync();
				}, 100);
			},
			menu_devTools() {
				this.menu_visible = false;
				var win = remote.getCurrentWindow();
				win.webContents.openDevTools();
			},
			menu_about() {
				this.menu_visible = false;
				setTimeout(() => {
					this.openAbout();
				}, 100);
			},
			menu_changeTheme(value) {
				this.menu_visible = false;
				setTimeout(() => {
					this.changeTheme(value);
				}, 100);
			},
			menu_changeOrder(value) {
				this.order_visible = false;
				setTimeout(() => {
					this.changeDisplayOrder(value);
				}, 100);
			},
			menu_quit() {
				this.menu_visible = false;
				remote.app.quit();
			},
			menu_desktopEntry() {
				this.menu_visible = false;
				setTimeout(() => {
					if (!fs.existsSync(this.desktopEntryPath)) {
						var exe = remote.app.getPath('exe');
						var body = "[Desktop Entry]\n" +
									"Encoding=UTF-8\n" +
									"Version=1.0\n" +
									"Name=" + remote.app.getName() + "\n" +
									"Comment=Markdown Note-taking App\n" +
									"Exec=" + exe + " %u\n" +
									"Icon=" + path.join(path.dirname(exe),'resources','icon.png') + "\n" +
									"Terminal=false\n" +
									"StartupWMClass=" + remote.app.getName() + "\n" +
									"Type=Application\n" +
									"MimeType=text/markdown;\n" +
									"Categories=Office;Utility;";
						fs.writeFileSync(this.desktopEntryPath, body);
						// desktop entry created
					} else {
						// desktop exists already
						this.saveDesktop = false;
					}
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