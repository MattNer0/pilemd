require('./modal.css');
module.exports = function(Vue) {
	Vue.prototype.$modal = function(title, description, prompts, okcb) {
		this.$dispatch('modal-show', {
			title: title,
			description: description,
			prompts: prompts,
			okcb: okcb
		});
	};
	Vue.component('modal', {
		template: require('./modal.html'),
		props: ['show', 'title', 'description', 'prompts', 'okcb'],
		methods: {
			cancel: function() {
				this.show = false;
			},
			submit: function() {
				this.okcb(this.prompts);
				this.show = false;
			}
		}
	});
};
