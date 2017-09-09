<template lang="pug">
	#handlerStack.resize-handler(draggable="true", @dragstart="dragstart", @dragend="dragend")
</template>

<script>
	export default {
		name: 'handlerStack',
		props: {
			'sidebarDrag': Function,
			'sidebarDragEnd': Function
		},
		data() {
			return {
				initialPos: {
					x: 0,
					y: 0
				},
				start_width: 0,
				min_width: 180,
				max_width: 400,
				dragging: false
			};
		},
		mounted() {
			this.$nextTick(() => {
				this.$parent.$el.addEventListener('dragover', (e) => {
					this.drag(e);
				});
			});
		},
		methods: {
			dragstart(e) {
				// hide the 'ghost' of the draggin element
				e.dataTransfer.setDragImage(document.createElement('div'), 0, 0);
				e.dataTransfer.setData('text/plain', '');

				this.dragging = true;
				this.start_width = this.$el.previousElementSibling.offsetWidth;
				this.initialPos = {
					x: e.pageX,
					y: e.pageY
				};
			},
			dragend(e) {
				this.dragging = false;
				this.sidebarDragEnd();
			},
			drag(e) {
				// prevent to emit unwanted value on dragend
				if (!this.dragging) return;
				if (e.screenX === 0 && e.screenY === 0) return;

				var new_width = this.start_width + e.pageX - this.initialPos.x;
				if (new_width >= this.min_width && new_width <= this.max_width) {
					this.$el.previousElementSibling.style.width = new_width + 'px';
					this.sidebarDrag();
				}
			}
		}
	}
</script>