<template lang="pug">
	.noteBar.footer
		nav: ul
			li.right-align(v-if="selection == 0"): div
				| Words Count: {{ wordscount }}
			li.right-align(v-if="selection > 0"): div
				| Words in Selection: {{ wordscount }}
			li.right-align(v-if="selection > 0"): div
				| Selection: {{ selection }}
			li.right-align(v-if="selection == 0"): div
				| Column: {{ column }}
			li.right-align(v-if="selection == 0"): div
				| Line: {{ row+1 }}
</template>

<script>
	export default {
		name: 'noteMenu',
		data() {
			return {
				'row': 0,
				'column': 0,
				'selection': 0,
				'wordscount': 0
			};
		},
		methods: {
		}
	}
</script>