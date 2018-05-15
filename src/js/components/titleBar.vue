<template lang="pug">
	.title-bar-container
		.title-bar
			.spacer(:class="{ 'darwin': isDarwin }")
				nav: ul
					li
						a.menu-icon(@click.prevent="open_main_menu", href="#"): span
							i.material-icons menu
			.spacer
				.address-bar
					span
						i.material-icons folder
						| PileMd Library
					span(v-if="showHistory && !selectedFolder && !note")
						i.material-icons chevron_right
						| History
					span(v-if="showSearch && !selectedFolder && !note")
						i.material-icons chevron_right
						| Search
					span(v-if="enabled", v-for="(path, index) in selectionPath")
						i.material-icons chevron_right
						|  {{ path }}
					span(v-if="showAll && !selectedFolder && !note")
						i.material-icons chevron_right
						| All Notes
					span(v-if="showFavorites && !selectedFolder && !note")
						i.material-icons chevron_right
						| Favorite Notes
			//-.spacer.right-align
			.spacer.system-icons(:class="{ 'darwin': isDarwin }")
				.system-icon.minimize(@click="win_min")
					i.material-icons remove
				.system-icon(@click="win_max")
					i.material-icons check_box_outline_blank
				.system-icon.close-icon(@click="win_close")
					i.material-icons close
		.title-bar-spacing
</template>

<script>
	import { remote } from "electron";
	const { Menu, MenuItem } = remote;

	import models from "../models";
	import fs from "fs";
	import path from "path";
	import elosenv from "../utils/elosenv";
	import Vue from "vue";

	export default {
		name: 'titleBar',
		props: {
			'note'              : Object,
			'selectedRack'      : Object,
			'selectedFolder'    : Object,
			'isToolbarEnabled'  : Boolean,
			'isFullWidthNote'   : Boolean,
			'showAll'           : Boolean,
			'showFavorites'     : Boolean,
			'showHistory'       : Boolean,
			'showSearch'        : Boolean,
			'notesDisplayOrder' : String,
			'toggleToolbar'     : Function,
			'toggleFullWidth'   : Function,
			'currentTheme'      : String,
			'openSync'          : Function,
			'moveSync'          : Function,
			'openAbout'         : Function,
			'changeDisplayOrder': Function
		},
		data: function() {
			return {
				'isLinux'      : elosenv.isLinux(),
				'isDarwin'     : elosenv.isDarwin()
			};
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
			open_main_menu() {
				var menu = new Menu();
				var themes_submenu = new Menu();

				themes_submenu.append(new MenuItem({
					type: 'checkbox',
					label: 'Dark',
					checked: this.currentTheme == 'dark',
					click: () => {
						this.$root.currentTheme = "dark";
					}
				}));
				themes_submenu.append(new MenuItem({
					type: 'checkbox',
					label: 'Arc Dark',
					checked: this.currentTheme == 'arc-dark',
					click: () => {
						this.$root.currentTheme = "arc-dark";
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				themes_submenu.append(new MenuItem({
					label: 'Load Custom Theme',
					click: () => {
						this.$root.loadThemeFromFile();
					}
				}));

				menu.append(new MenuItem({
					label: 'Select Library Directory',
					click: () => {
						this.openSync();
					}
				}));
				menu.append(new MenuItem({
					label: 'Move Library Directory',
					click: () => {
						this.moveSync();
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));

				menu.append(new MenuItem({
					type: 'radio',
					label: 'Sort by Update Date',
					checked: this.notesDisplayOrder == 'updatedAt',
					click: () => {
						this.changeDisplayOrder('updatedAt');
					}
				}));
				menu.append(new MenuItem({
					type: 'radio',
					label: 'Sort by Creation Date',
					checked: this.notesDisplayOrder == 'createdAt',
					click: () => {
						this.changeDisplayOrder('createdAt');
					}
				}));
				menu.append(new MenuItem({
					type: 'radio',
					label: 'Sort by Title',
					checked: this.notesDisplayOrder == 'title',
					click: () => {
						this.changeDisplayOrder('title');
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));

				menu.append(new MenuItem({
					type: 'checkbox',
					label: 'Show Note Toolbar',
					checked: this.isToolbarEnabled,
					click: () => {
						this.toggleToolbar();
					}
				}));
				menu.append(new MenuItem({
					type: 'checkbox',
					label: 'Show Note Full Width',
					checked: this.isFullWidthNote,
					click: () => {
						this.toggleFullWidth();
					}
				}));
				menu.append(new MenuItem({
					label: 'Reset Sidebar Width',
					click: () => {
						this.$root.racksWidth = 200;
						this.$root.notesWidth = 200;
						this.$root.init_sidebar_width();
						Vue.nextTick(() => {
							this.$root.save_editor_size();
						});
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));

				menu.append(new MenuItem({
					label: 'Themes',
					submenu: themes_submenu
				}));
				menu.append(new MenuItem({type: 'separator'}));

				menu.append(new MenuItem({
					label: 'About',
					click: () => {
						this.openAbout();
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));

				menu.append(new MenuItem({
					label: 'Quit',
					click: () => {
						this.$root.closingWindow(true);
					}
				}));

				menu.popup({
					window: remote.getCurrentWindow(),
					x: 5,
					y: 5
				});
			},
			// -----------------------------------------------
			win_close() {
				this.$root.closingWindow(false);
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
		}
	}
</script>