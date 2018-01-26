<template lang="pug">
	.my-editor-preview.my-editor-outline
		div
			input.h1(v-model="outlineNote.title")
			ul
				node(
					v-for="child in outlineNote.nodes",
					:key="child.uid",
					:outline-node="child",
					:visible-node="true"
					ref="child"
				)
</template>

<script>

	import component_nodeOutline from './nodeOutline.vue';

	export default {
		name: 'outline',
		props: {
			'outlineNote': Object
		},
		components: {
			'node' : component_nodeOutline
		},
		mounted() {
			console.log(this.outlineNote);
		},
		methods: {
			getOutlineNodeOffset(child, mod) {
				var i = this.outlineNote.nodes.indexOf(child);
				if (!mod) mod = 0;
				return this.outlineNote.nodes[i+mod];
			},
			previousOutlineNode(child) {
				return this.getOutlineNodeOffset(child, -1);
			},
			getElementNodeOffset(child, mod) {
				var i = this.outlineNote.nodes.indexOf(child);
				if (!mod) mod = 0;
				return this.$children[i+mod];
			},
			previousElementNode(child) {
				return this.getElementNodeOffset(child, -1);
			},
			//--------------------------------------
			focusChildren(child, mod, selection) {
				if (!child) return;
				return this.getElementNodeOffset(child, mod).focusInput(selection);
			}
		},
	}
</script>