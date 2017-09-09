<template lang="pug">
	#title-bar
		nav#cssmenu
			ul
				li
					a(@click="toggleFullScreen", href="#"): span
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
							li: a(@click.prevent="menu_openFolder", href="#") Open Existing Sync Folder
							li: a(@click.prevent="menu_moveFolder", href="#") Move Sync Folder
							li: hr
							li: a(@click.prevent="menu_changeTheme('original')", href="#")
								i.material-icons(v-if="selectedTheme == 'original'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Original Theme
							li: a(@click.prevent="menu_changeTheme('light')", href="#")
								i.material-icons(v-if="selectedTheme == 'light'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Light Theme
							li: a(@click.prevent="menu_changeTheme('dark')", href="#")
								i.material-icons(v-if="selectedTheme == 'dark'") radio_button_checked
								i.material-icons.faded(v-else) radio_button_unchecked
								|  Dark Theme
							li: hr
							li: a(@click.prevent="menu_devTools", href="#") Open DevTools
							li(v-if="isLinux && saveDesktop"): a(@click.prevent="menu_desktopEntry", href="#") Add Desktop Entry
							li: hr
							li: a(@click.prevent="menu_credits", href="#") Credits
							li: hr
							li: a(@click.prevent="menu_quit", href="#") Quit
</template>

<script>
	const remote = require('electron').remote;
	const fs = require('fs');
	const path = require('path');

	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'titleMenu',
		props: {
			'isFullScreen': Boolean,
			'selectedTheme': String,
			'toggleFullScreen': Function,
			'openSync': Function,
			'moveSync': Function,
			'openCredits': Function,
			'changeTheme': Function
		},
		data: function() {
			return {
				'search': "",
				'menu_visible': false,
				'saveDesktop': true,
				'position': [ "right", "top", "right", "top" ],
				'isLinux': remote.getGlobal('isLinux'),
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
			menu_credits() {
				this.menu_visible = false;
				setTimeout(() => {
					self.openCredits();
				}, 100);
			},
			menu_changeTheme(value) {
				this.menu_visible = false;
				setTimeout(() => {
					this.changeTheme(value);
				}, 100);
			},
			menu_quit() {
				this.menu_visible = false;
				var win = remote.getCurrentWindow();
				win.close();
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
						console.log('desktop entry created!');
					} else {
						// desktop exists already
						console.log('desktop exists already');
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