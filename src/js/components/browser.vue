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
				li.center
					a(@click.prevent="pageMuted(false)", href="#", v-if="isMuted"): span
						i.material-icons volume_off
					a(@click.prevent="pageMuted(true)", href="#", v-else): span
						i.material-icons volume_up

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
	const { remote, ipcRenderer, clipboard } = electron;

	const models = require('../models');

	export default {
		name: 'browser',
		props: {
			'bookmark': Object,
			'bookmarksDomains': Array,
			'sendFlashMessage': Function
		},
		components: {
			'dropdown': myDropdown
		},
		data() {
			return {
				'initialized': false,
				'currentUrl' : 'about:blank',
				'favicon': '',
				'loading': false,
				'isMuted': false,
				'webOptions': {}
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
			pageMuted(muted) {
				console.log(muted);
				this.isMuted = muted;
				this.$refs.browserview.setAudioMuted(muted);
			},
			pageFaviconUpdated(e) {
				if(e.favicons && e.favicons.length > 0) {
					this.favicon = e.favicons[0];
				}
			},
			didFinishLoad(e) {
				this.loading = false;
				this.webOptions = {};
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
				this.clearCookies();
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
			clearCookies() {
				// clear third party cookies
				var self = this;
				var win = remote.getCurrentWindow();

				function remove(cookie) {
					var url = "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path;
					var dom = models.BookmarkFolder.getDomain({ body: url});
					if(self.bookmarksDomains.indexOf(dom) >= 0) return;
					webc.cookies.remove(
						url,
						cookie.name,
						function(err) {
							if(err) console.warn(err);
							//console.log('cookie delete', dom, cookie.name);
						}
					);
				}

				var webc = win.webContents.session;
				webc.cookies.get({}, function(err, cookies) {
					if(err) console.error(err);
					for (var i = 0; i < cookies.length; i++) {
						remove(cookies[i]);
					}
				});
			},
			clearAllCookies() {
				var self = this;
				var win = remote.getCurrentWindow();

				function remove(cookie) {
					var url = "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path;
					webc.cookies.remove(
						url,
						cookie.name,
						function(err) {
							if(err) console.warn(err);
							console.log('cookie delete', dom, cookie.name);
						}
					);
				}

				var webc = win.webContents.session;
				webc.cookies.get({}, function(err, cookies) {
					if(err) console.error(err);
					for (var i = 0; i < cookies.length; i++) {
						remove(cookies[i]);
					}
				});
			},
			contextMenu(e, props) {
				var self = this;
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
						type: 'separator'
					}, {
						label: 'Save Image As',
						click() {
							ipcRenderer.send('download-btn', { url: props.srcURL, options: { saveAs: true } });
						}
					}];
				} else if (props.linkURL) {
					var menuTemplate = [{
						label: 'Open Url',
						click() {
							self.backToBookmark({ body: props.linkURL });
						}
					}, {
						type: 'separator'
					}, {
						label: 'Copy Link Address',
						click() {
							clipboard.writeText(props.linkURL);
							self.sendFlashMessage(2000, 'info', 'Url Copied to Clipboard');
						}
					}];
				} else {
					var menuTemplate = [{
						label: 'Back',
						enabled: self.$refs.browserview.canGoBack(),
						click() {
							self.navigateBack();
						}
					}, {
						label: 'Forward',
						enabled: self.$refs.browserview.canGoForward(),
						click() {
							self.navigateForward();
						}
					}, {
						label: 'Reload',
						click() {
							self.refreshPage();
						}
					}, {
						type: 'separator'
					}, {
						label: 'Clear History',
						click() {
							self.$refs.browserview.clearHistory();
						}
					}, {
						label: 'Clear All Cookies',
						click() {
							self.clearAllCookies();
						}
					}];

					if (self.$refs.browserview.isDevToolsOpened()) {
						menuTemplate.push({
							label: 'Close Dev Tools',
							click() {
								self.$refs.browserview.closeDevTools();
							}
						})
					} else {
						menuTemplate.push({
							label: 'Open Dev Tools',
							click() {
								self.$refs.browserview.openDevTools();
							}
						})
					}

					if (self.currentUrl.indexOf('https://twitter.com/') == 0 && !self.webOptions['twitter'] ) {
						menuTemplate.unshift({ type: 'separator' });
						menuTemplate.unshift({
							label: 'Show Hidden Content',
							click() {
								self.webOptions['twitter'] = true;
								self.$refs.browserview.insertCSS(
									'.Tombstone + .u-hidden{display:inherit !important;} .Tombstone{display:none !important;}'
								);
							}
						});
					}
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