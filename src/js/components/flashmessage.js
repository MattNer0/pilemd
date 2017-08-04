module.exports = function(Vue) {

	/*Vue.prototype.$message = function(level, text, period, url) {
		if (!period) {
			period = 3000;
		}
		var message = {level: 'flashmessage-' + level, text: text, period: period, url: url};
		this.$dispatch('flashmessage-push', message);
	};*/

	Vue.component('flashmessage', {
		template: require('./flashmessage.html'),
		props: ['messages'],
		methods: {
			openUrl: function(url) {
				require('electron').shell.openExternal('' + url + '');
			}
		}
	});
};
