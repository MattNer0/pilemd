<template lang="pug">
	.tabs-bar(v-if="tabsArray.length > 1")
		div
			.tab(v-for="(note, index) in tabsArray", @click.prevent.stop="selectNote(note)", :class="{ 'selected': note == currentNote }")
				i.material-icons.close(@click.prevent.stop="removeTab(note, index)") close
				i.material-icons description
				|  {{ note.title }}
</template>

<script>
	import models from "../models";

	export default {
		name: 'tabsBar',
		props: {
			'currentNote'    : Object,
			'tabsArray'      : Array,
		},
		computed: {
		},
		methods: {
			selectNote(note) {
				this.$root.changeNote(note);
			},
			removeTab(note, index) {
				if (note == this.currentNote) {
					if (index > 0) {
						this.$root.changeNote(this.tabsArray[index-1]);
					} else if(this.tabsArray.length > 1) {
						this.$root.changeNote(this.tabsArray[index+1]);
					} else {
						this.$root.changeNote(null);
					}
				}
				this.$root.noteTabs.splice(index, 1);
			}
		}
	}
</script>