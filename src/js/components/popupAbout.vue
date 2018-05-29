<template lang="pug">
	div
		p
			| PileMd was originally created by Hiroki KIYOHARA.
			br
			| The full list of Authors is available on GitHub.
			br
			| This Fork with updated components and additional features is maintained by MattNer0.
		p
			i.coon-github
			|  
			a(href="#", @click.prevent.stop="openRepo") Github Repository
</template>

<script>
	import { shell } from "electron";

	export default {
		name: 'about',
		methods: {
			openRepo() {
				shell.openExternal("https://github.com/MattNer0/pilemd")
			}
		}
	}
</script>