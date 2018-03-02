<template lang="pug">
	.my-notes
		.my-separator(v-if="selectedRack", v-for="separated in notesFiltered", v-bind:key="separated.dateStr")
			.my-separator-date {{ separated.dateStr }}
			.my-notes-note(v-for="note in separated.notes",
				track-by="uid",
				@click="selectNote(note)",
				@dblclick="selectNoteAndWide(note)",
				@contextmenu.prevent.stop="noteMenu(note)",
				@dragstart.stop="noteDragStart($event, note)",
				@dragend.stop="noteDragEnd()",
				:class="{'my-notes-note-selected': selectedNote === note, 'sortUpper': note.sortUpper, 'sortLower': note.sortLower}",
				draggable="true")

				h5.my-notes-note-title(v-if="note.title")
					i.material-icons(v-if="note.isEncryptedNote && note.isEncrypted") lock
					i.material-icons(v-else-if="note.isEncryptedNote && !note.isEncrypted") lock_open
					i.material-icons(v-else) description
					| {{ note.title }}
				h5.my-notes-note-title(v-else)
					i.material-icons description
					| No Title
				.my-notes-note-image(v-if="note.img")
					img(:src="note.img")
				.my-notes-note-body(v-if="!note.img && note.body.length != 0")
					| {{ note.bodyWithoutTitle | truncate(80) }}

</template>

<script>
	const marked = require('marked');
	const fs = require('fs');
	const Vue = require('vue');

	const fileUtils = require('../utils/file');

	const arr = require('../utils/arr');
	const dragging = require('../utils/dragging');

	// Electron things
	const electron = require('electron');
	const remote = electron.remote;
	const { Menu, MenuItem, dialog } = remote;

	const models = require('../models');
	const Note = models.Note;

	Vue.use(require('../filters/truncate'));
	Vue.use(require('../filters/dateSplitted'));

	export default {
		name: 'notes',
		props: {
			'notesDisplayOrder'   : String,
			'notes'               : Array,
			'originalNotes'       : Array,
			'selectedNote'        : Object,
			'selectedRack'        : Object,
			'selectedFolder'      : Object,
			'draggingNote'        : Object,
			'toggleFullScreen'    : Function,
			'changeNote'          : Function,
			'setDraggingNote'     : Function
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
			selectNote(note, newtab) {
				this.changeNote(note, newtab);
			},
			selectNoteAndWide(note) {
				this.changeNote(note);
				this.toggleFullScreen();
			},
			removeNote(note) {
				var dialog_options = {
					type     : 'question',
					buttons  : ['Delete', 'Cancel'],
					defaultId: 1,
					cancelId : 1
				};

				dialog_options.title = 'Remove Note';
				dialog_options.message = 'Are you sure you want to remove this note?\n\nTitle: ' + note.title + '\nContent: ' + note.bodyWithoutTitle.replace('\n', ' ').slice(0, 100) + '...';

				dialog.showMessageBox(remote.getCurrentWindow(), dialog_options, (btn) => {
					if (btn == 0) {
						if (note.data && note.data.folder.notes.length > 0) {
							var index = note.data.folder.notes.indexOf(note);
							note.data.folder.notes.splice(index, 1);
						}
						var index = this.originalNotes.indexOf(note);
						if(index >= 0) this.originalNotes.splice(index, 1);
						note.remove();
						if(note.data.folder.notes.length == 0) {
							this.changeNote(null);
						} else if (this.notes.length > 1) {
							this.changeNote(Note.beforeNote(this.notes.slice(), note, this.notesDisplayOrder));
						} else {
							this.changeNote(Note.beforeNote(this.originalNotes.slice(), note, this.notesDisplayOrder));
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
			// Electron methods
			copyNoteBody(note) {
				electron.clipboard.writeText(note.bodyWithDataURL);
				this.$root.sendFlashMessage(1000, 'info', 'Copied Markdown to clipboard');
			},
			copyNoteHTML(note) {
				electron.clipboard.writeText(marked(note.body));
				this.$root.sendFlashMessage(1000, 'info', 'Copied HTML to clipboard');
			},
			copyOutlinePLain(note) {
				if (note.isOutline) {
					electron.clipboard.writeText(note.bodyWithoutMetadata);
					this.$root.sendFlashMessage(1000, 'info', 'Copied Text Plain to clipboard');
				}
			},
			copyOutlineOPML(note) {
				if (note.isOutline) {
					electron.clipboard.writeText(note.compileOutlineBody());
					this.$root.sendFlashMessage(1000, 'info', 'Copied Text Plain to clipboard');
				}
			},
			// Electron
			exportNoteDiag(note) {
				var filename = fileUtils.safeName(note.title) + '.md';
				if (note.isOutline) {
					filename = fileUtils.safeName(note.title) + '.opml';
				}
				var notePath = dialog.showSaveDialog(remote.getCurrentWindow(), {
					title      : 'Export Note',
					defaultPath: filename
				});
				if (!notePath) {
					return null;
				}
				try {
					var fd = fs.openSync(notePath, 'w');
					if (note.isOutline) {
						fs.writeSync(fd, note.compileOutlineBody());
					} else {
						fs.writeSync(fd, note.bodyWithDataURL);
					}
				} catch (e) {
					this.$root.sendFlashMessage(5000, 'error', 'Skipped: File "' + filename + '" already exists');
				}
				fs.closeSync(fd);
			},
			noteMenu(note) {
				var menu = new Menu();

				menu.append(new MenuItem({label: 'Open Note', click: () => {this.selectNote(note)}}));
				menu.append(new MenuItem({label: 'Open Note in new Tab', click: () => {this.selectNote(note, true)}}));
				menu.append(new MenuItem({type: 'separator'}));
				if (note.isOutline) {
					menu.append(new MenuItem({label: 'Copy to clipboard (Plain)', click: () => {this.copyOutlinePLain(note)}}));
					menu.append(new MenuItem({label: 'Copy to clipboard (OPML)', click: () => {this.copyOutlineOPML(note)}}));
				} else {
					menu.append(new MenuItem({label: 'Copy to clipboard (Markdown)', click: () => {this.copyNoteBody(note)}}));
					menu.append(new MenuItem({label: 'Copy to clipboard (HTML)', click: () => {this.copyNoteHTML(note)}}));
				}
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({
					label: 'Show this note in folder',
					click: () => {
						electron.shell.showItemInFolder(note.data.path);
					}
				}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Export this note...', click: () => {this.exportNoteDiag(note)}}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Delete note', click: () => {this.removeNote(note)}}));

				menu.popup(remote.getCurrentWindow());
			}
		}
	}
</script>