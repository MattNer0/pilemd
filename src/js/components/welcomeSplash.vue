<template lang="pug">
	div
		.splash-box(v-if="keepHistory && notes.length > 0")
			.title Recent Notes
			ul.list
				li(v-for="note in notes", v-bind:key="note.uid", v-on:click="selectNote(note)")
					span
						i.material-icons folder_special
						| {{ note.data.rack.name }}
					span
						i.material-icons.alone chevron_right
					span
						i.material-icons folder
						| {{ note.data.folder.name }}
					span
						i.material-icons.alone chevron_right
					span
						i.material-icons description
						| {{ note.title }}
			hr
			ul.list.right
				li
					span(v-on:click="toggleKeepHistory")
						i.material-icons(v-if="keepHistory") check_box
						i.material-icons(v-else) check_box_outline_blank
						| Keep Recent Notes List
				
		.splash-box(v-else)
			.title Welcome to PileMd
			ul.list.right
				li
					span(v-on:click="toggleKeepHistory")
						i.material-icons(v-if="keepHistory") check_box
						i.material-icons(v-else) check_box_outline_blank
						| Keep Recent Notes List
</template>

<script>
	export default {
		name: 'welcomeSplash',
		props: {
			'notes'      : Array,
			'keepHistory': Boolean,
			'changeNote' : Function
		},
		computed: { },
		methods: {
			selectNote(note) {
				this.changeNote(note);
			},
			toggleKeepHistory() {
				this.$root.keepHistory = !this.keepHistory;
			}
		}
	}
</script>