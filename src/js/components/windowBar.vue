<template lang="pug">
	div
		.system-bar-spacing
		.system-bar
			.spacer
			.system-icon.minimize(@click="win_min")
				i.material-icons remove
			.system-icon(@click="win_max")
				i.material-icons check_box_outline_blank
			.system-icon.close-icon(@click="win_close")
				i.material-icons close
		.system-bar-spacing
</template>

<script>
	const remote = require('electron').remote;

	export default {
		name: 'windowBar',
		methods: {
			win_close: function() {
				setTimeout(function() {
					var win = remote.getCurrentWindow();
					win.close();
				}, 100);
			},
			win_max: function() {
				setTimeout(function() {
					var win = remote.getCurrentWindow();
					if(win.isMaximized()){
						win.unmaximize();
					} else {
						win.maximize();
					}
				}, 100);
			},
			win_min: function() {
				setTimeout(function() {
					var win = remote.getCurrentWindow();
					win.minimize();
				}, 100);
			}
		}
	}
</script>