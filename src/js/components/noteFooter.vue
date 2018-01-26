<template lang="pug">
	.noteBar.footer
		nav: ul
			
			li.right-align(v-if="selection > 0"): div
				| Selezione: {{ selection }}
			li.right-align(v-if="selection == 0"): div
				| Column: {{ column+1 }}
			li.right-align(v-if="selection == 0"): div
				| Line: {{ row+1 }}

</template>

<script>
	const remote = require('electron').remote;

	export default {
		name: 'noteMenu',
		data() {
			return {
				'row': 0,
				'column': 0,
				'selection': 0
			};
		},
		methods: {
		}
	}
</script>