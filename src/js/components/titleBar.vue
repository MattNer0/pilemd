<template lang="pug">
	.title-bar-container
		.title-bar(:class="{ 'open-dropdown' : menu_visible || order_visible }")
			.spacer
				.address-bar
					span(v-if="!enabled")
						i.material-icons folder
						| PileMd Library
					span(v-else, v-for="(path, index) in selectionPath")
						i.material-icons(v-if="index == 0") folder
						i.material-icons(v-else) chevron_right
						|  {{ path }}
			.spacer
				nav: ul
					li
						a(@click.prevent="focus_input"): span
							i.material-icons search
							| Search
					li
						.my-search(:class="{ 'search-open': search.length > 0 || openSearch }")
							input#search-bar(ref="searchinput", v-model="search", type="text")
							i.material-icons(v-show="search", @click="clear_search") clear
					li.has-sub(@click="order_visible = !order_visible")
						dropdown(:visible="order_visible", :position="position", v-on:clickout="order_visible = false")
							span.link
								i.material-icons sort
								span.sub-text(v-if="notesDisplayOrder == 'updatedAt'")
									| Sort by Update Date
								span.sub-text(v-if="notesDisplayOrder == 'createdAt'")
									| Sort by Creation Date
								span.sub-text(v-if="notesDisplayOrder == 'title'")
									| Sort by Title
							.dialog(slot="dropdown"): ul(@click.prevent.stop="")
								li: a(@click.prevent.stop="menu_changeOrder('updatedAt')", href="#")
									i.material-icons(v-if="notesDisplayOrder == 'updatedAt'") radio_button_checked
									i.material-icons.faded(v-else) radio_button_unchecked
									|  Sort by Update Date
								li: a(@click.prevent.stop="menu_changeOrder('createdAt')", href="#")
									i.material-icons(v-if="notesDisplayOrder == 'createdAt'") radio_button_checked
									i.material-icons.faded(v-else) radio_button_unchecked
									|  Sort by Creation Date
								li: a(@click.prevent.stop="menu_changeOrder('title')", href="#")
									i.material-icons(v-if="notesDisplayOrder == 'title'") radio_button_checked
									i.material-icons.faded(v-else) radio_button_unchecked
									|  Sort by Title
					li
						a(@click.prevent="toggleFullScreen", href="#"): span
							i.material-icons(v-if="isFullScreen") fullscreen_exit
							i.material-icons(v-else) fullscreen
							|  Toggle Sidebar
			.spacer.right-align
				nav: ul
					li.has-sub(@click="menu_visible = !menu_visible")
						dropdown(:visible="menu_visible", :position="position", v-on:clickout="menu_visible = false")
							i.link.material-icons menu
							.dialog(slot="dropdown"): ul(@click.prevent.stop="")
								li: a(@click.prevent.stop="menu_openFolder", href="#") Select Library Directory
								li: a(@click.prevent.stop="menu_moveFolder", href="#") Move Library Directory
								li: hr
								li: a(@click.prevent.stop="menu_toggleToolbar()", href="#")
									i.material-icons(v-if="isToolbarEnabled") check_box
									i.material-icons.faded(v-else) check_box_outline_blank
									|  Show Note Toolbar
								li: hr
								li: a(@click.prevent.stop="menu_changeTheme('dark')", href="#")
									i.material-icons(v-if="selectedTheme == 'dark'") radio_button_checked
									i.material-icons.faded(v-else) radio_button_unchecked
									|  Dark Theme
								li: a(@click.prevent.stop="menu_changeTheme('light')", href="#")
									i.material-icons(v-if="selectedTheme == 'light'") radio_button_checked
									i.material-icons.faded(v-else) radio_button_unchecked
									|  Light Theme
								li: hr
								//-li: a(@click.prevent="menu_devTools", href="#") Open DevTools
								//-li(v-if="isLinux && saveDesktop"): a(@click.prevent="menu_desktopEntry", href="#") Add Desktop Entry
								li: a(@click.prevent.stop="menu_about", href="#") About
								li: hr
								li: a(@click.prevent.stop="menu_quit", href="#") Quit
			.spacer.system-icons
				.system-icon.minimize(@click="win_min")
					i.material-icons remove
				.system-icon(@click="win_max")
					i.material-icons check_box_outline_blank
				.system-icon.close-icon(@click="win_close")
					i.material-icons close
		.title-bar-spacing
