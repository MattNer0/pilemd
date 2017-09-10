<template lang="pug">
	div
		.system-bar-spacing
		.system-bar
			.spacer
				span
					| PileMd Library
				span(v-if="enabled && rack")
					i.material-icons chevron_right
					|  {{ rack.name }}
				span(v-if="enabled && folder")
					i.material-icons chevron_right
					|  {{ folder.name }}
				span(v-if="note && note.title")
					i.material-icons chevron_right
					|  {{ note.title }}
			.system-icon.minimize(@click="win_min")
				i.material-icons remove
			.system-icon(@click="win_max")
				i.material-icons check_box_outline_blank
			.system-icon.close-icon(@click="win_close")
				i.material-icons close
		.system-bar-spacing
</template>

<script>
	const remote = require('electron').remote;
	const models = require('../models');

	export default {
		name: 'windowBar',
		props: {
			'note': Object,
			'rackFolder': Object
		},
		computed: {
			enabled() {
				return this.rackFolder || this.note;
			},
			rack() {
				if (this.note && this.note.title) {
					return this.note.data.rack;
				} else if(this.rackFolder) {
					if (this.rackFolder instanceof models.Folder) {
						return this.rackFolder.data.rack;
					} else {
						return this.rackFolder;
					}
				}
				return undefined;
			},
			folder() {
				if (this.note && this.note.title) {
					return this.note.data.folder;
				} else if(this.rackFolder) {
					if (this.rackFolder instanceof models.Folder) {
						return this.rackFolder;
					}
				}
				return undefined;
			},
		},
		methods: {
			win_close() {
				setTimeout(() => {
					var win = remote.getCurrentWindow();
					win.hide();
				}, 100);
			},
			win_max() {
				setTimeout(() => {
					var win = remote.getCurrentWindow();
					if(win.isMaximized()){
						win.unmaximize();
					} else {
						win.maximize();
					}
				}, 100);
			},
			win_min() {
				setTimeout(() => {
					var win = remote.getCurrentWindow();
					win.minimize();
				}, 100);
			}
		}
	}
</script>