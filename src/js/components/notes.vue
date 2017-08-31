<template lang="pug">
	.my-notes(:class="{'my-bookmarks': bookmarksList}")
		.my-separator(v-for="separated in notesFiltered", v-bind:key="separated.dateStr", :class="{'my-bookmark-separator': bookmarksList}")
			.my-separator-date {{ separated.dateStr }}
			.my-notes-note(v-for="note in separated.notes",
				track-by="uid",
				@click="selectNote(note)",
				@dblclick="selectNoteAndWide(note)",
				@contextmenu.prevent.stop="noteMenu(note)",
				@dragstart.stop="noteDragStart($event, note)",
				@dragend.stop="noteDragEnd()",
				:class="{'my-notes-note-selected': selectedNote === note}",
				draggable="true")
				template(v-if="bookmarksList && note.attributes")
					h5.my-notes-note-title(:title="note.name")
						img.favicon(v-if="note.attributes.ICON", :src="note.attributes.ICON")
						| {{ note.name }}
					.my-notes-note-image(:title="note.name")
						img(:src="note.attributes.THUMBNAIL")
					.my-notes-note-body(:title="note.body")
						| {{ note.body }}
				template(v-else-if="!bookmarksList")
					h5.my-notes-note-title(v-if="note.title")
						i.material-icons(v-if="note.isEncryptedNote && note.isEncrypted") lock
						i.material-icons(v-else-if="note.isEncryptedNote && !note.isEncrypted") lock_open
						i.material-icons(v-else) description
						| {{ note.title }}
					.my-notes-note-image(v-if="note.img")
						img(:src="note.img")
					.my-notes-note-body(v-if="!note.img && note.body.length != 0")
						| {{ note.bodyWithoutTitle | truncate(80) }}

</template>

<script>
	const marked = require('marked');
	const fs = require('fs');
	const Vue = require('vue');

	const ApplicationMenu = require('../applicationmenu').ApplicationMenu;
	const fileUtils = require('../utils/file');

	// Electron things
	const remote = require('electron').remote;
	const shell = remote.shell;
	const Menu = remote.Menu;
	const MenuItem = remote.MenuItem;
	const clipboard = require('electron').clipboard;
	const dialog = remote.dialog;

	const Note = require('../models').Note;

	const NOTE_DISPLAY_ORDER_KEY = 'notes.notesDisplayOrder';

	Vue.use(require('../filters/truncate'));
	Vue.use(require('../filters/dateSplitted'));

	export default {
		name: 'notes',
		props: {
			'bookmarksList': Boolean,
			'notes': Array,
			'originalNotes': Array,
			'selectedNote': Object,
			'selectedRackOrFolder': Object,
			'draggingNote': Object,
			'toggleFullScreen': Function,
			'changeNote': Function,
			'setDraggingNote': Function,
			'editBookmark': Function
		},
		data: function() {
			return {
				notesDisplayOrder: 'updatedAt',
				'addnote_visible': false,
				'position': [ "left", "top", "left", "top" ]
			};
		},
		mounted: function() {
			var o = localStorage.getItem(NOTE_DISPLAY_ORDER_KEY);
			if (!o) {
				this.notesDisplayOrder = 'updatedAt';
				localStorage.setItem(NOTE_DISPLAY_ORDER_KEY, this.notesDisplayOrder);
			} else {
				this.notesDisplayOrder = o;
			}
			this.$watch('notesDisplayOrder', (v) => {
				localStorage.setItem(NOTE_DISPLAY_ORDER_KEY, v);
			});
		},
		computed: {
			notesFiltered: function() {
				var dateSeparated = Vue.filter('dateSeparated');
				return dateSeparated(this.notes, this.notesDisplayOrder);
			}
		},
		methods: {
			selectNote: function(note) {
				this.changeNote(note);
			},
			selectNoteAndWide: function(note) {
				this.changeNote(note);
				this.toggleFullScreen();
			},
			removeNote: function(note) {
				var self = this;

				var dialog_options = {
					type: 'question',
					buttons: ['Delete', 'Cancel'],
					defaultId: 1,
					cancelId: 1
				};

				if(this.bookmarksList){
					dialog_options.title = 'Remove Bookmark';
					dialog_options.message = 'Are you sure you want to remove this bookmark?\n\nTitle: ' + note.name + '\nLink: ' + note.body;
				} else {
					dialog_options.title = 'Remove Note';
					dialog_options.message = 'Are you sure you want to remove this note?\n\nTitle: ' + note.title + '\nContent: ' + note.bodyWithoutTitle.replace('\n', ' ').slice(0, 100) + '...';
				}

				dialog.showMessageBox(remote.getCurrentWindow(), dialog_options, function(btn) {
					if (btn == 0) {
						if (note.data && note.data.folder.notes.length > 0) {
							var index = note.data.folder.notes.indexOf(note);
							note.data.folder.notes.splice(index, 1);
						}
						var index = self.originalNotes.indexOf(note);
						if(index >= 0) self.originalNotes.splice(index, 1);
						if(self.selectedRackOrFolder.data.bookmarks) {
							self.selectedRackOrFolder.removeNote(note);
						} else {
							Note.removeModelFromStorage(note);
							if (self.notes.length > 1) {
								self.changeNote(Note.beforeNote(self.notes.slice(), note, self.notesDisplayOrder));
							} else {
								self.changeNote(Note.beforeNote(self.originalNotes.slice(), note, self.notesDisplayOrder));
							}
						}
					}
				});
			},
			// Dragging
			noteDragStart: function(event, note) {
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.setDraggingNote(note);
			},
			noteDragEnd: function() {
				this.setDraggingNote(null);
			},
			// Electron methods
			copyNoteBody: function(note) {
				clipboard.writeText(note.bodyWithDataURL);
				this.$message('info', 'Copied Markdown to clipboard');
			},
			copyNoteHTML: function(note) {
				clipboard.writeText(marked(note.body));
				this.$message('info', 'Copied HTML to clipboard');
			},
			// Electron
			exportNoteDiag: function(note) {
				var filename = fileUtils.safeName(note.title) + '.md';
				var notePath = dialog.showSaveDialog(remote.getCurrentWindow(), {
					title: 'Export Note',
					defaultPath: filename
				});
				if (!notePath) {
					return null;
				}
				try {
					var fd = fs.openSync(notePath, 'w');
					fs.writeSync(fd, note.bodyWithDataURL);
				} catch (e) {
					this.$message('error', 'Skipped: File "' + filename + 'exists', 5000);
				}
				fs.closeSync(fd);
			},
			noteMenu: function(note) {
				var menu = new Menu();

				if(this.bookmarksList){
					menu.append(new MenuItem({label: 'Edit Bookmark', click: () => {this.editBookmark(note)}}));
					menu.append(new MenuItem({type: 'separator'}));
					menu.append(new MenuItem({label: 'Delete Bookmark', click: () => {this.removeNote(note)}}));
				} else {
					menu.append(new MenuItem({label: 'Copy to clipboard (Markdown)', click: () => {this.copyNoteBody(note)}}));
					menu.append(new MenuItem({label: 'Copy to clipboard (HTML)', click: () => {this.copyNoteHTML(note)}}));
					menu.append(new MenuItem({type: 'separator'}));
					menu.append(new MenuItem({label: 'Export this note...', click: () => {this.exportNoteDiag(note)}}));
					menu.append(new MenuItem({type: 'separator'}));
					menu.append(new MenuItem({label: 'Delete note', click: () => {this.removeNote(note)}}));
				}

				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>