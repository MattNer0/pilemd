const remote = require('electron').remote;

function titleMenu(Vue, options) {

	Vue.component('titleMenu', {
		replace: true,
		props: ['selectedNote', 'selectedRackOrFolder', 'isFullScreen', 'isPreview'],
		data: function () {
			return {
				'search': ""
			};
		},
		template: require('./titleMenu.html'),
		created: function() {
			this.$watch('search', () => {
				this.$parent.search = this.search;
			});
		},
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