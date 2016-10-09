const remote = require('electron').remote;

function titleMenu(Vue, options) {

	Vue.component('titleMenu', {
		replace: true,
		props: ['selectedNote', 'selectedRackOrFolder', 'isFullScreen', 'isPreview'],
		template: require('./titleMenu.html'),
		methods: {

			menu_preview: function() {
				this.$parent.isPreview = !this.$parent.isPreview;
			},

			menu_devTools: function() {
				var win = remote.getCurrentWindow();
				win.webContents.openDevTools();
			}
		}
	});
}

module.exports = titleMenu;