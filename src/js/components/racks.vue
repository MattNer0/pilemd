<template lang="pug">
	.my-shelf-racks
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
		props: {
			'racks': Array,
			'folders': Array,
			'filteredNotes': Array,
			'selectedRackOrFolder': Object,
			'selectedNote': Object,
			'draggingNote': Object,
			'changeRackOrFolder': Function,
			'openRack': Function,
			'closeRack': Function,
			'folderDragEnded': Function,
			'setDraggingNote': Function,
			'deleteFolder': Function,
			'addFolderToRack': Function
		},
		data: function() {
			return {
				draggingRack: null,
				draggingFolder: null,
				draggingFolderRack: null,
				editingRack: null,
				editingFolder: null,
				scrollbarNotes: null
			};
		},
		directives: {
			'focus': function(element) {
				if (!element) {
					return;
				}
				Vue.nextTick(function() {
					element.focus();
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
				this.changeRackOrFolder(rack);
			},
			addRack: function() {
				var rack = new Rack({
					name: "",
					ordering: 0
				});
				this.$root.addRack(rack);
				this.editingRack = rack;
			},
			addFolder: function(rack) {
				var folder = new Folder({
					name: '',
					rack: rack,
					rackUid: rack.uid,
					ordering: 0
				});
				this.addFolderToRack(rack, folder);
				this.editingFolder = folder;
			},
			doneFolderEdit: function(rack, folder) {
				if (!this.editingFolder) { return }
				Folder.setModel(folder);
				this.editingFolder = null;
				this.changeRackOrFolder(folder);
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
				var previousRackOrFolder = this.changeRackOrFolder(rack);
				if(rack.openFolders && previousRackOrFolder == rack){
					this.closeRack(rack);
				} else {
					this.openRack(rack);
				}
			},
			selectFolder: function(folder) {
				this.changeRackOrFolder(folder);
			},
			// Dragging
			rackDragStart: function(event, rack) {
				this.closeRack(rack);
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.draggingRack = rack;
			},
			rackDragEnd: function() {
				this.draggingRack = null;
				this.changeRackOrFolder(null);
			},
			rackDragOver: function(event, rack) {
				if (this.draggingFolder) {
					event.preventDefault();
					rack.dragHover = true;
					this.openRack(rack);
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
					this.closeRack(rack);
				}
				rack.dragHover = false;
				rack.sortUpper = false;
				rack.sortLower = false;
			},
			/**
			 * Handles dropping a rack or a folder inside a rack.
			 * @param  {Object}  event   drag event
			 * @param  {Object}  rack    current rack
			 */
			dropToRack: function(event, rack) {
				if (this.draggingFolder) {
					console.log("Dropping to rack");
					if(!rack.openFolders) this.openRack(rack);
					var draggingFolder = this.draggingFolder;
					// Drop Folder to Rack
					
					var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
					if(draggingFolder.data.rack != rack) {
						arr.remove(draggingFolder.data.rack.folders, (f) => {return f == draggingFolder});
						draggingFolder.rack = rack;
					}
					draggingFolder.ordering = 0;
					folders.unshift(draggingFolder);
					folders.forEach((f) => {
						f.ordering += 1;
						Folder.setModel(f);
					});
					rack.folders = folders;
					rack.dragHover = false;
					this.draggingFolder = null;
					this.draggingFolderRack = null;
				} else if (this.draggingRack && this.draggingRack != rack) {
					console.log("Dropping Rack");
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
				this.folderDragEnded(this.draggingFolderRack, this.draggingFolder)
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
			/**
			 * Handles dropping a note or a folder inside a folder.
			 * @param  {Object}  event   drag event
			 * @param  {Object}  rack    parent rack
			 * @param  {Object}  folder  current folder
			 */
			dropToFolder: function(event, rack, folder) {
				if (this.draggingNote && this.draggingNote.folderUid != folder.uid) {
					console.log("Dropping to Folder");
					event.stopPropagation();
					// Dropping note to folder
					folder.dragHover = false;
					var note = this.draggingNote;
					//note.folderUid = folder.uid;
					arr.remove(note.data.folder.notes, (n) => {return n == note});
					note.folder = folder;
					folder.notes.unshift(note);
					Note.setModel(note);
					this.setDraggingNote(null);
					var s = this.selectedRackOrFolder;
					this.changeRackOrFolder(null);
					Vue.nextTick(() => {
						this.changeRackOrFolder(s);
					});
				} else if (this.draggingFolder && this.draggingFolder != folder) {
					console.log("Dropping Folder");
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
						Folder.setModel(f);
					});
					rack.folders = folders;
					folder.sortUpper = false;
					folder.sortLower = false;
					this.draggingFolder = null;
				}
			},
			rackMenu: function(rack) {
				var menu = new Menu();
				menu.append(new MenuItem({
					label: 'Rename Rack',
					click: () => {
						this.editingRack = rack
					}
				}));
				
				menu.append(new MenuItem({
					label: 'Add Folder',
					click: () => {
						this.addFolder(rack)
					}
				}));
				
				menu.append(new MenuItem({
					label: 'Add Rack',
					click: () => {
						this.addRack();
					}
				}));
				
				menu.append(new MenuItem({type: 'separator'}));
				
				menu.append(new MenuItem({
					label: 'Delete Rack', click: () => {
						if (confirm('Delete Rack "' + rack.name + '" and Folders/Notes in it?')) {
							this.$root.removeRack(rack);
						}
					}
				}));
				
				menu.popup(remote.getCurrentWindow());
			},
			folderMenu: function(rack, folder) {
				var menu = new Menu();
				menu.append(new MenuItem({
					label: 'Rename Folder',
					click: () => {
						this.editingFolder = folder
					}
				}));
				menu.append(new MenuItem({
					label: 'Add Folder',
					click: () => {
						this.addFolder(rack)
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Add Note',
					click: () => {
						this.changeRackOrFolder(folder);
						this.$root.addNote();
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Delete Folder',
					click: () => {
						if (confirm('Delete Folder "' + folder.name + '" and Notes in it?')) {
							this.changeRackOrFolder(rack);
							this.deleteFolder(folder)
						}
					}
				}));
				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>