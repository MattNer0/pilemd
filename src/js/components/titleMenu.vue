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
							li(v-if="isLinux"): a(@click.prevent="menu_desktopEntry", href="#") Add Desktop Entry
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
				'position': [ "right", "top", "right", "top" ],
				'isLinux': remote.getGlobal('isLinux')
			};
		},
		components: {
			'dropdown': myDropdown
		},
		methods: {
			clear_search() {
				this.search = "";
			},
			menu_openFolder() {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					self.openSync();
				}, 100);
			},
			menu_moveFolder() {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					self.moveSync();
				}, 100);
			},
			menu_devTools() {
				this.menu_visible = false;
				var win = remote.getCurrentWindow();
				win.webContents.openDevTools();
			},
			menu_credits() {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					self.openCredits();
				}, 100);
			},
			menu_changeTheme(value) {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					self.changeTheme(value);
				}, 100);
			},
			menu_quit() {
				this.menu_visible = false;
				var win = remote.getCurrentWindow();
				win.close();
			},
			menu_desktopEntry() {
				var self = this;
				this.menu_visible = false;
				setTimeout(function() {
					var desktop_path = path.join(remote.app.getPath('home'), '.local', 'share', 'applications');
					if (!fs.existsSync(desktop_path)) fs.mkdirSync(desktop_path);
					desktop_path = path.join(desktop_path, 'pilemd.desktop');
					if (!fs.existsSync(desktop_path)) {
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
						fs.writeFileSync(desktop_path, body);
						console.log('desktop entry created!');
					} else {
						// desktop exists already
						console.log('desktop exists already');
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