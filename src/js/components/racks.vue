<template lang="pug">
	div
		.my-shelf-rack(v-for="rack in racksWithFolders"
			:class="{'sortUpper': rack.sortUpper, 'sortLower': rack.sortLower, 'openFolders' : rack.openFolders }"
			:draggable="editingFolder === null && editingRack === null ? 'true' : 'false'"
			@dragstart.stop="rackDragStart($event, rack)"
			@dragend.stop="rackDragEnd()"
			@dragover="rackDragOver($event, rack)"
			@dragleave.stop="rackDragLeave(rack)"
			@drop.stop="dropToRack($event, rack)"
			@contextmenu.prevent.stop="rackMenu(rack)")
			h4(@click.prevent.stop="selectRack(rack)"
				:class="{'isShelfSelected': (isSelectedRack(rack) && !isDraggingNote() && rack.openFolders) || rack.dragHover }")
				i.material-icons.rack-icon.closed-icon label
				i.material-icons.rack-icon.opened-icon label_outline
				a(v-if="editingRack != rack") {{ rack.name }}
				input(v-if="editingRack == rack"
					v-model="rack.name"
					v-focus="editingRack == rack"
					@blur="doneRackEdit(rack)"
					@keyup.enter="doneRackEdit(rack)"
					@keyup.esc="doneRackEdit(rack)")
			
			//- Folder
			div.my-shelf-folder(v-for="folder in rack.folders"
				:class="{'isShelfSelected': (isSelectedFolder(folder) && !isDraggingNote()) || folder.dragHover, 'openNotes' : folder.openNotes, 'noteDragging': isDraggingNote(), 'noteIsHere': !isDraggingNote() && selectedNote.folderUid == folder.uid, 'sortUpper': folder.sortUpper, 'sortLower': folder.sortLower}"
				:draggable="editingFolder === null && editingRack === null ? 'true' : 'false'"
				@dragstart.stop="folderDragStart($event, rack, folder)"
				@dragend.stop="folderDragEnd(folder)"
				@dragover.stop="folderDragOver($event, rack, folder)"
				@dragleave="folderDragLeave(folder)"
				@drop="dropToFolder($event, rack, folder)"
				@contextmenu.prevent.stop="folderMenu(rack, folder)")
				h5(@click.prevent.stop="selectFolder(folder)")
					i.material-icons folder
					a.my-shelf-folder-name(v-if="editingFolder != folder")
						| {{ folder.name }}
						span.my-shelf-folder-badge(v-show="folder.notes.length > 0") {{ folder.notes.length }}
					input(v-if="editingFolder == folder"
						v-model="folder.name"
						v-focus="editingFolder == folder"
						@blur="doneFolderEdit(rack, folder)"
						@keyup.enter="doneFolderEdit(rack, folder)"
						@keyup.esc="doneFolderEdit(rack, folder)")
</template>

