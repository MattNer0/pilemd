<template lang="pug">
	.sidebar-menu(@click="addnote_visible = !addnote_visible")
		dropdown(:visible="addnote_visible", :position="position", v-on:clickout="addnote_visible = false")
			.link.my-notes-note-title
				i.material-icons add_circle_outline
				|  New Note
			.dialog(slot="dropdown"): ul
				li: a(@click.prevent.stop="menu_addNote", href="#")
					i.material-icons note_add
					|  New Simple Note
				li: a(@click.prevent.stop="menu_fromUrl", href="#")
					i.material-icons note_add
					|  Add Note from Url
				li: a(@click.prevent.stop="menu_addEncrypted", href="#")
					i.material-icons note_add
					|  New Encrypted Note
				li: a(@click.prevent.stop="menu_addOutline", href="#")
					i.material-icons note_add
					|  New Outline
</template>

<script>
	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'addNote',
		props: {
			'selectedRack'  : Object,
			'selectedFolder': Object
		},
		components: {
			'dropdown': myDropdown
		},
		data() {
			return {
				'addnote_visible': false,
				'position': [ "left", "bottom", "left", "top" ]
			};
		},
		methods: {
			menu_addNote() {
				this.addnote_visible = false;
				setTimeout(() => {
					this.$root.addNote();
				}, 100);
			},
			menu_addOutline() {
				this.addnote_visible = false;
				setTimeout(() => {
					this.$root.addOutline();
				}, 100);
			},
			menu_fromUrl() {
				this.addnote_visible = false;
				setTimeout(() => {
					this.$root.addNoteFromUrl();
				}, 100);
			},
			menu_addEncrypted() {
				this.addnote_visible = false;
				setTimeout(() => {
					this.$root.addEncryptedNote();
				}, 100);
			},
			newNote() {
				return this.$root.addNote();
			}
		}
	}
</script>