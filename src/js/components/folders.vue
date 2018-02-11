<template lang="pug">
	.my-shelf-folders
		//-.new-folder(v-if="isRack(parentFolder)")
			.my-shelf-folder
				h5(@click.prevent.stop="addFolder()")
					a.my-shelf-folder-name
						i.material-icons add_circle_outline
						| Add Folder

		.my-shelf(v-if="parentFolder && parentFolder.folders && parentFolder.folders.length > 0")
			.my-shelf-folder(v-for="folder in parentFolder.folders"
				:class="classFolder(folder)"
				:draggable="editingFolder === null && editingRack === null ? 'true' : 'false'"
				@dragstart.stop="folderDragStart($event, parentFolder, folder)"
				@dragend.stop="folderDragEnd(folder)"
				@dragover.stop="folderDragOver($event, folder)"
				@dragleave="folderDragLeave(folder)"
				@drop="dropToFolder($event, parentFolder, folder)"
				@contextmenu.prevent.stop="folderMenu(parentFolder, folder)")
				h5(@click.prevent.stop="selectFolder(folder)")
					i.material-icons.down(@click.prevent.stop="folder.openFolder = !folder.openFolder") arrow_drop_down
					a.my-shelf-folder-name.no-name(v-if="editingFolder != folder.uid")
						template(v-if="folder.name")
							| {{ folder.name }}
						template(v-else)
							| No Title
						span.my-shelf-folder-badge(v-show="folder.notes.length > 0")
							| {{ folder.notes.length }} 
							i.material-icons description
						span.my-shelf-folder-badge(v-show="folder.folders.length > 0")
							| {{ folder.folders.length }} 
							i.material-icons folder
					input(v-if="editingFolder == folder.uid"
						v-model="folder.name"
						v-focus="editingFolder == folder.uid"
						@blur="doneFolderEdit(folder)"
						@keyup.enter="doneFolderEdit(folder)"
						@keyup.esc="doneFolderEdit(folder)")

				folders(v-if="folder.folders",
						:parent-folder="folder"
						:selected-folder="selectedFolder"
						:dragging-note="draggingNote"
						:change-rack="changeRack"
						:change-folder="changeFolder"
						:editing-rack="editingRack"
						:editing-folder="editingFolder"
						:dragging-folder="draggingFolder")
</template>

