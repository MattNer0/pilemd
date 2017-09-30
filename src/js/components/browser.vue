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

		webview(ref="browserview", id="browserview", src="about:blank",
			v-on:page-favicon-updated="pageFaviconUpdated",
			v-on:did-finish-load="didFinishLoad",
			v-on:did-fail-load="didFailLoad",
			v-on:did-start-loading="didStartLoading",
			v-on:did-stop-loading="didStopLoading",
			v-on:load-commit="loadCommit",
			v-on:dom-ready="domReady")
</template>

<script>
	import myDropdown from 'vue-my-dropdown';

	const electron = require('electron');
	const {remote, ipcRenderer} = electron;

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
				'initialized': false,
				'currentUrl' : 'about:blank',
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

				if(bookmark && bookmark.body && bookmark.body.indexOf('http') == 0) {
					this.$refs.browserview.src = bookmark.body;
					this.$refs.browserview.loadURL(bookmark.body);
					this.currentUrl = bookmark.body;
					if (bookmark.attributes) this.favicon = bookmark.attributes.ICON;
				} else {
					this.$refs.browserview.src = 'about:blank';
					this.$refs.browserview.loadURL('about:blank');
					this.currentUrl = 'about:blank';
					this.refreshPage();
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
			},
			domReady(e) {
				if(!this.initialized) {
					this.initialized = true;
					this.$refs.browserview.getWebContents().on('context-menu', this.contextMenu);
				}
			},
			contextMenu(e, props) {
				var win = remote.getCurrentWindow();

				if (props.isEditable) {
					var menuTemplate = [{
						label: 'Undo',
						role: 'undo',
					}, {
						label: 'Redo',
						role: 'redo',
					}, {
						type: 'separator',
					}, {
						label: 'Cut',
						role: 'cut',
					}, {
						label: 'Copy',
						role: 'copy',
					}, {
						label: 'Paste',
						role: 'paste',
					}, {
						type: 'separator',
					}, {
						label: 'Select all',
						role: 'selectall',
					}];
				} else if (props.selectionText && props.selectionText.trim() !== '') {
					var menuTemplate = [{
						label: 'Copy',
						role: 'copy',
					}, {
						type: 'separator',
					}, {
						label: 'Select all',
						role: 'selectall',
					}];
				} else if (props.mediaType == 'image') {
					var menuTemplate = [{
						label: 'Save Image',
						click() {
							ipcRenderer.send('download-btn', { url: props.srcURL });
						}
					}, {
						type: 'separator',
					}, {
						label: 'Save Image As',
						click() {
							ipcRenderer.send('download-btn', { url: props.srcURL, options: { saveAs: true } });
						}
					}];
				}

				if (menuTemplate) {
					var contextMenuElectron = remote.Menu.buildFromTemplate(menuTemplate);
					contextMenuElectron.popup(win);
				}
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