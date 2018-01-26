<template lang="pug">
	li.node(:class="{ 'with-content': withContent, 'with-nested': openNested || zoomedin || zoomedthis, 'visible-node': visibleNode, 'with-children': outlineNode.children.length > 0, 'zoom-parent': zoomedin, 'zoom-node': zoomedthis }")
		.node-circle(:class="{ 'circle-children' : outlineNode.children.length > 0 }", @click.prevent.stop="zoomThisNode")
		input.node-title(
			v-model="outlineNode.title",
			ref="input",
			@keydown.shift.enter.exact.prevent="switchToTextArea",
			@keydown.enter.exact.prevent="newNode",
			@keydown.ctrl.arrow-up.exact.prevent="closeNestedUl",
			@keydown.ctrl.arrow-down.exact.prevent="openNestedUl",

			@keydown.alt.arrow-right.exact="zoomThisNode",
			@keydown.alt.arrow-left.exact="zoomBack",

			@keydown.arrow-up.exact.prevent="jumpPreviousNode",
			@keydown.arrow-down.exact.prevent="jumpNextNode",
			@keydown.arrow-left.exact="inputMovement",
			@keydown.arrow-right.exact="inputMovement",
			@click="inputMovement"

			@keydown.tab.exact.prevent="nestNode",
			@keydown.shift.tab.exact.prevent="unNestNode",
			@keyup.backspace.exact="deleteInput"
		)
		textarea.node-content(
			v-model="outlineNode.content",
			ref="textarea",
			@keyup.backspace.exact="deleteText",
			@keydown.arrow-up.exact="switchToInput"
			@keydown.tab.exact.prevent.stop="tabText",
			@keydown.shift.tab.exact.prevent.stop="tabText",
		)
		.node-close(v-if="openNested && outlineNode.children.length > 0", @click.prevent.stop="closeNestedUl")
			| -
		.node-open(v-else-if="outlineNode.children.length > 0", @click.prevent.stop="openNestedUl")
			| +
		ul(v-if="outlineNode.children && outlineNode.children.length > 0")
			node(v-for="child in outlineNode.children" :key="child.uid" :outline-node="child" :visible-node="openNested")
</template>

