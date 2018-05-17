import Vue from 'vue';

import VTooltip from 'v-tooltip'
Vue.use(VTooltip);

// electron things
import { ipcRenderer, remote } from "electron";
const { Menu, MenuItem } = remote;

import theme from "./utils/theme";

// vue.js plugins
import component_titleBar from './components/titleBar.vue';

// loading CSSs
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
		message          : ""
	},
	components: {
		'titleBar'      : component_titleBar
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
			self.message = data.message;
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
		}
	},
	watch: {
		currentTheme() {
			if (this.currentTheme) theme.load(this.currentTheme);
		}
	}
});
global.appVue = appVue;