<script>
	const remote = require('electron').remote;
	const { Menu, MenuItem } = remote;

	const Vue = require('vue');

	const arr = require('../utils/arr');
	const dragging = require('../utils/dragging');

	const models = require('../models');

	export default {
		name: 'folders',
		props: {
			'parentFolder'        : Object,
			'selectedFolder'      : Object,
			'draggingNote'        : Object,
			'changeRack'          : Function,
			'changeFolder'        : Function,
			'editingRack'         : String,
			'editingFolder'       : String,
			'draggingFolder'      : Object
		},
		data() {
			return {
				draggingFolderParent: null
			};
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
			isDraggingNote() {
				return !!this.draggingNote;
			}
		},
		methods: {
			classFolder(folder) {
				return {
					'isShelfSelected': (this.selectedFolder == folder && !this.isDraggingNote) || folder.dragHover,
					'gotSubfolders'  : folder.folders && folder.folders.length > 0,
					'openFolder'     : folder.openFolder,
					'noteDragging'   : this.isDraggingNote,
					'sortUpper'      : folder.sortUpper,
					'sortLower'      : folder.sortLower
				};
			},
			isRack(folder) {
				return folder instanceof models.Rack;
			},
			doneFolderEdit(folder) {
				if (!this.editingFolder) { return }
				folder.saveModel();
				this.changeFolder(folder);
			},
			selectFolder(folder) {
				this.changeFolder(folder);
			},
			addFolder(parent) {
				var folder;
				if (!parent) parent = this.parentFolder;
				// @todo nested folder
				if (parent.data.bookmarks) {
					folder = new models.BookmarkFolder({
						name    : '',
						rack    : parent.rack,
						rackUid : parent.rackUid,
						ordering: 0
					});
				} else {
					folder = new models.Folder({
						name        : '',
						rack        : parent.rack,
						parentFolder: parent instanceof models.Folder ? parent : undefined,
						rackUid     : parent.rackUid,
						ordering    : 0
					});
				}
				this.$root.addFolderToRack(parent, folder);
				if (parent instanceof models.Folder) {
					parent.openFolder = true;
				}
				this.$root.setEditingFolder(folder);
			},
			folderDragStart(event, parent, folder) {
				event.dataTransfer.setDragImage(event.target, 8, 0);
				this.$root.setDraggingFolder(folder);
				this.draggingFolderParent = parent;
			},
			folderDragEnd() {
				this.$root.folderDragEnded(this.draggingFolderParent, this.draggingFolder);
				this.$root.setDraggingFolder();
				this.draggingFolderParent = null;
			},
			folderDragOver(event, folder) {
				if (this.draggingNote && this.draggingNote.folder.uid != folder.uid) {
					event.stopPropagation();
					event.preventDefault();
					folder.dragHover = true;
				} else if (this.draggingFolder) {
					event.stopPropagation();
					if (folder != this.draggingFolder) {
						event.preventDefault();
						var per = dragging.dragOverPercentage(event.currentTarget, event.clientY);
						if (per > 0.5) {
							folder.sortLower = true;
							folder.sortUpper = false;
						} else {
							folder.sortLower = false;
							folder.sortUpper = true;
						}
					}
				} else {
					event.preventDefault();
				}
			},
			folderDragLeave(folder) {
				if (this.draggingNote) {
					folder.dragHover = false;
				} else if (this.draggingFolder) {
					folder.sortLower = false;
					folder.sortUpper = false;
				}
			},
			/**
			 * Handles dropping a note or a folder inside a folder.
			 * @param  {Object}  event   drag event
			 * @param  {Object}  rack    parent rack
			 * @param  {Object}  folder  current folder
			 */
			dropToFolder(event, rack, folder) {
				if (!this.isRack(rack)) rack = rack.rack;
				if (this.draggingNote && this.draggingNote.folder.uid != folder.uid) {
					console.log('Dropping Note to Folder');
					event.stopPropagation();
					// Dropping note to folder
					folder.dragHover = false;
					var note = this.draggingNote;
					arr.remove(note.data.folder.notes, (n) => {return n == note});
					note.folder = folder;
					folder.notes.unshift(note);
					note.saveModel();
					this.$root.setDraggingNote(null);
					this.changeFolder(null);
				} else if (this.draggingFolder && this.draggingFolder != folder) {
					console.log('Dropping Folder to Folder');
					event.stopPropagation();
					var draggingFolder = this.draggingFolder;
					var foldersFrom = arr.sortBy(draggingFolder.parent.folders.slice(), 'ordering', true);
					arr.remove(foldersFrom, (f) => { return f == draggingFolder });
					draggingFolder.parent.folders = foldersFrom;
					var foldersTo = arr.sortBy(folder.parent.folders.slice(), 'ordering', true);
					if (draggingFolder.rack != rack) {
						draggingFolder.rack = rack;
					}
					if (draggingFolder.parentFolder != folder.parentFolder) {
						draggingFolder.parentFolder = folder.parentFolder;
					}
					var i = foldersTo.indexOf(folder);
					if (folder.sortUpper) {
						foldersTo.splice(i, 0, draggingFolder);
					} else {
						foldersTo.splice(i+1, 0, draggingFolder);
					}
					foldersTo.forEach((f, i) => {
						f.ordering = i;
						if(!f.data.bookmarks) f.saveModel();
					});

					folder.parent.folders = foldersTo;
					if (rack.data.bookmarks) rack.saveModel();

					folder.sortUpper = false;
					folder.sortLower = false;
					this.$root.setDraggingFolder();
				}
			},
			folderMenu(rack, folder) {
				var menu = new Menu();
				menu.append(new MenuItem({
					label: 'Rename Folder',
					click: () => {
						this.$root.setEditingFolder(folder);
					}
				}));
				menu.append(new MenuItem({
					label: 'Add Folder',
					click: () => {
						this.addFolder(folder);
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				if (rack.data.bookmarks) {
					menu.append(new MenuItem({
						label: 'Add Bookmark',
						click: () => {
							this.changeFolder(folder);
							this.$root.addBookmark(folder);
						}
					}));
				} else {
					menu.append(new MenuItem({
						label: 'Add Note',
						click: () => {
							this.changeFolder(folder);
							this.$root.addNote();
						}
					}));
					menu.append(new MenuItem({
						label: 'Add Encrypted Note',
						click: () => {
							this.changeFolder(folder);
							this.$root.addEncryptedNote();
						}
					}));
				}
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Delete Folder',
					click: () => {
						if (confirm('Delete Folder "' + folder.name + '" and its content?')) {
							this.changeRack(rack);
							this.$root.deleteFolder(folder);
						}
					}
				}));
				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>