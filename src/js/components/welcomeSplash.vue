<template lang="pug">
	div
		.splash-box
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
</template>

<script>
	export default {
		name: 'welcomeSplash',
		props: {
			'notes'     : Array,
			'changeNote': Function
		},
		computed: { },
		methods: {
			selectNote(note) {
				this.changeNote(note);
			}
		}
	}
</script>