module.exports = function(Vue, options) {

	Vue.prototype.$message = function(level, text, period, url) {
		if (!period) {
			period = 3000
		}
		var message = {level: 'flashmessage-' + level, text: text, period: period, url: url};
		this.$dispatch('flashmessage-push', message);
	};

	Vue.component('flashmessage', {
		replace: false,
		template: require('./flashmessage.html'),
		props: ['messages']
	})
};
