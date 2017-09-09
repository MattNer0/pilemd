<template lang="pug">
	.my-notes
		.my-separator
			.my-notes-note.new-note
				h5.my-notes-note-title(@click.prevent="$root.addNote()")
					i.material-icons add_circle_outline
					|  New Note
					i.material-icons.right-icon(@click.prevent.stop="addnote_visible = !addnote_visible") more_horiz
				dropdown(:visible="addnote_visible", :position="position", v-on:clickout="addnote_visible = false")
					.link
					.dialog(slot="dropdown"): ul
						li: a(@click.prevent="$root.addNote()", href="#")
							i.material-icons note_add
							|  New Simple Note
						li: a(@click.prevent="$root.addEncryptedNote()", href="#")
							i.material-icons note_add
							|  New Encrypted Note
</template>

<script>
	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'addNote',
		components: {
			'dropdown': myDropdown
		},
		data() {
			return {
				'addnote_visible': false,
				'position': [ "left", "bottom", "left", "top" ]
			};
		}
	}
</script>