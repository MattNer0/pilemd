<template lang="pug">
	.sidebar-menu(@click="open_note_menu", ref="addNote")
		.link.my-notes-note-title
			i.coon-file-plus
			|  New Note
</template>

<script>
	import { remote } from "electron";
	const { Menu, MenuItem } = remote;

	export default {
		name: 'addNote',
		props: {
			'selectedRack'  : Object,
			'selectedFolder': Object
		},
		methods: {
			open_note_menu() {
				var menu = new Menu();

				menu.append(new MenuItem({
					label: 'New Simple Note',
					click: () => {
						this.$root.addNote();
					}
				}));
				menu.append(new MenuItem({
					label: 'Add Note from Url',
					click: () => {
						this.$root.addNoteFromUrl();
					}
				}));
				menu.append(new MenuItem({
					label: 'New Encrypted Note',
					click: () => {
						this.$root.addEncryptedNote();
					}
				}));
				menu.append(new MenuItem({
					label: 'New Outline',
					click: () => {
						this.$root.addOutline();
					}
				}));

				var nodeRect = this.$refs.addNote.getBoundingClientRect();
				menu.popup({
					window: remote.getCurrentWindow(),
					x: Math.ceil(nodeRect.x),
					y: Math.ceil(nodeRect.y)
				});
			}
			/*newNote() {
				return this.$root.addNote();
			}*/
		}
	}
</script>