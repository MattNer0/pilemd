<template lang="pug">
	.my-shelf-buckets(:class="{ 'draggingRack' : draggingBucket, 'draggingFolder' : draggingFolder }")
		.my-shelf-rack(v-for="bucket in bucketsWithFolders"
			:class="classBucket(bucket)"
			:draggable="editingFolder === null && editingBucket === null ? 'true' : 'false'"
			v-tooltip="{ 'content': bucket.name, 'placement': 'left' }"
			@dragstart.stop="rackDragStart($event, bucket)"
			@dragend.stop="rackDragEnd()"
			@dragover="rackDragOver($event, bucket)"
			@dragleave.stop="rackDragLeave(bucket)"
			@drop.stop="dropToRack($event, bucket)"
			@contextmenu.prevent.stop="bucketMenu(bucket)")
			.rack-object(
				:class="{ 'editing' : editingBucket == bucket.uid, 'dragging' : draggingBucket == bucket }",
				@click="selectBucket(bucket)")
				i.material-icons.rack-icon {{ bucket.icon }}
				a(v-if="editingBucket != bucket.uid")
					| {{ bucket.shorten }}
				input(v-if="editingBucket == bucket.uid"
					v-model="bucket.name"
					v-focus="editingBucket == bucket.uid"
					@blur="doneRackEdit(bucket)"
					@keyup.enter="doneRackEdit(bucket)"
					@keyup.esc="doneRackEdit(bucket)")
</template>