<script>
	const remote = require('electron').remote;
	const Menu = remote.Menu;
	const MenuItem = remote.MenuItem;

	const fs = require('fs');
	const path = require('path');
	const Vue = require('vue');

	const arr = require('../utils/arr');
	const dragging = require('../utils/dragging');

	const models = require('../models');
	const Rack = models.Rack;
	const Folder = models.Folder;
	const Note = models.Note;

	export default {
		name: 'racks',
		props: ['racks', 'folders', 'notes', 'filteredNotes', 'selectedRackOrFolder', 'selectedNote', 'editingRack', 'draggingNote', 'toggleFullScreen'],
		data: function() {
			return {
				draggingRack: null,
				draggingFolder: null,
				draggingFolderRack: null,
				editingFolder: null,
				scrollbarNotes: null
			};
		},
		directives: {
			'focus': function(value) {
				if (!value) {
					return;
				}
				var el = this.el;
				Vue.nextTick(function() {
					el.focus();
				});
			}
		},
		computed: {
			racksWithFolders: function() {
				return this.racks.sort(function(a, b) { return a.ordering - b.ordering });
			},
		},
		methods: {
			isDraggingNote: function() {
				return !!this.draggingNote;
			},
			doneRackEdit: function(rack) {
				if (!this.editingRack) { return }
				Rack.setModel(rack);
				this.editingRack = null;
				this.$emit('select', rack);
			},
			addRack: function() {
				// Same with the method in main.js
				var rack = new models.Rack({name: '', ordering: 0});
				var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
				racks.push(rack);
				racks.forEach((r, i) => {
					r.ordering = i;
					Rack.setModel(r);
				});
				this.racks = racks;
				this.editingRack = rack;
			},
			removeRack: function(rack) {
				rack.remove(this.notes, this.folders);
				var index = this.racks.indexOf(rack);
				this.racks.splice(index, 1);
				this.selectedRackOrFolder = null;
			},
			addFolder: function(rack) {
				this.$emit('openrack', rack);
				var folder = new Folder({
					name: '',
					rack: rack,
					rackUid: rack.uid,
					ordering: 0
				});
				var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
				folders.unshift(folder);
				folders.forEach((f, i) => {
					f.ordering = i;
					Folder.setModel(f);
				});
				this.folders.push(folder);
				this.editingFolder = folder;
			},
			doneFolderEdit: function(rack, folder) {
				if (!this.editingFolder) { return }
				Folder.setModel(folder);
				this.editingFolder = null;
				this.$emit('select', folder);
			},
			removeFolder: function(rack, folder) {
				folder.remove(this.notes);
				this.$emit('select', rack);
			},
			isSelectedRack: function(rack) {
				return this.selectedRackOrFolder === rack;
			},
			isSelectedFolder: function(folder) {
				return this.selectedRackOrFolder === folder;
			},
			filterNotesByFolder: function(folder) {
				return this.filteredNotes.filter(function(obj){
					return obj.isFolder(folder);
				});
			},
			notesByFolder: function(folder) {
				return this.notes.filter(function(obj){
					return obj.isFolder(folder);
				});
			},
			selectRack: function(rack) {
				this.$emit('select', rack);
				if(rack.openFolders){
					this.$emit('closerack', rack);
				} else {
					this.$emit('openrack', rack);
				}
			},
			selectFolder: function(folder) {
				this.$emit('select', folder);
			},
			openRack: function(rack) {
				this.$emit('openrack', rack);
				/*var newData = rack.readContents();
				if(newData) this.folders = this.folders.concat( newData );
				rack.openFolders = true;*/
			},
			closeRack: function(rack) {
				if(this.selectedNote && this.selectedNote.data && this.selectedNote.isRack(rack)){
					return
				}
				this.$emit('closerack', rack);
			},
			// Dragging
			rackDragStart: function(event, rack) {
				this.$emit('closerack', rack);
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.draggingRack = rack;
			},
			rackDragEnd: function() {
				this.draggingRack = null;
				this.$emit('select', null);
			},
			rackDragOver: function(event, rack) {
				if (this.draggingFolder) {
					event.preventDefault();
					rack.dragHover = true;
					this.$emit('openrack', rack);
					var newData = rack.readContents();
					if(newData) this.folders = this.folders.concat( newData );

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
				} else {
					//event.preventDefault();
				}
			},
			rackDragLeave: function(rack) {
				if (this.draggingFolder && this.draggingFolderRack && !this.draggingFolderRack.uid == rack.uid) {
					this.$emit('closerack', rack);
				}
				rack.dragHover = false;
				rack.sortUpper = false;
				rack.sortLower = false;
			},
			dropToRack: function(event, rack) {
				if(!rack.openFolders) this.$emit('openrack', rack);
				if (this.draggingFolder) {
					console.log("Dropping to rack");
					// Drop Folder to Rack
					rack.folders.forEach((f) => {
						f.ordering += 1;
						Folder.setModel(f);
					});
					this.draggingFolder.rackUid = rack.uid;
					this.draggingFolder.ordering = 0;
					Folder.setModel(this.draggingFolder);
					rack.dragHover = false;
					this.draggingFolder = null;
					this.draggingFolderRack = null;
				} else if (this.draggingRack && this.draggingRack != rack) {
					console.log("Dropping Rack for sorting");
					var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
					arr.remove(racks, (r) => {return r == this.draggingRack});
					var i = racks.indexOf(rack);
					if (rack.sortUpper) {
						racks.splice(i, 0, this.draggingRack);
					} else {
						racks.splice(i+1, 0, this.draggingRack);
					}
					racks.forEach((r, i) => {
						r.ordering = i;
						Rack.setModel(r);
					});
					this.draggingRack = null;
					rack.sortUpper = false;
					rack.sortLower = false;
				} else {
					event.preventDefault();
					event.stopPropagation();
				}
			},
			folderDragStart: function(event, rack, folder) {
				event.dataTransfer.setDragImage(event.target, 8, 0);
				this.draggingFolder = folder;
				this.draggingFolderRack = rack;
			},
			folderDragEnd: function() {
				this.$emit('folderdragend', {
					folder: this.draggingFolder,
					rack: this.draggingFolderRack
				});
				this.draggingFolder = null;
				this.draggingFolderRack = null;
			},
			folderDragOver: function(event, rack, folder) {
				if (this.draggingNote && this.draggingNote.folderUid != folder.uid) {
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
			folderDragLeave: function(folder) {
				if (this.draggingNote) {
					folder.dragHover = false;
				} else if (this.draggingFolder) {
					folder.sortLower = false;
					folder.sortUpper = false;
				}
			},
			dropToFolder: function(event, rack, folder) {
				if (this.draggingNote && this.draggingNote.folderUid != folder.uid) {
					event.stopPropagation();
					// Dropping note to folder
					folder.dragHover = false;
					var note = this.draggingNote;
					//note.folderUid = folder.uid;
					note.folder = folder;
					Note.setModel(note);
					this.draggingNote = null;
					var s = this.selectedRackOrFolder;
					this.$emit('select', null);
					Vue.nextTick(() => {
						this.$emit('select', s);
					});
				} else if (this.draggingFolder && this.draggingFolder != folder) {
					event.stopPropagation();
					var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
					arr.remove(folders, (f) => {return f == this.draggingFolder});
					var i = folders.indexOf(folder);
					if (folder.sortUpper) {
						folders.splice(i, 0, this.draggingFolder);
					} else {
						folders.splice(i+1, 0, this.draggingFolder);
					}
					this.draggingFolder.rackUid = rack.uid;
					folders.forEach((f, i) => {
						f.ordering = i;
						Folder.setModel(f);
					});
					folder.sortUpper = false;
					folder.sortLower = false;
				}
			},
			rackMenu: function(rack) {
				var menu = new Menu();
				menu.append(new MenuItem({label: 'Rename Rack', click: () => {this.editingRack = rack}}));
				menu.append(new MenuItem({label: 'Add Folder', click: () => {this.addFolder(rack)}}));
				menu.append(new MenuItem({label: 'Add Rack', click: () => {this.addRack()}}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Delete Rack', click: () => {
						if (confirm('Delete Rack "' + rack.name + '" and Folders/Notes in it?')) {
							this.removeRack(rack)
						}
					}
				}));
				menu.popup(remote.getCurrentWindow());
			},
			folderMenu: function(rack, folder) {
				var menu = new Menu();
				menu.append(new MenuItem({label: 'Rename Folder', click: () => {this.editingFolder = folder}}));
				menu.append(new MenuItem({label: 'Add Folder', click: () => {this.addFolder(rack)}}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Delete Folder', click: () => {
					if (confirm('Delete Folder "' + folder.name + '" and Notes in it?')) {
						this.removeFolder(rack, folder)
					}
				}}));
				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>