</template>

<script>
	const remote = require('electron').remote;
	const models = require('../models');

	const fs = require('fs');
	const path = require('path');

	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'titleBar',
		props: {
			'note'              : Object,
			'selectedRack'      : Object,
			'selectedFolder'    : Object,
			'isFullScreen'      : Boolean,
			'isToolbarEnabled'  : Boolean,
			'selectedTheme'     : String,
			'notesDisplayOrder' : String,
			'toggleFullScreen'  : Function,
			'toggleToolbar'     : Function,
			'openSync'          : Function,
			'moveSync'          : Function,
			'openAbout'         : Function,
			'changeTheme'       : Function,
			'changeDisplayOrder': Function
		},
		data: function() {
			return {
				'search'          : "",
				'menu_visible'    : false,
				'order_visible'   : false,
				//'saveDesktop'     : true,
				'position'        : [ "right", "top", "right", "top" ],
				'isLinux'         : remote.getGlobal('isLinux'),
				'openSearch'      : false
				//'desktopEntryPath': path.join(remote.app.getPath('home'), '.local', 'share', 'applications', 'pilemd.desktop')
			};
		},
		components: {
			'dropdown': myDropdown
		},
		computed: {
			enabled() {
				return this.selectedRack || this.selectedFolder || (this.note && this.note.title);
			},
			topLevel() {
				if (this.note && this.note.title) return this.note;
				if (this.selectedFolder) return this.selectedFolder;
				if (this.selectedRack) return this.selectedRack;
				return { 'path': '' };
			},
			selectionPath() {
				var p = path.normalize(this.topLevel.path);
				if (this.note && this.note.title) p = p.replace(this.note.extension, '');
				p = path.relative(models.getBaseLibraryPath(), p);
				return p.split(path.sep);
			}
		},
		methods: {
			clear_search() {
				this.search = "";
			},
			focus_input() {
				if (!this.openSearch) this.$refs.searchinput.focus();
				this.openSearch = !this.openSearch;
				if (this.search) this.openSearch = true;
			},
			menu_openFolder() {
				this.menu_visible = false;
				this.openSync();
			},
			menu_moveFolder() {
				this.menu_visible = false;
				this.moveSync();
			},
			menu_devTools() {
				this.menu_visible = false;
				var win = remote.getCurrentWindow();
				win.webContents.openDevTools();
			},
			menu_about() {
				this.menu_visible = false;
				this.openAbout();
			},
			menu_changeTheme(value) {
				this.menu_visible = false;
				this.changeTheme(value);
			},
			menu_changeOrder(value) {
				this.order_visible = false;
				this.changeDisplayOrder(value);
			},
			menu_quit() {
				this.menu_visible = false;
				remote.app.quit();
			},
			menu_toggleToolbar() {
				this.menu_visible = false;
				this.toggleToolbar();
			},
			/*menu_desktopEntry() {
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
			},*/
			// -----------------------------------------------
			win_close() {
				var win = remote.getCurrentWindow();
				win.hide();
			},
			win_max() {
				var win = remote.getCurrentWindow();
				if(win.isMaximized()){
					win.unmaximize();
				} else {
					win.maximize();
				}
			},
			win_min() {
				var win = remote.getCurrentWindow();
				win.minimize();
			}
		},
		watch: {
			search() {
				this.$parent.search = this.search;
			}
		}
	}
</script>