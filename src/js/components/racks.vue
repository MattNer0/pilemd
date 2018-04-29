<template lang="pug">
	.my-shelf
		.my-shelf-wrapper
			.my-shelf-racks(:class="{ 'draggingRack' : draggingRack, 'draggingFolder' : draggingFolder }")
				.my-shelf-rack(v-for="rack in racksWithFolders"
					:class="classRack(rack)"
					:draggable="editingFolder === null && editingRack === null ? 'true' : 'false'"
					@dragstart.stop="rackDragStart($event, rack)"
					@dragend.stop="rackDragEnd()"
					@dragover="rackDragOver($event, rack)"
					@dragleave.stop="rackDragLeave(rack)"
					@drop.stop="dropToRack($event, rack)"
					@contextmenu.prevent.stop="rackMenu(rack)")
					.rack-object(
						:class="{ 'editing' : editingRack == rack.uid, 'dragging' : draggingRack == rack }",
						@click="rack.openFolder = !rack.openFolder")
						i.material-icons.down(v-show="rack.folders.length > 0") arrow_drop_down
						i.material-icons.rack-icon {{ rack.icon }}
						a(v-if="editingRack != rack.uid")
							| {{ rack.name }}
						input(v-if="editingRack == rack.uid"
							v-model="rack.name"
							v-focus="editingRack == rack.uid"
							@blur="doneRackEdit(rack)"
							@keyup.enter="doneRackEdit(rack)"
							@keyup.esc="doneRackEdit(rack)")
					
					.my-shelf-folders(v-if="rack.folders.length > 0")
						.my-shelf-folder.my-all(
							v-if="rack.folders.length > 1 && rack.allnotes.length > 0",
							@contextmenu.prevent.stop="",
							:class="{ 'isShelfSelected': selectedRack == rack && showAll }")
							.folder-object(@click="selectAll(rack)", :class="{ 'dragging' : draggingFolder }")
								a.my-shelf-folder-name
									i.material-icons view_list
									|  All
									span.my-shelf-folder-badge(v-if="search", v-show="rack.searchnotes(search).length > 0")
										| {{ rack.searchnotes(search).length }} 
										i.material-icons description
									span.my-shelf-folder-badge(v-else)
										| {{ rack.allnotes.length }} 
										i.material-icons description

						.my-shelf-folder.my-favorites(
							@contextmenu.prevent.stop="",
							v-if="rack.starrednotes.length > 0"
							:class="{ 'isShelfSelected': selectedRack == rack && showFavorites }")
							.folder-object(@click="selectFavorites(rack)", :class="{ 'dragging' : draggingFolder }")
								a.my-shelf-folder-name
									i.material-icons star
									|  Favorites
									span.my-shelf-folder-badge(v-if="search", v-show="rack.searchstarrednotes(search).length > 0")
										| {{ rack.searchstarrednotes(search).length }} 
										i.material-icons description
									span.my-shelf-folder-badge(v-else)
										| {{ rack.starrednotes.length }} 
										i.material-icons description
					
					folders(v-if="rack.folders.length > 0",
						v-show="!draggingRack"
						:parent-folder="rack"
						:selected-folder="selectedFolder"
						:dragging-folder="draggingFolder"
						:dragging-note="draggingNote"
						:change-rack="changeRack"
						:change-folder="changeFolder"
						:editing-rack="editingRack"
						:editing-folder="editingFolder"
						:search="search")
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

	import component_folders from './folders.vue';

	export default {
		name: 'racks',
		props: {
			'racks'               : Array,
			'selectedRack'        : Object,
			'showAll'             : Boolean,
			'showFavorites'       : Boolean,
			'selectedFolder'      : Object,
			'draggingNote'        : Object,
			'changeRack'          : Function,
			'changeFolder'        : Function,
			'editingRack'         : String,
			'editingFolder'       : String,
			'originalNameRack'    : String,
			'draggingRack'        : Object,
			'draggingFolder'      : Object,
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
		components: {
			'folders': component_folders
		},
		computed: {
			racksWithFolders() {
				return this.racks.sort(function(a, b) { return a.ordering - b.ordering });
			},
			isDraggingNote() {
				return !!this.draggingNote;
			}
		},
		methods: {
			classRack(rack) {
				return {
					'gotSubfolders': rack.folders && rack.folders.length > 0,
					'openFolder'   : rack.openFolder && !this.draggingRack,
					'sortUpper'    : rack.sortUpper,
					'sortLower'    : rack.sortLower
				};
			},
			doneRackEdit(rack) {
				if (!this.editingRack) { return }
				if (rack.name.length == 0) {
					if (this.originalNameRack.length > 0) {
						rack.name = this.originalNameRack;
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
				this.changeRack(rack);
			},
			// Dragging
			rackDragStart(event, rack) {
				event.target.classList.remove('openFolder');
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.$root.setDraggingRack(rack);
			},
			rackDragEnd() {
				this.$root.setDraggingRack();
				this.changeRack(null);
			},
			rackDragOver(event, rack) {
				if (this.draggingFolder) {
					event.preventDefault();
					rack.dragHover = true;
				} else if (this.draggingRack && this.draggingRack != rack) {
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
				// @todo nested folder
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
				} else if (this.draggingRack && this.draggingRack != rack) {
					console.log('Dropping Rack');
					var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
					arr.remove(racks, (r) => { return r == this.draggingRack });
					var i = racks.indexOf(rack);
					if (rack.sortUpper) {
						racks.splice(i, 0, this.draggingRack);
					} else {
						racks.splice(i+1, 0, this.draggingRack);
					}
					racks.forEach((r, i) => {
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
			selectAll(rack) {
				this.$root.showAllRack(rack);
			},
			selectFavorites(rack) {
				this.$root.showFavoritesRack(rack);
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
			rackMenu(rack) {
				var menu = new Menu();

				/*menu.append(new MenuItem({
					label: 'Set Rack Thumbnail',
					click: () => {
						this.selectRackThumbnail(rack);
					}
				}));*/
				menu.append(new MenuItem({
					label: 'Add new top-level folder',
					click: () => {
						var rack = new models.Rack({
							name: "",
							ordering: 0
						});
						this.$root.addRack(rack);
						this.$root.setEditingRack(rack);
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Rename folder',
					click: () => {
						this.$root.setEditingRack(rack);
					}
				}));
				menu.append(new MenuItem({
					label: 'Add subfolder',
					click: () => {
						this.addFolder(rack);
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Delete folder',
					click: () => {
						if (confirm('Delete folder "' + rack.name + '" and its content?')) {
							this.$root.removeRack(rack);
						}
					}
				}));
				/*menu.append(new MenuItem({
					label: 'Add New Folder',
					click: () => {
						this.addRack();
					}
				}));*/
				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>