<script>

	const autosize = require('autosize');

	export default {
		name: 'node',
		props: ['outlineNode', 'visibleNode'],
		data() {
			return {
				'withContent': false,
				'emptyContent': true,
				'emptyTitle': true,
				'openNested': false,
				'zoomedin': false,
				'zoomedthis': false
			};
		},
		mounted() {
			if (this.outlineNode.content) this.withContent = true;
		},
		methods: {
			getOutlineNodeOffset(child, mod) {
				var i = this.outlineNode.children.indexOf(child);
				if (!mod) mod = 0;
				return this.outlineNode.children[i+mod];
			},
			previousOutlineNode(child) {
				return this.getOutlineNodeOffset(child, -1);
			},
			getElementNodeOffset(child, mod) {
				var i = this.outlineNode.children.indexOf(child);
				if (!mod) mod = 0;
				return this.$children[i+mod];
			},
			previousElementNode(child) {
				return this.getElementNodeOffset(child, -1);
			},
			//--------------------------------------
			switchToTextArea() {
				this.withContent = true;
				this.emptyContent = true;
				this.$nextTick(() => {
					this.$refs.textarea.focus();
				});
			},
			switchToInput(event) {
				var i = this.$refs.textarea.selectionStart;
				var j = this.$refs.textarea.selectionEnd;
				if (i == 0 && j == 0) {
					event.preventDefault();
					this.focusInput();
				}
			},
			nestNode() {
				if (this.$el.previousSibling) {
					var n = this.$parent.previousOutlineNode(this.outlineNode);
					var o = this.$parent.previousElementNode(this.outlineNode);
					n.addChild(this.outlineNode);
					o.openNestedUl();
					this.$nextTick(() => {
						o.focusChildren(this.outlineNode, 0, true);
					});
				}
			},
			unNestNode() {
				if (this.outlineNode.parent) {
					var n = this.$parent.$parent;
					this.outlineNode.parentNode.parentNode.addChild(this.outlineNode, this.outlineNode.parentNode);
					this.$nextTick(() => {
						n.focusChildren(this.outlineNode, 0, true);
					});
				}
			},
			focusInput(selection) {
				if (this.zoomedin || this.zoomedthis) return;
				this.$refs.input.focus();
				if (!selection) {
					this.$refs.input.setSelectionRange(0,0);
					this.emptyTitle = true;
				} else {
					this.emptyTitle = false;
				}
			},
			newNode() {
				if (this.$refs.input.selectionStart == 0 && this.outlineNode.title.length > 0) {
					this.outlineNode.parentNode.newEmptyNode(this.outlineNode, -1);
					this.$nextTick(() => {
						this.jumpPreviousNode();
					});
					return;
				}
				var n;
				if (this.openNested && this.outlineNode.children.length > 0) {
					n = this.outlineNode.newEmptyNode(true);
				} else {
					n = this.outlineNode.parentNode.newEmptyNode(this.outlineNode);
				}

				if (this.$refs.input.selectionStart < this.outlineNode.title.length) {
					n.title = this.outlineNode.title.slice(this.$refs.input.selectionStart);
					this.outlineNode.title = this.outlineNode.title.slice(0, this.$refs.input.selectionStart);
				}

				this.$nextTick(() => {
					this.jumpNextNode();
				});
			},
			openNestedUl() {
				this.openNested = true;
			},
			closeNestedUl() {
				this.openNested = false;
			},
			focusChildren(child, mod, selection) {
				if (!child) return this.$refs.input.focus();
				var input = this.getElementNodeOffset(child, mod);
				if (input) return input.focusInput(selection);
			},
			deleteInput() {
				if (this.outlineNode.outline == this.outlineNode.parentNode && this.outlineNode.outline.nodes.length == 1) {
					return;
				}
				if ((this.outlineNode.title == '' || this.$refs.input.selectionStart == 0) && this.emptyTitle) {
					if (this.outlineNode.children.length > 0) {
						this.jumpPreviousNode(true);
					} else {
						var n = this.outlineNode.parentNode.removeNode(this.outlineNode);
						var len;
						if (n) {
							len = n.title.length;
							if (this.outlineNode.title) n.title = n.title + this.outlineNode.title;
						}
						this.jumpPreviousNode(len);
					}
				}

				if (this.outlineNode.title.length > 0 && this.$refs.input.selectionStart > 0) {
					this.emptyTitle = false;
				} else {
					this.emptyTitle = true;
				}
			},
			inputMovement(e) {
				if ((this.$refs.input.selectionStart == 1 && e.keyCode == 37) || (this.$refs.input.selectionStart == 0 && typeof e.keyCode == 'undefined')) {
					this.emptyTitle = true;
				}
				return true;
			},
			deleteText() {
				if (this.outlineNode.content == '' && this.emptyContent) {
					this.withContent = false;
					this.focusInput(true);
				} else if (this.outlineNode.content == '') {
					this.emptyContent = true;
				}
			},
			tabText() {
				return;
			},
			jumpPreviousNode(selection) {
				var inputList = document.querySelectorAll('.visible-node > .node-title');
				inputList = Array.prototype.slice.call(inputList);
				var i = inputList.indexOf(this.$refs.input);
				if (i > 0) {
					var nodeElement = inputList[i-1];
					nodeElement.focus();
					setTimeout(() => {
						if (typeof selection == 'number') nodeElement.setSelectionRange(selection,selection);
						else if (!selection) nodeElement.setSelectionRange(0,0);
					}, 0);
				}
			},
			jumpNextNode() {
				var inputList = document.querySelectorAll('.visible-node > .node-title');
				inputList = Array.prototype.slice.call(inputList);
				var i = inputList.indexOf(this.$refs.input);
				if (i < inputList.length-1) {
					var nodeElement = inputList[i+1];
					nodeElement.focus();
					nodeElement.setSelectionRange(0,0);
				}
			},
			zoomIn(array) {
				array.unshift(this);
				this.$parent.zoomIn(array);
				this.zoomedin = true;
				this.zoomedthis = false;
			},
			unzoomNode() {
				this.zoomedin = false;
				this.zoomedthis = false;
				for (var i=0; i<this.$children.length; i++) {
					this.$children[i].unzoomNode();
				}
			},
			zoomThisNode() {
				this.$parent.zoomIn([this]);
				this.zoomedthis = true;
				this.zoomedin = false;
				for (var i=0; i<this.$children.length; i++) {
					this.$children[i].unzoomNode();
					this.$children[i].openNestedUl();
				}
			},
			zoomBack() {
				if (this.zoomedthis) {
					this.$parent.zoomThisNode();
				} else {
					this.$parent.zoomBack();
				}
			}
		},
		mounted() {
			autosize(document.querySelectorAll('textarea'));
			if (this.outlineNode.content) {
				this.withContent = true;
				this.emptyContent = false;
			}
		},
		watch: {
			'outlineNode.title': function() {
				if (this.outlineNode.title) {
					this.emptyTitle = false;
				}
				this.$root.saveNote();
			},
			'outlineNode.content': function() {
				if (this.outlineNode.content) {
					this.emptyContent = false;
				}
				this.$root.saveNote();
			}
		}
	}
</script>