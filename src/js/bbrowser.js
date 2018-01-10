const { ipcRenderer } = require('electron');

const htmlToMarkdown = require('./background_tasks/htmlToMarkdown');
const downloadHelper = require('./background_tasks/download');

/**
 * @function logError
 * @param  {type} message {description}
 * @return {type} {description}
 */
function logMainProcess(message) {
	ipcRenderer.send('console', message);
}

var webviewEl;
function setWebviewData(data) {
	if (!data) {
		ipcRenderer.send('kill-bbrowser');
		return;
	}
	
	var style;
	if (data) style = data.style;
	if (style && style.height) webviewEl.style.height = style.height;
	else webviewEl.style.height = '960px';

	if (data && data.webpreferences) webviewEl.webpreferences = data.webpreferences;
	else webviewEl.webpreferences = '';

	if (data && data.bookmark) webviewEl.bookmark = data.bookmark;
	else webviewEl.bookmark = '';

	webviewEl.src = '';
	webviewEl.title = '';
}

function compressThumbnail(thumbnail) {
	thumbnail = thumbnail.resize({ width: 150 });
	return thumbnail.toDataURL();
}

window.onload = function () {
	webviewEl = document.getElementById('webview');
	webviewEl.addEventListener('page-favicon-updated', (e) => {
		try {
			if (e.favicons && e.favicons.length > 0) {
				downloadHelper.getBase64Image(e.favicons[0], (faviconData) => {
					switch (webviewEl.title) {
						case 'bookmark-thumb':
							ipcRenderer.send('load-page-favicon', {
								url     : webviewEl.src,
								mode    : webviewEl.title,
								bookmark: webviewEl.bookmark,
								faviconUrl : e.favicons[0],
								faviconData: faviconData
							});
							break;
						default:
							break;
					}
				});
			}
		} catch(e) {
			logMainProcess(e.message);
		}
	});
	webviewEl.addEventListener('dom-ready', (e) => {

		function waitAndSendThumb() {
			setTimeout(() => {
				var title = webviewEl.getTitle();
				webviewEl.capturePage((img) => {
					ipcRenderer.send('load-page-success', {
						url     : webviewEl.src,
						mode    : 'bookmark-thumb',
						bookmark: webviewEl.bookmark,
						pageTitle : title,
						pageCapture: compressThumbnail(img)
					});
					setWebviewData();
				});
			}, 4000);
		}

		try {
			switch (webviewEl.title) {
				case 'note-from-url':
					webviewEl.getWebContents().executeJavaScript(htmlToMarkdown.parseScript(), (result) => {
						var new_markdown = htmlToMarkdown.convert(result, webviewEl.src, webviewEl.getTitle());
						ipcRenderer.send('load-page-success', {
							url     : webviewEl.src,
							mode    : webviewEl.title,
							markdown: new_markdown
						});
						setWebviewData();
					});
					break;
				case 'bookmark-thumb':
					waitAndSendThumb();
					break;
				case 'bookmark-meta':
					webviewEl.getWebContents().executeJavaScript(
						'document.querySelector(\'head\').innerHTML + document.querySelector(\'body\').innerHTML',
						(result) => {
							var shortcut = (/rel=['"`]shortcut icon['"`][^<>]+?href=['"`](http.+?)['"`]/gi).exec(result) ||
											(/<img[^>]+?src=['"`](http.+?profile[-_]images.+?)['"`]/gi).exec(result);
							var og_image = (/property=['"`]og:image['"`][^<>]+?content=['"`](http.+?)['"`]/gi).exec(result) ||
											(/content=['"`](http.+?)['"`][^<>]+?property=['"`]og:image['"`]/gi).exec(result);
							var avatar_image = (/class=['"`]avatar['"`][^<>]+>[^<>]+<img[^<>]+src=['"`](http.+?)['"`]/gi).exec(result);
							var user_profile = result.match(/https?:\/\/[a-z0-9.-]+?\/user-profile\/img[^.<>]+\.(jpg|png|gif)/gi);

							if (user_profile || shortcut || og_image || avatar_image) {
								var image_url;
								if (user_profile) image_url = user_profile[0];
								else if(avatar_image) image_url = avatar_image[1];
								else if(shortcut) image_url = shortcut[1];
								else if(og_image) image_url = og_image[1];

								webviewEl.title = 'bookmark-meta2';
								webviewEl.loadURL(image_url);
							} else {
								ipcRenderer.send('load-page-fail', {
									url : webviewEl.src,
									mode: webviewEl.title
								});
								setWebviewData();
							}
						}
					);
					break;
				case 'bookmark-meta2':
					webviewEl.getWebContents().insertCSS('img { width: 100% !important; height: auto; }');
					waitAndSendThumb();
					break;
				default:
					setWebviewData();
					break;
			}
		} catch(e) {
			logMainProcess(e.message);
		}
	});
	webviewEl.addEventListener('did-fail-load', (e) => {
		if (e.isMainFrame && e.errorCode > 0) {
			logMainProcess('page load failed: '+webviewEl.src);
			logMainProcess('error '+e.errorCode+': '+e.errorDescription);
			ipcRenderer.send('load-page-fail', {
				url : webviewEl.src,
				mode: webviewEl.title
			});
			setWebviewData();
		}
	});

	/*webviewEl.addEventListener('did-finish-load', (e) => {
		if (webviewEl.src && webviewEl.src != 'about:blank') {
			ipcRenderer.send('load-page-finish', {
				url : webviewEl.src,
				mode: webviewEl.title
			});
		}
	});*/

	ipcRenderer.on('load-page', (event, data) => {
		if (!data.url) return logMainProcess('load page: url missing');
		try {
			setWebviewData(data);
			webviewEl.title = data.mode || 'undefined';
			webviewEl.loadURL(data.url);
		} catch(e) {
			logMainProcess(e.message);
		}
	});
};
