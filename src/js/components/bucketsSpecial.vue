<template lang="pug">
	.my-shelf-buckets(v-if="buckets.length > 0", @contextmenu.prevent.stop="")
		//-.my-shelf-rack(
			:class="{ 'disabled' : selectedBucket === null && !showHistory && !showSearch }"
			v-tooltip="{ 'content': 'Toggle Sidebar', 'placement': 'left' }")
			.rack-object(@click="toggleFullScreen()")
				i.material-icons.rack-icon(v-if="isFullScreen") chevron_right
				i.material-icons.rack-icon(v-else) first_page
		.my-shelf-rack(
			:class="{ 'isShelfSelected' : showSearch }"
			v-tooltip="{ 'content': 'Search', 'placement': 'left' }")
			.rack-object.bucket-special(@click="openSearch()")
				i.rack-icon.coon-search
		.my-shelf-rack(
			:class="{ 'isShelfSelected' : showHistory }"
			v-tooltip="{ 'content': 'History', 'placement': 'left' }")
			.rack-object.bucket-special(@click="openHistory()")
				i.rack-icon.coon-clock
</template>

<script>

	export default {
		name: 'bucketsSpecial',
		props: {
			'buckets'             : Array,
			'selectedBucket'      : Object,
			'isFullScreen'        : Boolean,
			'toggleFullScreen'    : Function,
			'showHistory'         : Boolean,
			'showSearch'          : Boolean
		},
		methods: {
			openHistory() {
				this.$root.openHistory();
			},
			openSearch() {
				this.$root.openSearch();
			}
		}
	}

</script>