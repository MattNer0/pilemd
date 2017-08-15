<template lang="pug">
	div
		.system-bar-spacing
		.system-bar
			.spacer
			.system-icon(@click="win_min")
				i.material-icons remove
			.system-icon(@click="win_max")
				i.material-icons check_box_outline_blank
			.system-icon.close-icon(@click="win_close")
				i.material-icons close
		.system-bar-spacing
</template>

<script>
	const Vue = require('vue');
	const remote = require('electron').remote;

	export default {
		name: 'windowBar',
		methods: {
			win_close: function() {
				Vue.nextTick(function() {
					var win = remote.getCurrentWindow();
					win.close();
				});
			},
			win_max: function() {
				Vue.nextTick(function() {
					var win = remote.getCurrentWindow();
					if(win.isMaximized()){
						win.unmaximize();
					} else {
						win.maximize();
					}
				});
			},
			win_min: function() {
				Vue.nextTick(function() {
					var win = remote.getCurrentWindow();
					win.minimize();
				});
			}
		}
	}
</script>