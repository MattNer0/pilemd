<template lang="pug">
	.flashmessage-list
		p.flashmessage-message(v-for="message in messages", transition="flashmessage-message", :class="[message.level]")
			template(v-if="message.url")
				a(href="#", v-bind:onclick="openUrl(url)") {{ message.text }}
			template(v-else)
				| {{ message.text }}
</template>

<script>
	const Vue = require('vue');
	Vue.prototype.$message = function(level, text, period, url) {
		if (!period) {
			period = 3000;
		}
		var message = {level: 'flashmessage-' + level, text: text, period: period, url: url};
		this.$dispatch('flashmessage-push', message);
	};
	export default {
		name: 'flashmessage',
		props: ['messages'],
		methods: {
			openUrl: function(url) {
				require('electron').shell.openExternal('' + url + '');
			}
		}
	}
</script>