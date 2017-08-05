<template lang="pug">
	#handlerNotes.resize-handler(draggable="true", @dragstart="dragstart", @dragend="dragend")
</template>

<script>
	export default {
		name: 'handlerNotes',
		data: function() {
			return {
				initialPos: {
					x: 0,
					y: 0
				},
				start_width: 0,
				min_width: 170,
				max_width: 400,
				dragging: false
			};
		},
		mounted: function() {
			var _this = this;
			this.$nextTick(function() {
				this.$parent.$el.addEventListener('dragover', function(e) {
					_this.drag(e);
				});
			});
		},
		methods: {
			dragstart: function(e) {
				// hide the 'ghost' of the draggin element
				e.dataTransfer.setDragImage(document.createElement('div'), 0, 0);

				// set dummy data for dragging Firefox
				e.dataTransfer.setData('text/plain', '');

				this.dragging = true;
				this.start_width = this.$el.previousElementSibling.offsetWidth;
				this.initialPos = {
					x: e.pageX,
					y: e.pageY
				};
			},

			dragend: function(e) {
				this.dragging = false;
				this.$emit('hdragend');
				//this.$root.update_editor_size();
				//this.$root.save_editor_size();
				//this.$root.update_scrollbar_notes();
			},

			drag: function(e) {
				// prevent to emit unwanted value on dragend
				if (!this.dragging) return;
				if (e.screenX === 0 && e.screenY === 0) return;

				var new_width = this.start_width + e.pageX - this.initialPos.x;
				if (new_width >= this.min_width && new_width <= this.max_width) {
					this.$el.previousElementSibling.style.width = new_width + 'px';
					this.$emit('hdrag');
					//this.$root.update_editor_size();
					//this.$root.update_scrollbar_notes();
				}
			}
		}
	}
</script>