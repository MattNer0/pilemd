<template lang="pug">
	.my-editor-preview.my-editor-outline
		div(:class="{ 'focus-outline': zoomedin }")
			.breadcrumbs(v-if="breadcrumbs.length > 0")
				.crumb(v-for="crumb in breadcrumbs", :key="crumb.outlineNode.uid", @click.prevent.stop="openCrumb(crumb)")
					| {{ crumb.outlineNode.title }}
			input.h1(v-model="outlineNote.title", v-show="breadcrumbs.length == 0")
			input.h2(v-model="lastCrumb.outlineNode.title", v-if="lastCrumb", v-show="breadcrumbs.length > 0", @keydown.shift.enter.exact.prevent="switchToTextArea")
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
		data() {
			return {
				'zoomedin': false,
				'breadcrumbs': [],
				'lastCrumb' : null
			};
		},
		computed: {
			outlineNode() {
				return this.outlineNote;
			}
		},
		components: {
			'node' : component_nodeOutline
		},
		mounted() {
			for (var i=0; i<this.$children.length; i++) {
				this.$children[i].openNestedUl();
			}
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
			},
			zoomIn(nodes_array) {
				this.zoomedin = true;
				this.lastCrumb = nodes_array.pop();
				nodes_array.unshift(this);
				this.breadcrumbs = nodes_array;
			},
			zoomThisNode() {
				this.zoomedin = false;
				this.breadcrumbs = [];
				this.lastCrumb = null;
				for (var i=0; i<this.$children.length; i++) {
					this.$children[i].unzoomNode();
				}
			},
			zoomBack() {
				this.zoomThisNode();
			},
			openCrumb(element) {
				element.zoomThisNode();
			},
			switchToTextArea() {
				if (this.lastCrumb) this.lastCrumb.switchToTextArea();
			}
		},
		watch: {
			'outlineNote.title': function() {
				if (this.outlineNote) this.$root.saveNote();
			}
		}
	}
</script>