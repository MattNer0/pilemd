<template lang="pug">
	div
		.my-shelf-folder(v-if="parentFolder.folders.length == 0")
			h5(@click.prevent.stop="addFolder()")
				i.material-icons add_box
				a.my-shelf-folder-name Add Folder

		//- Folder
		.my-shelf-folder(v-for="folder in parentFolder.folders"
			:class="{'isShelfSelected': (selectedFolder == folder && !isDraggingNote) || folder.dragHover, 'openNotes' : folder.openNotes, 'noteDragging': isDraggingNote, 'sortUpper': folder.sortUpper, 'sortLower': folder.sortLower}"
			:draggable="editingFolder === null && editingRack === null ? 'true' : 'false'"
			@dragstart.stop="folderDragStart($event, parentFolder, folder)"
			@dragend.stop="folderDragEnd(folder)"
			@dragover.stop="folderDragOver($event, folder)"
			@dragleave="folderDragLeave(folder)"
			@drop="dropToFolder($event, parentFolder, folder)"
			@contextmenu.prevent.stop="folderMenu(parentFolder.rack, folder)")
			h5(@click.prevent.stop="selectFolder(folder)")
				i.material-icons folder
				a.my-shelf-folder-name(v-if="editingFolder != folder.uid")
					| {{ folder.name }}
					span.my-shelf-folder-badge(v-show="folder.notes.length > 0") {{ folder.notes.length }}
				input(v-if="editingFolder == folder.uid"
					v-model="folder.name"
					v-focus="editingFolder == folder.uid"
					@blur="doneFolderEdit(folder)"
					@keyup.enter="doneFolderEdit(folder)"
					@keyup.esc="doneFolderEdit(folder)")
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
			'changeFolder'        : Function,
			'folderDragEnded'     : Function,
			'setDraggingNote'     : Function,
			'deleteFolder'        : Function,
			'addFolderToRack'     : Function,
			'editingRack'         : Boolean,
			'editingFolder'       : Boolean,
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
			doneFolderEdit(folder) {
				if (!this.editingFolder) { return }
				folder.saveModel();
				this.changeFolder(folder);
			},
			selectFolder(folder) {
				this.changeFolder(folder);
			},
			addFolder() {
				var folder;
				// @todo nested folder
				if (this.parentFolder.data.bookmarks) {
					folder = new models.BookmarkFolder({
						name    : '',
						rack    : this.parentFolder.rack,
						rackUid : this.parentFolder.rackUid,
						ordering: 0
					});
				} else {
					folder = new models.Folder({
						name        : '',
						rack        : this.parentFolder.rack,
						parentFolder: this.parentFolder instanceof models.Folder ? this.parentFolder : undefined,
						rackUid     : this.parentFolder.rackUid,
						ordering    : 0
					});
				}
				this.addFolderToRack(this.parentFolder, folder);
				this.$root.setEditingFolder(folder);
			},
			folderDragStart(event, parent, folder) {
				event.dataTransfer.setDragImage(event.target, 8, 0);
				this.$root.setDraggingFolder(folder);
				this.draggingFolderParent = parent;
			},
			folderDragEnd() {
				this.folderDragEnded(this.draggingFolderParent, this.draggingFolder);
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
				if (this.draggingNote && this.draggingNote.folder.uid != folder.uid) {
					console.log('Dropping to Folder');
					event.stopPropagation();
					// Dropping note to folder
					folder.dragHover = false;
					var note = this.draggingNote;
					arr.remove(note.data.folder.notes, (n) => {return n == note});
					note.folder = folder;
					folder.notes.unshift(note);
					note.saveModel();
					this.setDraggingNote(null);
					this.changeFolder(null);
				} else if (this.draggingFolder && this.draggingFolder != folder) {
					console.log('Dropping Folder');
					event.stopPropagation();
					var draggingFolder = this.draggingFolder;
					var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
					arr.remove(folders, (f) => {return f == draggingFolder});
					if(draggingFolder.data.rack != rack) {
						arr.remove(draggingFolder.data.rack.folders, (f) => {return f == draggingFolder});
						draggingFolder.rack = rack;
					}
					var i = folders.indexOf(folder);
					if (folder.sortUpper) {
						folders.splice(i, 0, draggingFolder);
					} else {
						folders.splice(i+1, 0, draggingFolder);
					}
					folders.forEach((f, i) => {
						f.ordering = i;
						if(!f.data.bookmarks) f.saveModel();
					});
					rack.folders = folders;
					if(rack.data.bookmarks) rack.saveModel();
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
						this.addFolder(rack)
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
							this.deleteFolder(folder);
						}
					}
				}));
				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>