<script>
	const remote = require('electron').remote;
	const { Menu, MenuItem, dialog } = remote;

	var fs = require('fs');
	var path = require('path');

	const Vue = require('vue');

	const arr = require('../utils/arr');
	const dragging = require('../utils/dragging');
	const filehelper = require('../utils/file');

	const Datauri = require('datauri');

	const models = require('../models');

	export default {
		name: 'buckets',
		props: {
			'buckets'             : Array,
			'selectedBucket'      : Object,
			'selectedFolder'      : Object,
			'draggingBucket'      : Object,
			'draggingFolder'      : Object,
			'draggingNote'        : Object,
			'changeBucket'        : Function,
			'editingBucket'       : String,
			'editingFolder'       : String,
			'originalNameBucket'  : String,
			'search'              : String
		},
		directives: {
			focus(element) {
				if (!element) return;
				Vue.nextTick(() => {
					element.focus();
				});
			}
		},
		computed: {
			bucketsWithFolders() {
				return this.buckets.sort(function(a, b) { return a.ordering - b.ordering });
			},
			isDraggingNote() {
				return !!this.draggingNote;
			}
		},
		methods: {
			classBucket(bucket) {
				if (bucket) {
					return {
						'isShelfSelected': (this.selectedBucket == bucket && !this.isDraggingNote) || bucket.dragHover,
						'sortUpper'    : bucket.sortUpper,
						'sortLower'    : bucket.sortLower
					};
				}
			},
			doneRackEdit(rack) {
				if (!this.editingBucket) { return }
				if (rack.name.length == 0) {
					if (this.originalNameBucket.length > 0) {
						rack.name = this.originalNameBucket;
					} else if (rack.folders.length > 0) {
						rack.name = "new rack";
					} else {
						this.$root.removeRack(rack);
						this.$root.setEditingRack(null);
						return;
					}
				}
				rack.saveModel();
				this.$root.setEditingRack(null);
				this.changeBucket(rack);
			},
			// Dragging
			rackDragStart(event, rack) {
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.$root.setDraggingRack(rack);
			},
			rackDragEnd() {
				this.$root.setDraggingRack();
				this.changeBucket(null);
			},
			rackDragOver(event, rack) {
				if (this.draggingFolder) {
					event.preventDefault();
					rack.dragHover = true;
				} else if (this.draggingBucket && this.draggingBucket != rack) {
					event.preventDefault();
					var per = dragging.dragOverPercentage(event.currentTarget, event.clientY);
					if (per > 0.5) {
						rack.sortLower = true;
						rack.sortUpper = false;
					} else {
						rack.sortLower = false;
						rack.sortUpper = true;
					}
				}
			},
			rackDragLeave(rack) {
				rack.dragHover = false;
				rack.sortUpper = false;
				rack.sortLower = false;
			},
			addFolder(rack) {
				if (!rack) return;
				var folder;
				folder = new models.Folder({
					name        : '',
					rack        : rack,
					parentFolder: undefined,
					rackUid     : rack.uid,
					ordering    : 0
				});
				this.$root.addFolderToRack(rack, folder);
				this.$root.setEditingFolder(folder);
			},
			/**
			 * Handles dropping a rack or a folder inside a rack.
			 * @param  {Object}  event   drag event
			 * @param  {Object}  rack    current rack
			 */
			dropToRack(event, rack) {
				if (this.draggingFolder) {
					console.log('Dropping to rack');
					var draggingFolder = this.draggingFolder;
					// Drop Folder to Rack
					
					var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
					if (draggingFolder.data.rack != rack) {
						arr.remove(draggingFolder.data.rack.folders, (f) => {return f == draggingFolder});
						draggingFolder.rack = rack;
					}
					draggingFolder.ordering = 0;
					folders.unshift(draggingFolder);
					folders.forEach((f) => {
						f.ordering += 1;
						f.saveModel();
					});
					rack.folders = folders;
					rack.dragHover = false;
					this.$root.setDraggingFolder();
				} else if (this.draggingBucket && this.draggingBucket != rack) {
					console.log('Dropping Rack');
					var new_buckets = arr.sortBy(this.buckets.slice(), 'ordering', true);
					arr.remove(new_buckets, (r) => { return r == this.draggingBucket });
					var i = new_buckets.indexOf(rack);
					if (rack.sortUpper) {
						new_buckets.splice(i, 0, this.draggingBucket);
					} else {
						new_buckets.splice(i+1, 0, this.draggingBucket);
					}
					new_buckets.forEach((r, i) => {
						r.ordering = i;
						r.saveModel();
					});
					this.$root.setDraggingRack();
					rack.sortUpper = false;
					rack.sortLower = false;
				} else {
					event.preventDefault();
					event.stopPropagation();
				}
			},
			selectBucket(bucket) {
				this.$root.changeRack(bucket);
			},
			/*selectRackThumbnail(rack) {
				try {
					var filePath = dialog.showOpenDialog(remote.getCurrentWindow(), {
						title: 'Import Thumbnail Image',
						filters: [{
							name: 'Image',
							extensions: ['png', 'jpg']
						}],
						properties: ['openFile']
					});
					if (filePath) {
						if (filePath.length == 1) filePath = filePath[0];
						if (rack.thumbnail) fs.unlinkSync(rack.thumbnail);
						var fileDestination = path.join(rack.path, 'thumb'+path.extname(filePath));
						filehelper.copyFileSync(filePath, fileDestination);
						rack.thumbnail = Datauri.sync(fileDestination);
					}
				} catch(err) {
					console.error(err);
				}
			},*/
			bucketMenu(bucket) {
				var menu = new Menu();

				/*menu.append(new MenuItem({
					label: 'Set Bucket Thumbnail',
					click: () => {
						this.selectRackThumbnail(bucket);
					}
				}));*/
				menu.append(new MenuItem({
					label: 'Add new Bucket',
					click: () => {
						var bucket = new models.Rack({
							name: "",
							ordering: 0
						});
						this.$root.addRack(bucket);
						this.$root.setEditingRack(bucket);
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Rename Bucket',
					click: () => {
						this.$root.setEditingRack(bucket);
					}
				}));
				menu.append(new MenuItem({
					label: 'Add subfolder',
					click: () => {
						this.addFolder(bucket);
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Delete Bucket',
					click: () => {
						if (confirm('Delete bucket "' + bucket.name + '" and its content?')) {
							this.$root.removeRack(bucket);
						}
					}
				}));
				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>