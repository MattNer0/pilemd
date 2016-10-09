const marked = require('marked');

const fs = require('fs');

const ApplicationMenu = require('../../applicationmenu').ApplicationMenu;
const fileUtils = require('../../utils/file');

// Electron things
const remote = require('electron').remote;
const shell = remote.shell;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const clipboard = require('electron').clipboard;
const dialog = remote.dialog;

const Note = require('../../models').Note;

const NOTE_DISPLAY_ORDER_KEY = 'notes.notesDisplayOrder';

require('./notes.css');

module.exports = function(Vue, options) {
	Vue.use(require('../../filters/truncate'));
	Vue.use(require('../../filters/dateSplitted'));
	Vue.use(require('../../coops/qiita'));

	Vue.component('notes', {
		replace: true,
		props: ['notes', 'originalNotes', 'selectedNote', 'draggingNote', 'toggleFullScreen'],
		template: require('./notes.html'),
		data: function() {
			return {
				notesDisplayOrder: 'updatedAt'
			}
		},
		ready: function() {
			var o = localStorage.getItem(NOTE_DISPLAY_ORDER_KEY);
			if (!o) {
				this.notesDisplayOrder = 'updatedAt';
				localStorage.setItem(NOTE_DISPLAY_ORDER_KEY, this.notesDisplayOrder);
			} else {
				this.notesDisplayOrder = o;
			}
			var app = new ApplicationMenu();
			app.setDisplayOrder(
				this.notesDisplayOrder,
				() => {this.notesDisplayOrder = 'updatedAt'},
				() => {this.notesDisplayOrder = 'createdAt'});
			app.setMenu();
			this.$watch('notesDisplayOrder', (v) => {
				localStorage.setItem(NOTE_DISPLAY_ORDER_KEY, v);
			});
		},
		methods: {
			selectNote: function(note) {
				note.loadBody();
				this.selectedNote = note;
			},
			selectNoteAndWide: function(note) {
				this.toggleFullScreen();
			},
			removeNote: function(note) {
				this.originalNotes.$remove(note);
				Note.removeModelFromStorage(note);
				if (this.notes.length > 1) {
					this.selectedNote = Note.beforeNote(this.notes.slice(), note, this.notesDisplayOrder);
				} else {
					this.selectedNote = Note.beforeNote(this.originalNotes.slice(), note, this.notesDisplayOrder);
				}
			},
			// Dragging
			noteDragStart: function(event, note) {
				event.dataTransfer.setDragImage(event.target, 0, 0);
				this.draggingNote = note;
			},
			noteDragEnd: function() {
				this.draggingNote = null;
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
					return null
				}
				try {
					var fd = fs.openSync(notePath, 'w');
					fs.writeSync(fd, note.bodyWithDataURL);
				} catch (e) {
					this.$message('error', 'Skipped: File "' + filename + 'exists', 5000);
				}
				fs.closeSync(fd);
			},
			qiitaPost: function(note) {
				this.$qiitaPost(note);
			},
			noteMenu: function(note) {
				var menu = new Menu();
				menu.append(new MenuItem({label: 'Copy to clipboard (Markdown)', click: () => {this.copyNoteBody(note)}}));
				menu.append(new MenuItem({label: 'Copy to clipboard (HTML)', click: () => {this.copyNoteHTML(note)}}));
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Export this note...', click: () => {this.exportNoteDiag(note)}}));
				if (note.qiitaURL) {
					menu.append(new MenuItem({label: 'Open Qiita Post on Browser', click: () => {
						shell.openExternal(note.qiitaURL);
					}}));
				} else {
					menu.append(new MenuItem({label: 'Share on Qiita...', click: () => {this.qiitaPost(note)}}));
				}
				menu.append(new MenuItem({type: 'separator'}));
				menu.append(new MenuItem({label: 'Delete note', click: () => {this.removeNote(note)}}));
				menu.popup(remote.getCurrentWindow());
			}
		}
	});
};
