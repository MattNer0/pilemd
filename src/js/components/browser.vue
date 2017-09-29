<template lang="pug">
	.my-browser
		.browser-bar
			nav: ul
				li.center
					a(@click.prevent="navigateBack", href="#"): span
						i.material-icons navigate_before
				li.center
					a(@click.prevent="navigateForward", href="#"): span
						i.material-icons navigate_next
				li.center
					a(@click.prevent="backToBookmark", href="#"): span
						i.material-icons home
				li.center
					a(@click.prevent="stopRefreshPage", href="#", v-if="loading"): span
						i.material-icons close
					a(@click.prevent="refreshPage", href="#", v-else): span
						i.material-icons refresh
				li.spacer
					div(v-if="currentUrl != 'about:blank'")
						span.favicon
							i.material-icons(v-if="loading") cached
							img(:src="favicon", v-else)
						input(v-model="currentUrl", type="text")

		webview(ref="browserview", id="browserview",
			v-on:page-favicon-updated="pageFaviconUpdated",
			v-on:did-finish-load="didFinishLoad",
			v-on:did-fail-load="didFailLoad",
			v-on:did-start-loading="didStartLoading",
			v-on:did-stop-loading="didStopLoading",
			v-on:load-commit="loadCommit")
</template>

<script>
	import myDropdown from 'vue-my-dropdown';

	export default {
		name: 'browser',
		props: {
			'bookmark': Object,
		},
		components: {
			'dropdown': myDropdown
		},
		data() {
			return {
				'currentUrl' : '',
				'favicon': '',
				'loading': false
			};
		},
		methods: {
			navigateBack() {
				this.$refs.browserview.goBack();
			},
			navigateForward() {
				this.$refs.browserview.goForward();
			},
			backToBookmark(bookmark) {
				bookmark = bookmark && bookmark.body ? bookmark : this.bookmark;

				if(bookmark.body && bookmark.body.indexOf('http') == 0) {
					if (this.$refs.browserview.src == bookmark.body) {
						this.refreshPage();
					} else {
						this.$refs.browserview.src = bookmark.body;
					}
					if (bookmark.attributes) this.favicon = bookmark.attributes.ICON;
				} else {
					this.$refs.browserview.src = 'about:blank';
				}
			},
			refreshPage(e) {
				this.$refs.browserview.reload();
			},
			stopRefreshPage(e) {
				this.$refs.browserview.stop();
			},
			pageFaviconUpdated(e) {
				if(e.favicons && e.favicons.length > 0) {
					this.favicon = e.favicons[0];
				}
			},
			didFinishLoad(e) {
				this.loading = false;
				this.currentUrl = this.$refs.browserview.getURL();
			},
			didFailLoad(e) {
				if (e.isMainFrame) {
					this.$root.sendFlashMessage(1000, 'error', 'Load Failed');
				}
			},
			didStartLoading(e) {
				this.loading = true;
			},
			didStopLoading(e) {
				this.loading = false;
				this.currentUrl = this.$refs.browserview.getURL();
			},
			loadCommit(e) {
				if (e.isMainFrame) {
					this.currentUrl = e.url;
				}
			},
			newBookmarLoaded(bookmark) {
				this.backToBookmark(bookmark);
			}
		},
		watch: {
			bookmark() {
				this.$nextTick(() => {
					this.backToBookmark();
				});
			}
		}
	}
</script>