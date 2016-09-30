const remote = require('electron').remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

const fs = require('fs');
const path = require('path');

const arr = require('../utils/arr');
const dragging = require('../utils/dragging');

const models = require('../models');
const Rack = models.Rack;
const Folder = models.Folder;
const Note = models.Note;

require('./racks.css');

module.exports = function(Vue, options) {
	Vue.component('racks', {
		replace: true,
		props: ['racks', 'folders', 'notes', 'selectedRackOrFolder', 'selectedNote', 'editingRack', 'draggingNote'],
		data: function() {
			return {
				draggingRack: null,
				draggingFolder: null,
				draggingFolderRack: null,
				editingFolder: null
			}
		},
		template: require('./racks.html'),
		directives: {
			'focus': function (value) {
				if (!value) {
					return;
				}
				var el = this.el;
				Vue.nextTick(function () {
					el.focus();
				});
			}
		},
		computed: {
			racksWithFolders: function() {
				var folders = this.folders;
				var racks = this.racks;
				racks.forEach((r) => {
					r.folders = folders.filter((f) => {return f.rackUid == r.uid});
				});
				return racks;
			}
		},
		methods: {
			isDraggingNote: function() {
				return !!this.draggingNote;
			},
			doneRackEdit: function(rack) {
				if (!this.editingRack) { return }
				Rack.setModel(rack);
				this.editingRack = null;
				this.selectedRackOrFolder = rack;
			},
			addRack: function() {
				// Same with the method in main.js
				var rack = new models.Rack({name: "", ordering: 0});
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
				this.racks.$remove(rack);
				this.selectedRackOrFolder = null
			},
			addFolder: function(rack) {
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
				this.selectedRackOrFolder = folder;
			},
			removeFolder: function(rack, folder) {
				folder.remove(this.notes);
				this.selectedRackOrFolder = rack;
			},
			isSelectedRack: function(rack) {
				return this.selectedRackOrFolder === rack;
			},
			isSelectedFolder: function(folder) {
				return this.selectedRackOrFolder === folder;
			},
			selectRack: function(rack) {
				if(this.selectedRackOrFolder){
					if (this.selectedRackOrFolder instanceof models.Folder) {
						this.selectedRackOrFolder.data.rack.openFolders = false;
					} else {
						this.selectedRackOrFolder.openFolders = false;
					}
				}
				rack.openFolders = true;
				this.selectedRackOrFolder = rack;
			},
			selectFolder: function(folder) {
				this.selectedRackOrFolder = folder;
			},
			openRack: function(rack) {
				rack.openFolders = true;
			},
			closeRack: function(rack) {
				rack.openFolders = false;
			},
			// Dragging
			rackDragStart: function(event, rack) {
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.draggingRack = rack;
			},
			rackDragEnd: function() {
				console.log("Dragging Rack ended");
				this.draggingRack = null;
			},
			rackDragOver: function(event, rack) {
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
				} else {
					//event.preventDefault();
				}
			},
			rackDragLeave: function(rack) {
				rack.dragHover = false;
				rack.sortUpper = false;
				rack.sortLower = false;
			},
			dropToRack: function(event, rack) {
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
					this.selectedRackOrFolder = null;
					Vue.nextTick(() => {
						this.selectedRackOrFolder = s;
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
	});
};
