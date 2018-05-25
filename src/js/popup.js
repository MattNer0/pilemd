import Vue from 'vue';

import VTooltip from 'v-tooltip'
Vue.use(VTooltip);

// electron things
import { ipcRenderer, remote } from "electron";
const { Menu, MenuItem } = remote;

import theme from "./utils/theme";

// vue.js plugins
import component_titleBar from './components/titleBar.vue';
import component_inputText from './components/popupInputText.vue';
import component_about from './components/popupAbout.vue';

// loading CSSs
import "../fonts/iconcoon.css";
import "../scss/pilemd.scss";

// not to accept image dropping and so on.
// electron will show local images without this.
document.addEventListener('dragover', (e) => {
	e.preventDefault();
});
document.addEventListener('drop', (e) => {
	e.preventDefault();
	e.stopPropagation();
});

var appVue = new Vue({
	el: '#main-editor',
	template: require('../html/popup.html'),
	data: {
		currentTheme     : "",
		type             : "",
		title            : "",
		message          : "",
		inputPlaceholder : "",
		inputRequired    : true,
		inputButtons     : []
	},
	components: {
		'titleBar'      : component_titleBar,
		'inputText'     : component_inputText,
		'about'         : component_about
	},
	computed: { },
	created() { },
	mounted() {
		var self = this;

		ipcRenderer.on('open-popup', (event, data) => {
			if (!data) {
				self.closingWindow();
			}

			self.currentTheme = data.theme;
			self.type = data.type;
			self.title = data.title;
			self.message = data.message ? data.message : "";

			switch(data.type) {
				case "input-text":
					switch(data.form) {
						case "note-url":
							self.inputRequired = true;
							self.inputPlaceholder = "https://...";
							self.inputButtons = [{
								label: "Cancel",
								type: "close"
							}, {
								label: "Ok",
								type: "submit",
								validate(data) {
									var expression = /[-a-zA-Z0-9@:%_+.~#?&=]{2,256}(\.[a-z]{2,4}|:\d+)\b(\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?/gi;
									var regex = new RegExp(expression);
									if (data.input_data.match(regex)) {
										return false;
									}
									// @todo gonna use this to highlight the wrong field in the form
									return 'pageurl';
								},
								callback(data) {
									//self.sendFlashMessage(1000, 'info', 'Loading page...');
									ipcRenderer.send('load-page', {
										url           : data.input_data,
										mode          : 'note-from-url',
										webpreferences: 'images=no',
										style         : { height: '10000px' }
									});
								},
							}];
							break;
						default:
							self.closingWindow();
					}
					break;
			}
		});
	},
	methods: {
		closingWindow(quit) {
			if (quit) {
				remote.app.quit();
			} else {
				var win = remote.getCurrentWindow();
				win.close();
			}
		},
		inputSubmit(input_text) {
			this.closingWindow();
		}
	},
	watch: {
		currentTheme() {
			if (this.currentTheme) theme.load(this.currentTheme);
		}
	}
});
global.appVue = appVue;
