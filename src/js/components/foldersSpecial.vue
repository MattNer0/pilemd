<template lang="pug">
	.my-shelf-folders(v-if="bucket.folders.length > 0")
		.my-shelf-folder-bucket(@contextmenu.prevent.stop="")
			i.material-icons delete
			| {{ bucket.name }}
		.my-shelf-folder.my-all(
			v-if="bucket.folders.length > 1 && bucket.allnotes.length > 0",
			@contextmenu.prevent.stop="",
			:class="{ 'isShelfSelected': showAll }")
			.folder-object(@click="selectAll(bucket)", :class="{ 'dragging' : draggingFolder }")
				a.my-shelf-folder-name
					i.material-icons view_list
					|  All
					span.my-shelf-folder-badge(v-if="search", v-show="bucket.searchnotes(search).length > 0")
						| {{ bucket.searchnotes(search).length }} 
						i.material-icons description
					span.my-shelf-folder-badge(v-else)
						| {{ bucket.allnotes.length }} 
						i.material-icons description

		.my-shelf-folder.my-favorites(
			@contextmenu.prevent.stop="",
			v-if="bucket.starrednotes.length > 0"
			:class="{ 'isShelfSelected': showFavorites }")
			.folder-object(@click="selectFavorites(bucket)", :class="{ 'dragging' : draggingFolder }")
				a.my-shelf-folder-name
					i.material-icons star
					|  Favorites
					span.my-shelf-folder-badge(v-if="search", v-show="bucket.searchstarrednotes(search).length > 0")
						| {{ bucket.searchstarrednotes(search).length }} 
						i.material-icons description
					span.my-shelf-folder-badge(v-else)
						| {{ bucket.starrednotes.length }} 
						i.material-icons description
</template>

<script>

	export default {
		name: 'foldersSpecial',
		props: {
			'bucket'              : Object,
			'showAll'             : Boolean,
			'showFavorites'       : Boolean,
			'draggingFolder'      : Object,
			'search'              : String
		},
		methods: {
			selectAll(bucket) {
				this.$root.showAllRack(bucket);
			},
			selectFavorites(bucket) {
				this.$root.showFavoritesRack(bucket);
			}
		}
	}

</script>