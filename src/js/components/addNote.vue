<template lang="pug">
	.my-notes(v-if="selectedFolder")
		.my-separator
			.my-notes-note.new-note
				h5.my-notes-note-title(@click.prevent="newNote")
					i.material-icons add_circle_outline
					template(v-if="notesList")
						|  New Note
					template(v-else)
						|  New Bookmark
					i.material-icons.right-icon(@click.prevent.stop="addnote_visible = !addnote_visible", v-if="notesList") more_horiz
				dropdown(:visible="addnote_visible", :position="position", v-on:clickout="addnote_visible = false", v-if="notesList")
					.link
					.dialog(slot="dropdown"): ul
						li: a(@click.prevent="menu_addNote", href="#")
							i.material-icons note_add
							|  New Simple Note
						li: a(@click.prevent="menu_fromUrl", href="#")
							i.material-icons note_add
							|  Add Note from Url
						li: a(@click.prevent="menu_addEncrypted", href="#")
							i.material-icons note_add
							|  New Encrypted Note
						li: a(@click.prevent="menu_addOutline", href="#")
							i.material-icons note_add
							|  New Outline
</template>

<script>
	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'addNote',
		props: {
			'selectedRackOrFolder': Object,
			'selectedFolder': Object,
			'notesList': Boolean
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
				if (this.notesList) {
					return this.$root.addNote();
				} else {
					return this.$root.addBookmark(this.selectedRackOrFolder);
				}
			}
		}
	}
</script>