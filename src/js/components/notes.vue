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
				@dragover="noteDragOver($event, note)"
				@dragleave.stop="noteDragLeave(note)"
				@drop.stop="dropToNote($event, note)"
				:class="{'my-notes-note-selected': selectedNote === note, 'sortUpper': note.sortUpper, 'sortLower': note.sortLower}",
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
			.my-notes-note(v-if="bookmarksList", @click="addBookmark", style="opacity:0.3;")
				i.material-icons add

</template>

<script>
	const marked = require('marked');
	const fs = require('fs');
	const Vue = require('vue');

	const fileUtils = require('../utils/file');

	const arr = require('../utils/arr');
	const dragging = require('../utils/dragging');

	// Electron things
	const remote = require('electron').remote;
	const Menu = remote.Menu;
	const MenuItem = remote.MenuItem;
	const clipboard = require('electron').clipboard;
	const dialog = remote.dialog;

	const models = require('../models');
	const Note = models.Note;

	Vue.use(require('../filters/truncate'));
	Vue.use(require('../filters/dateSplitted'));

	export default {
		name: 'notes',
		props: {
			'bookmarksList': Boolean,
			'notesDisplayOrder': String,
			'notes': Array,
			'originalNotes': Array,
			'selectedNote': Object,
			'selectedRackOrFolder': Object,
			'draggingNote': Object,
			'toggleFullScreen': Function,
			'changeNote': Function,
			'setDraggingNote': Function,
			'editBookmark': Function,
			'refreshBookmarkThumb': Function
		},
		data() {
			return {
				'addnote_visible': false,
				'position': [ "left", "top", "left", "top" ]
			};
		},
		computed: {
			notesFiltered() {
				var dateSeparated = Vue.filter('dateSeparated');
				return dateSeparated(this.notes.slice(), this.notesDisplayOrder);
			}
		},
		methods: {
			selectNote(note) {
				this.changeNote(note);
			},
			selectNoteAndWide(note) {
				this.changeNote(note);
				this.toggleFullScreen();
			},
			addBookmark() {
				if(this.selectedRackOrFolder instanceof models.Folder) {
					this.$root.addBookmark(this.selectedRackOrFolder);
				}
			},
			removeNote(note) {
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

				dialog.showMessageBox(remote.getCurrentWindow(), dialog_options, (btn) => {
					if (btn == 0) {
						if (note.data && note.data.folder.notes.length > 0) {
							var index = note.data.folder.notes.indexOf(note);
							note.data.folder.notes.splice(index, 1);
						}
						var index = this.originalNotes.indexOf(note);
						if(index >= 0) this.originalNotes.splice(index, 1);
						if(this.selectedRackOrFolder.data.bookmarks) {
							this.selectedRackOrFolder.removeNote(note);
						} else {
							note.remove();
							if (this.notes.length > 1) {
								this.changeNote(Note.beforeNote(this.notes.slice(), note, this.notesDisplayOrder));
							} else {
								this.changeNote(Note.beforeNote(this.originalNotes.slice(), note, this.notesDisplayOrder));
							}
						}
					}
				});
			},
			// Dragging
			noteDragStart(event, note) {
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.setDraggingNote(note);
			},
			noteDragEnd() {
				this.setDraggingNote(null);
			},
			noteDragOver(event, note) {
				if (this.draggingNote && this.draggingNote.folder && this.draggingNote.folder.data.bookmarks) {
					event.preventDefault();
					var per = dragging.dragOverPercentageHorizontal(event.currentTarget, event.clientX);
					if (per > 0.5) {
						note.sortLower = true;
						note.sortUpper = false;
					} else {
						note.sortLower = false;
						note.sortUpper = true;
					}
				}
			},
			noteDragLeave(note) {
				note.dragHover = false;
				note.sortUpper = false;
				note.sortLower = false;
			},
			dropToNote(event, note) {
				if (this.draggingNote && this.draggingNote.folder.data.bookmarks && note.folder.data.bookmarks) {
					var notes = this.notes.slice();
					arr.remove(notes, (r) => {return r == this.draggingNote});
					var i = notes.indexOf(note);
					if (note.sortUpper) {
						notes.splice(i, 0, this.draggingNote);
					} else {
						notes.splice(i+1, 0, this.draggingNote);
					}
					this.draggingNote.folder.notes = notes;
					this.draggingNote.rack.saveModel();
					this.setDraggingNote(null);
					note.dragHover = false;
					note.sortUpper = false;
					note.sortLower = false;
				}
			},
			// Electron methods
			copyNoteBody(note) {
				clipboard.writeText(note.bodyWithDataURL);
				this.$message('info', 'Copied Markdown to clipboard');
			},
			copyNoteHTML(note) {
				clipboard.writeText(marked(note.body));
				this.$message('info', 'Copied HTML to clipboard');
			},
			// Electron
			exportNoteDiag(note) {
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
			noteMenu(note) {
				var menu = new Menu();

				if (this.bookmarksList && this.editBookmark) {
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