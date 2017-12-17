const path = require('path');
const fs = require('fs');

const _ = require('lodash');

var settings = require('./utils/settings');
settings.init();
settings.loadWindowSize();

const libini = require('./utils/libini');
const traymenu = require('./utils/traymenu');
const htmlToMarkdown = require('./utils/htmlToMarkdown');

import Vue from 'vue';

var models = require('./models');
var initialModels = require('./initialModels');
var preview = require('./preview');
var searcher = require('./searcher');

// electron things
const { ipcRenderer, remote, clipboard } = require('electron');
const { Menu, MenuItem, dialog } = remote;

var arr = require('./utils/arr');

// vue.js plugins
import component_addNote from './components/addNote.vue';
import component_browser from './components/browser.vue';
import component_codeMirror from './components/codemirror.vue';
import component_flashmessage from './components/flashmessage.vue';
import component_handlerNotes from './components/handlerNotes.vue';
import component_handlerStack from './components/handlerStack.vue';
import component_modal from './components/modal.vue';
import component_noteMenu from './components/noteMenu.vue';
import component_notes from './components/notes.vue';
import component_racks from './components/racks.vue';
import component_titleMenu from './components/titleMenu.vue';
import component_welcomeSplash from './components/welcomeSplash.vue';
import component_windowBar from './components/windowBar.vue';

// loading CSSs
require('../scss/pilemd-light.scss');
require('../scss/pilemd-original.scss');
require('../scss/pilemd.scss');

// not to accept image dropping and so on.
// electron will be show local images without this.
document.addEventListener('dragover', (e) => {
	e.preventDefault();
});
document.addEventListener('drop', (e) => {
	e.preventDefault();
	e.stopPropagation();
});

var settings_baseLibraryPath = settings.get('baseLibraryPath');
if(settings_baseLibraryPath) models.setBaseLibraryPath(settings_baseLibraryPath);

var appVue = new Vue({
	el: '#main-editor',
	template: require('../html/app.html'),
	data: {
		isFullScreen        : false,
		isPreview           : false,
		selectedTheme       : settings.get('theme') || 'dark',
		keepHistory         : settings.get('keepHistory') || true,
		preview             : "",
		racks               : [],
		notes               : [],
		bookmarksDomains    : [],
		notesHistory        : [],
		selectedRackOrFolder: null,
		search              : '',
		selectedNote        : {},
		selectedBookmark    : {},
		loadingUid          : '',
		draggingNote        : null,
		allDragHover        : false,
		messages            : [],
		noteHeadings        : [],
		modalShow           : false,
		modalTitle          : 'title',
		modalDescription    : 'description',
		modalPrompts        : [],
		modalOkcb           : null,
		racksWidth          : settings.get('racksWidth') || 180,
		notesWidth          : settings.get('notesWidth') || 180,
		propertiesWidth     : 180,
		fontsize            : parseInt(settings.get('fontsize')) || 15,
		notesDisplayOrder   : 'updatedAt',
	},
	components: {
		'flashmessage' : component_flashmessage,
		'racks'        : component_racks,
		'notes'        : component_notes,
		'modal'        : component_modal,
		'addNote'      : component_addNote,
		'windowBar'    : component_windowBar,
		'titleMenu'    : component_titleMenu,
		'noteMenu'     : component_noteMenu,
		'handlerStack' : component_handlerStack,
		'handlerNotes' : component_handlerNotes,
		'codemirror'   : component_codeMirror,
		'browser'      : component_browser,
		'welcomeSplash': component_welcomeSplash
	},
	computed: {
		/**
		 * filters notes based on search terms
		 * @function filteredNotes
		 * @return  {Array}  notes array
		 */
		filteredNotes() {
			var notes = this.isNoteRackSelected ? this.notes : this.selectedRackOrFolder.notes;
			//arr.sortBy(notes, this.notesDisplayOrder, false)
			return searcher.searchNotes(this.selectedRackOrFolder, this.search, notes);
		},
		/**
		 * @description returns currently selected folder or 'undefined' if no folder is selected.
		 * @function selectedFolder
		 * @return    {Object}     Currently selected folder
		 */
		selectedFolder() {
			if(this.selectedRackOrFolder instanceof models.Folder) return this.selectedRackOrFolder;
			return undefined;
		},
		/**
		 * check if the title attribute is defined to see
		 * if the 'selectedNote' is really a note object or just an empty object
		 * 
		 * @return    {Boolean}    True if note is selected
		 */
		isNoteSelected() {
			if(this.isNoteRackSelected && this.selectedNote.title) return true;
			return false;
		},
		/**
		 * check if the current selected rack is a bookmark rack or not.
		 * 
		 * @return    {Boolean}    True if current rack doesn't hold bookmarks.
		 */
		isNoteRackSelected() {
			if(this.selectedRackOrFolder instanceof models.BookmarkFolder) return false;
			return true;
		}
	},
	created() {

		// modal
		this.$on('modal-show', (modalMessage) => {
			this.modalTitle = modalMessage.title;
			this.modalDescription = modalMessage.description;
			this.modalPrompts = modalMessage.prompts;
			this.modalOkcb = modalMessage.okcb;
			this.modalShow = true;
		});

		// hey, this is the first time.
		if (!models.getBaseLibraryPath()) {
			initialModels.initialFolder();
		}

		if (models.doesLibraryExists()) {
			// library folder exists, let's read what's inside

			ipcRenderer.send('load-racks', { library: models.getBaseLibraryPath() });

			/*racks = models.readRacks();
			if (racks.length == 0) {
				initial_notes = initialModels.initialSetup(racks);
				racks = models.readRacks();

				if (initial_notes.length == 1) {
					folders = initial_notes[0].data.rack.read?Contents();
					notes = initial_notes;
				}
			}

			this.racks = arr.sortBy(racks.slice(), 'ordering', true);
			this.notes = notes;*/

		} else {
			console.error('Couldn\'t open library directory.\nPath: '+models.getBaseLibraryPath());
			setTimeout(() => {
				this.$refs.dialog.init('Error', 'Couldn\'t open library directory.\nPath: '+models.getBaseLibraryPath(), [{
					label: 'Ok',
					cancel: true
				}]);
			}, 100);
		}

		/*if (this.racks && this.racks.length > 0) {
			var domain_array = [];
			this.racks.forEach((r) => {
				if (r instanceof models.BookmarkRack) {
					domain_array = domain_array.concat(r.domains());
				}
			});
			this.bookmarksDomains = _.uniq(domain_array);
		}

		if (initial_notes.length > 0) {
			initial_notes[0].data.rack.openFolders = true;
			this.selectedRackOrFolder = initial_notes[0].data.folder;
			this.selectedNote = initial_notes[0];
		}*/

		/*if (remote.getGlobal('argv')) {
			var argv = remote.getGlobal('argv');
			if (argv.length > 1 && path.extname(argv[1]) == '.md' && fs.existsSync(argv[1])) {
				var notePath = argv[1];
				var noteData = models.Note.isValidNotePath(notePath);
				var openedNote;
				if (noteData && notePath.indexOf(models.getBaseLibraryPath()) == 0) {
					var openedRack = this.racks.find((rack) => {
						return rack.data.path == path.join(path.dirname(notePath), '..');
					});
					if (openedRack) this.readRack?Content(openedRack);
					openedNote = this.notes.find((note) => {
						return note.data.path == notePath;
					});
					if (openedNote) {
						this.changeRackOrFolder(openedNote.data.folder);
						this.changeNote(openedNote);
					}
				} else if (noteData && noteData.ext == '.mdencrypted' ) {
					// encripted note
				} else if (noteData) {
					openedNote = new models.Note({
						name: path.basename(notePath, noteData.ext),
						body: '',
						path: notePath,
						extension: noteData.ext
					});
					this.notes.push(openedNote);
					this.changeNote(openedNote);
				} else {
					console.log('path not valid!');
				}
			}
		}*/
	},
	mounted() {
		var self = this;
		this.$nextTick(() => {

			window.addEventListener('resize', (e) => {
				e.preventDefault();
				settings.saveWindowSize();
				self.update_editor_size();
			});

			this.init_sidebar_width();

			this.changeTheme(this.selectedTheme);
			traymenu.init();

			setTimeout(() => {
				self.update_editor_size();
			}, 1000);
		});

		ipcRenderer.on('loaded-racks', (event, data) => {
			if (!data || !data.racks) return;

			var racks = [];
			data.racks.forEach((r) => {
				switch(r._type) {
					case 'separator':
						racks.push(new models.RackSeparator(r));
						break;
					case 'bookmark':
						racks.push(new models.BookmarkRack(r));
						break;
					default:
						racks.push(new models.Rack(r));
						break;
				}
			});

			this.racks = arr.sortBy(racks.slice(), 'ordering', true);
		});

		ipcRenderer.on('loaded-folders', (event, data) => {
			if (!data) return;

			data.forEach((r) => {
				var rack = this.racks.filter((rk) => {
					return rk.path == r.rack;
				})[0];

				var folders = [];
				r.folders.forEach((f) => {
					f.rack = rack;
					folders.push(new models.Folder(f));
				});

				rack.folders = arr.sortBy(folders.slice(), 'ordering', true);
			});

			this.updateTrayMenu();
		});

		ipcRenderer.on('loaded-notes', (event, data) => {
			if (!data) return;

			data.forEach((r) => {
				var rack = this.racks.filter((rk) => {
					return rk.path == r.rack;
				})[0];

				var folder = rack.folders.filter((f) => {
					return f.path == r.folder;
				})[0];

				var notes = [];
				r.notes.forEach((n) => {
					n.rack = rack;
					n.folder = folder;
					switch(n._type) {
						case 'encrypted':
							notes.push(new models.EncryptedNote(n));
							break;
						default:
							notes.push(new models.Note(n));
							break;
					}
				});

				folder.notes = notes;
				this.notes = notes.concat(this.notes);
				rack.notes = notes.concat(rack.notes);
			});
		});

		ipcRenderer.on('loaded-all-notes', (event, data) => {
			if (!data) return;
			var last_history = libini.readKey(models.getBaseLibraryPath(), 'history');
			if (last_history && last_history.note.length > 0) {
				this.notesHistory = this.notes.filter((obj) => {
					return last_history.note.indexOf(obj.relativePath) >= 0;
				});
			}
		});
	},
	methods: {
		/**
		 * initialize the width of the left sidebar elements.
		 * 
		 * @function init_sidebar_width
		 * @return {Void} Function doesn't return anything
		 */
		init_sidebar_width() {
			var handlerStack = document.getElementById('handlerStack');
			if (handlerStack) handlerStack.previousElementSibling.style.width = this.racksWidth + 'px';
			this.$refs.refHandleStack.checkWidth(this.racksWidth);

			var handlerNotes = document.getElementById('handlerNotes');
			if (handlerNotes) handlerNotes.previousElementSibling.style.width = this.notesWidth + 'px';
			this.$refs.refHandleNote.checkWidth(this.notesWidth);
		},
		/**
		 * scrolls to the top of the notes sidebar.
		 * 
		 * @function scrollUpScrollbarNotes
		 * @return {Void} Function doesn't return anything
		 */
		scrollUpScrollbarNotes() {
			this.$nextTick(() => {
				this.$refs.refNotes.scrollTop = 0;
			});
		},
		/**
		 * scrolls to the top of the selected note.
		 * @function scrollUpScrollbarNote
		 * @return {Void} Function doesn't return anything
		 */
		scrollUpScrollbarNote() {
			this.$nextTick(() => {
				this.$refs.myEditor.scrollTop = 0;
			});
		},
		/**
		 * event called when rack or folder is selected.
		 * @function changeRackOrFolder
		 * @param  {Object}  obj  selected rack or folder
		 * @return {Object}       previous rack or folder selected
		 */
		changeRackOrFolder(obj) {
			var rf = this.selectedRackOrFolder;
			this.selectedRackOrFolder = obj;
			return rf;
		},
		/**
		 * event called when a note is selected.
		 * @param  {Object}  note  selected note
		 * @return {Void} Function doesn't return anything
		 */
		changeNote(note) {
			var self = this;

			if (this.isNoteSelected) {
				this.saveNote();
			}

			if(note === null) {
				this.selectedNote = {};
				return;
			}

			if (this.isNoteRackSelected) {
				this.selectedBookmark = {};
				if (!note.body) note.loadBody();
				if (note.isEncrypted) {
					var message = 'Insert the secret key to Encrypt and Decrypt this note';
					this.$refs.dialog.init('Secret Key', message, [{
						label: 'Ok',
						cb(data) {
							var result = note.decrypt(data.secretkey);
							if(result.error) {
								setTimeout(() => {
									self.$refs.dialog.init('Error', result.error + '\nNote: ' + note.path, [{
										label: 'Ok',
										cancel: true
									}]);
								}, 100);
							} else {
								self.selectedNote = note;
							}
						}
					}, {
						label : 'Cancel',
						cancel: true
					}], [{
						type    : 'password',
						retValue: '',
						label   : 'Secret Key',
						name    : 'secretkey',
						required: true
					}]);
				} else {
					this.selectedNote = note;
					if (this.keepHistory) {
						libini.pushKey(models.getBaseLibraryPath(), ['history', 'note'], this.selectedNote.relativePath, 5);
					}
				}
			} else {
				this.selectedNote = {};
				this.selectedBookmark = note;
				//this.$refs.refBrowser.newBookmarLoaded(note);
			}
		},
		/**
		 * event called when a note is dragged.
		 * 
		 * @function setDraggingNote
		 * @param  {Object}  note  Note being dragged
		 * @return {Void} Function doesn't return anything
		 */
		setDraggingNote(note) {
			this.draggingNote = note;
		},
		/**
		 * event called when user selects a new Rack from the sidebar.
		 * 
		 * @function openRack
		 * @param  {Object}  rack    The rack
		 * @return {Void} Function doesn't return anything
		 */
		openRack(rack) {
			if(!(rack instanceof models.Rack)) return;
			rack.openFolders = true;
		},
		/**
		 * hides rack content (folders).
		 * 
		 * @function closerack
		 * @param  {Object}  rack    The rack
		 * @return {Void} Function doesn't return anything
		 */
		closerack(rack) {
			/*if(this.selectedNote && this.selectedNote.data && this.selectedNote.isRack(rack)){
				return;
			}*/
			rack.openFolders = false;
			if(this.selectedRackOrFolder == rack) {
				this.selectedRackOrFolder = null;
			}
		},
		/**
		 * adds a new rack to the working directory.
		 * The new rack is placed on top of the list.
		 * 
		 * @function addRack
		 * @param  {Object}  rack    The new rack
		 * @return {Void} Function doesn't return anything
		 */
		addRack(rack) {
			var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
			racks.unshift(rack);
			racks.forEach((r, i) => {
				r.ordering = i;
				r.saveModel();
			});
			this.racks = racks;
		},
		/**
		 * adds a new rack separator to the working directory.
		 * The new rack is placed on top of the list.
		 * 
		 * @function addRackSeparator
		 * @return {RackSeparator} New rack separator
		 */
		addRackSeparator() {

			var rack_separator = new models.RackSeparator();
			var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
			racks.unshift(rack_separator);
			racks.forEach((r, i) => {
				r.ordering = i;
				r.saveModel();
			});
			this.racks = racks;

			return rack_separator;
		},
		/**
		 * @description removes the Rack (and its contents) from the current working directory.
		 * @param  {Object}  rack    The rack
		 * @return {Void} Function doesn't return anything
		 */
		removeRack(rack) {
			rack.remove(this.notes);
			arr.remove(this.racks, (r) => {
				return r == rack;
			});
			this.selectedRackOrFolder = null;
			// we need to close the current selected note if it was from the removed rack.
			if (this.isNoteSelected && this.selectedNote.data.rack == rack) {
				this.selectedNote = {};
			}
			this.updateTrayMenu();
		},
		/**
		 * inserts a new Folder inside the selected Rack.
		 * The new Folder is placed on top of the list.
		 * 
		 * @function addFolderToRack
		 * @param  {Object}  rack    The rack
		 * @param  {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		addFolderToRack(rack, folder) {
			this.openRack(rack);
			var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
			folders.unshift(folder);
			folders.forEach((f, i) => {
				f.ordering = i;
				if (!f.data.bookmarks) f.saveModel();
			});
			rack.folders = folders;
			if (rack.data.bookmarks) rack.saveModel();
			this.updateTrayMenu();
		},
		/**
		 * deletes a folder and its contents from the parent rack.
		 * @function deleteFolder
		 * @param  {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		deleteFolder(folder) {
			arr.remove(folder.data.rack.folders, (f) => {
				return f == folder;
			});
			folder.remove(this.notes);

			this.selectedRackOrFolder = null;
			// we need to close the current selected note if it was from the removed folder.
			if(this.isNoteSelected && this.selectedNote.data.folder == folder) {
				this.selectedNote = {};
			}
			this.updateTrayMenu();
		},
		/**
		 * event called after folder was dragged into a rack.
		 * @param  {Object}  rack    The rack
		 * @param  {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		folderDragEnded(rack) {
			if (!rack) return;
			rack.folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
			this.updateTrayMenu();
		},
		/**
		 * toggles left sidebar.
		 * 
		 * @return {Void} Function doesn't return anything
		 */
		toggleFullScreen() {
			this.isFullScreen = !this.isFullScreen;
			settings.set('vue_isFullScreen', this.isFullScreen);
			this.update_editor_size();
		},
		/**
		 * toggles markdown note preview.
		 * 
		 * @return {Void} Function doesn't return anything
		 */
		togglePreview() {
			this.isPreview = !this.isPreview;
			this.update_editor_size();
		},
		calcSaveUid() {
			if (this.selectedRackOrFolder instanceof models.Rack) {
				var f = this.selectedRackOrFolder.folders;
				if (!f || f.length == 0) {
					return null;
				}
				return f[0].uid;
			} else if (this.selectedRackOrFolder instanceof models.Folder) {
				return this.selectedRackOrFolder.uid;
			}
			return null;
		},
		/**
		 * finds the currently selected folder.
		 * if a rack object is selected instead of a folder object,
		 * then it will get the first folder inside the rack.
		 * 
		 * @return  {Object}  Folder object if one is selected, 'null' otherwise
		 */
		getCurrentFolder() {
			if (this.selectedRackOrFolder === null){
				return null;
			} else if (this.selectedRackOrFolder instanceof models.Rack) {
				var f = this.selectedRackOrFolder.folders;
				if (!f || f.length == 0) {
					return null;
				}
				return f[0];
			} else if (this.selectedRackOrFolder instanceof models.Folder) {
				return this.selectedRackOrFolder;
			}
			return null;
		},
		/**
		 * add new note to the current selected Folder
		 * 
		 * @return  {Note}  New Note object
		 */
		addNote() {
			var currFolder = this.getCurrentFolder();
			this.changeNote(null);
			this.selectedRackOrFolder = currFolder;
			var newNote = models.Note.newEmptyNote(currFolder);
			if (newNote) {
				if (this.search.length > 0) this.search = '';
				if (currFolder.data.rack && currFolder.data.rack.notes) {
					currFolder.data.rack.notes.unshift(newNote);
					currFolder.data.rack.openFolders = true;
				}
				if (currFolder.notes) currFolder.notes.unshift(newNote);
				this.notes.unshift(newNote);
				this.isPreview = false;
				this.changeNote(newNote);
				this.updateTrayMenu();
			} else {
				var message;
				if(this.racks.length > 0){
					message = 'You must select Rack and Folder first!';
				} else {
					message = 'You must create a Folder first!';
				}
				this.$refs.dialog.init('Error', message, [{ label: 'Ok' }]);
			}
			return newNote;
		},
		/**
		 * add new encrypted note to the current selected Folder
		 * 
		 * @return {Void} Function doesn't return anything
		 */
		addEncryptedNote() {
			var currFolder = this.getCurrentFolder();
			this.changeNote(null);
			this.selectedRackOrFolder = currFolder;
			var newNote = models.EncryptedNote.newEmptyNote(currFolder);
			if (newNote) {
				if (this.search.length > 0) this.search = '';
				if (currFolder.data.rack && currFolder.data.rack.notes) currFolder.data.rack.notes.unshift(newNote);
				if (currFolder.notes) currFolder.notes.unshift(newNote);
				this.notes.unshift(newNote);
				this.isPreview = false;
				this.changeNote(newNote);
				newNote.saveModel();
			} else {
				var message;
				if(this.racks.length > 0){
					message = 'You must select Rack and Folder first!';
				} else {
					message = 'You must create a Folder first!';
				}
				this.$refs.dialog.init('Error', message, [{ label: 'Ok' }]);
			}
		},
		/**
		 * add a list of notes to the library.
		 * 
		 * @param {Array}  noteTexts  Array which contains the new notes
		 * @return {Void} Function doesn't return anything
		 */
		addNotes(noteTexts) {
			var uid = this.calcSaveUid();
			var newNotes = noteTexts.map((noteText) => {
				return new models.Note({
					body: noteText,
					folderUid: uid
				});
			});
			newNotes.forEach((note) => {
				note.saveModel();
			});
			this.notes = newNotes.concat(this.notes);
		},
		/**
		 * save current selected Note.
		 * 
		 * @return {Void} Function doesn't return anything
		 */
		saveNote() {
			var result;
			//if (this.selectedNote && this.isPreview) this.preview = preview.render(this.selectedNote, this);
			this.updatePreview();
			if (this.selectedNote.saveModel) {
				result = this.selectedNote.saveModel();
			}
			if (result && result.error && result.path) {
				this.sendFlashMessage(5000, 'error', result.error);
			} else if(result && result.saved) {
				this.sendFlashMessage(1000, 'info', 'Note saved');
			}
		},
		addNoteFromUrl() {
			var self = this;

			var pageLoaded = () => {
				self.$refs.webview.removeEventListener('did-finish-load', pageLoaded);
				self.$refs.webview.getWebContents().executeJavaScript(htmlToMarkdown.parseScript(), (result) => {
					var new_markdown = htmlToMarkdown.convert(result, self.$refs.webview.src, self.$refs.webview.getTitle());
					if (new_markdown) {
						var new_note = self.addNote();
						new_note.body = new_markdown;
					} else {
						self.sendFlashMessage(5000, 'error', 'Conversion Failed');
					}
					self.$refs.webview.style.height = '';
					self.$refs.webview.src = '';
				});
			};
			var pageFailed = () => {
				self.$refs.webview.removeEventListener('did-fail-load', pageFailed);
				self.$refs.webview.style.height = '';
				self.$refs.webview.src = '';
				self.sendFlashMessage(5000, 'error', 'Load Failed');
			};

			this.$refs.dialog.init('Note', '', [{
				label: 'Cancel',
				cancel: true,
			}, {
				label: 'Ok',
				cb(data) {
					self.$refs.webview.src = data.pageurl;
					self.$refs.webview.style.height = '10000px';
					self.$refs.webview.addEventListener('did-finish-load', pageLoaded);
					self.$refs.webview.addEventListener('did-fail-load', pageFailed);
				},
				/**
				 * validate the form input data
				 *
				 * @param      {Object}            data    Form data object
				 * @return     {(boolean|string)}          If false, the validation was succesful.
				 *                                         If a string value is returned it means that's the name of the field that failed validation.
				 */
				validate(data) {
					var expression = /[-a-zA-Z0-9@:%_+.~#?&=]{2,256}(\.[a-z]{2,4}|:\d+)\b(\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?/gi;
					var regex = new RegExp(expression);
					if (data.pageurl.match(regex)) {
						return false;
					}
					/*
					 * @todo gonna use this to highlight the wrong field in the dialog form
					 */
					return 'pageurl';
				}
			}], [{
				type    : 'text',
				retValue: '',
				label   : 'URL',
				name    : 'pageurl',
				required: true
			}]);
		},
		/**
		 * add a new bookmark inside a specific folder
		 * 
		 * @param {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		addBookmark(folder) {
			var newBookmark = models.BookmarkFolder.newEmptyBookmark(folder);
			folder.notes.push(newBookmark);
			this.editBookmark(newBookmark);
		},
		/**
		 * edit bookmark title and url through a popup dialog
		 * 
		 * @param {Object}  bookmark  The bookmark
		 * @return {Void} Function doesn't return anything
		 */
		editBookmark(bookmark) {
			var self = this;
			this.$refs.dialog.init('Bookmark', '', [{
				label: 'Cancel',
				cancel: true,
				/**
				 * function called when user click on the 'Cancel' button
				 *
				 * @return {Void} Function doesn't return anything
				 */
				cb() {
					if(bookmark.name === '' && bookmark.body === '') {
						bookmark.folder.removeNote(bookmark);
					}
				}
			}, {
				label: 'Ok',
				/**
				 * function called when user click on the 'Ok' button
				 *
				 * @param  {Object}  data  Form data object
				 * @return {Void} Function doesn't return anything
				 */
				cb(data) {
					if(bookmark.body != data.bkurl || !bookmark.attributes['THUMBNAIL']) {
						models.BookmarkFolder.setBookmarkNameUrl(bookmark, data.bkname, data.bkurl);
						this.bookmarksDomains.push(models.BookmarkFolder.getDomain({ body: data.bkurl }));
						self.$nextTick(() => {
							self.refreshBookmarkThumb(bookmark);
						});
					} else {
						models.BookmarkFolder.setBookmarkNameUrl(bookmark, data.bkname, data.bkurl);
					}
					bookmark.rack.saveModel();
				},
				/**
				 * validate the form input data
				 *
				 * @param  {Object}  data  Form data object
				 * @return {(boolean|string)} If false, the validation was succesful.
				 *                            If a string value is returned it means that's the name of the field that failed validation.
				 */
				validate(data) {
					var expression = /[-a-zA-Z0-9@:%_+.~#?&=]{2,256}(\.[a-z]{2,4}|:\d+)\b(\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?/gi;
					var regex = new RegExp(expression);
					if (data.bkurl.match(regex)) {
						return false;
					}
					/*
					 * TODO: gonna use this to highlight the wrong field in the dialog form
					 */
					return 'bkurl';
				}
			}], [{
				type    : 'text',
				retValue: bookmark.name,
				label   : 'Name',
				name    : 'bkname',
				required: false
			},{
				type    : 'text',
				retValue: bookmark.body,
				label   : 'URL',
				name    : 'bkurl',
				required: true
			}]);
		},
		/**
		 * refresh bookmark thumbnail image and icon
		 * 
		 * @function refreshBookmarkThumb
		 * @param {Object}  bookmark  The bookmark
		 * @return {Void} Function doesn't return anything
		 */
		refreshBookmarkThumb(bookmark) {
			if(!bookmark || !bookmark.body) return;
			var self = this;
			console.log('Loading Bookmark thumbnail...', bookmark.body);
			this.loadingUid = bookmark.uid;
			self.$refs.webview.style.height = '';
			this.$refs.webview.src = bookmark.body;
			var bookmarkFavicon = (e) => {
				self.$refs.webview.removeEventListener('page-favicon-updated', bookmarkFavicon);
				if(e.favicons && e.favicons.length > 0) {
					models.BookmarkFolder.setBookmarkIcon(bookmark, e.favicons[0]);
				}
			};
			var bookmarkLoaded = () => {
				self.$refs.webview.removeEventListener('did-finish-load', bookmarkLoaded);
				if(bookmark.name === '') {
					models.BookmarkFolder.setBookmarkNameUrl(bookmark, self.$refs.webview.getTitle(), bookmark.body);
				}
				self.$refs.webview.capturePage((img) => {
					/**
					 * callback after webview took a page screenshot
					 * @param  {Object}  img  NativeImage page screenshot
					 */
					console.log('Bookmark thumbnail was succesful!');
					self.sendFlashMessage(3000, 'info', 'Thumbnail saved');
					self.$refs.webview.src = '';
					models.BookmarkFolder.setBookmarkThumb(bookmark, img);
					bookmark.rack.saveModel();
					self.loadingUid = '';
				});
			};
			var bookmarkFailed = (e) => {
				if (e.isMainFrame) {
					self.$refs.webview.removeEventListener('did-fail-load', bookmarkFailed);
					self.loadingUid = '';
					self.sendFlashMessage(5000, 'error', 'Load Failed');
				}
			};

			this.$refs.webview.addEventListener('page-favicon-updated', bookmarkFavicon);
			this.$refs.webview.addEventListener('did-finish-load', bookmarkLoaded);
			this.$refs.webview.addEventListener('did-fail-load', bookmarkFailed);
		},
		/**
		 * refresh bookmark thumbnail using some metadata content
		 * (og:image, 'shortcut icon' and 'user-profile' img)
		 * 
		 * @param {Object}  bookmark  The bookmark
		 * @return {Void} Function doesn't return anything
		 */
		getBookmarkMetaImage(bookmark) {
			var self = this;
			console.log('Loading Bookmark page...', bookmark.body);
			this.loadingUid = bookmark.uid;
			self.$refs.webview.style.height = '';
			this.$refs.webview.src = bookmark.body;
			var imageLoaded = () => {
				self.$refs.webview.removeEventListener('did-finish-load', imageLoaded);
				self.$refs.webview.getWebContents().insertCSS('img { width: 100% !important; height: auto; }');
				setTimeout( () => {
					self.$refs.webview.capturePage((img) => {
						console.log('Bookmark meta image was succesful!');
						self.sendFlashMessage(2000, 'info', 'Thumbnail saved');
						self.$refs.webview.src = '';
						models.BookmarkFolder.setBookmarkThumb(bookmark, img);
						bookmark.rack.saveModel();
						self.loadingUid = '';
					});
				}, 1000);
			};
			var bookmarkLoaded = () => {
				self.$refs.webview.removeEventListener('did-finish-load', bookmarkLoaded);
				self.$refs.webview.getWebContents().executeJavaScript(
					'document.querySelector(\'head\').innerHTML + document.querySelector(\'body\').innerHTML',
					(result) => {
						var shortcut = (/rel=['"`]shortcut icon['"`][^<>]+?href=['"`](http.+?)['"`]/gi).exec(result) ||
										(/<img[^>]+?src=['"`](http.+?profile[-_]images.+?)['"`]/gi).exec(result);
						var og_image = (/property=['"`]og:image['"`][^<>]+?content=['"`](http.+?)['"`]/gi).exec(result) ||
										(/content=['"`](http.+?)['"`][^<>]+?property=['"`]og:image['"`]/gi).exec(result);
						var avatar_image = (/class=['"`]avatar['"`][^<>]+>[^<>]+<img[^<>]+src=['"`](http.+?)['"`]/gi).exec(result);
						var user_profile = result.match(/https?:\/\/[a-z0-9.-]+?\/user-profile\/img[^.<>]+\.(jpg|png|gif)/gi);

						if (user_profile || shortcut || og_image || avatar_image) {
							var image_url;
							if (user_profile) image_url = user_profile[0];
							else if(avatar_image) image_url = avatar_image[1];
							else if(shortcut) image_url = shortcut[1];
							else if(og_image) image_url = og_image[1];

							self.$refs.webview.src = image_url;
							self.$refs.webview.addEventListener('did-finish-load', imageLoaded);
						} else {
							console.log('No Bookmark meta image found!');
							self.$refs.webview.src = '';
							self.loadingUid = '';
						}
					}
				);
			};
			var bookmarkFailed = (e) => {
				if (e.isMainFrame) {
					self.$refs.webview.removeEventListener('did-fail-load', bookmarkFailed);
					self.loadingUid = '';
					this.sendFlashMessage(3000, 'error', 'Load Failed');
				}
			};

			this.$refs.webview.addEventListener('did-finish-load', bookmarkLoaded);
			this.$refs.webview.addEventListener('did-fail-load', bookmarkFailed);
		},
		/**
		 * displays an image with the popup dialog.
		 *
		 * @param  {String}  url  The image url
		 * @return {Void} Function doesn't return anything
		 */
		openImg(url) {
			this.$refs.dialog.image(url);
		},
		/**
		 * displays context menu for the list of racks.
		 * @function shelfMenu
		 * @return {Void} Function doesn't return anything
		 */
		shelfMenu() {
			var menu = new Menu();
			menu.append(new MenuItem({
				label: 'Add Rack',
				click: () => { this.$refs.refRacks.addRack(); }
			}));
			menu.append(new MenuItem({
				label: 'Add Bookmark Rack',
				click: () => { this.$refs.refRacks.addBookmarkRack(); }
			}));
			menu.append(new MenuItem({
				label: 'Add Rack Separator',
				click: () => { this.addRackSeparator(); }
			}));
			menu.popup(remote.getCurrentWindow());
		},
		/**
		 * displays context menu on the selected note in preview mode.
		 * @function previewMenu
		 * @return {Void} Function doesn't return anything
		 */
		previewMenu() {
			var self = this;
			var menu = new Menu();

			menu.append(new MenuItem({
				label: 'Copy',
				accelerator: 'CmdOrCtrl+C',
				click() { document.execCommand('copy'); }
			}));
			menu.append(new MenuItem({ type: 'separator' }));
			menu.append(new MenuItem({
				label: 'Copy to clipboard (Markdown)',
				click() {
					if(self.selectedNote) clipboard.writeText(self.selectedNote.bodyWithDataURL);
				}
			}));
			menu.append(new MenuItem({
				label: 'Copy to clipboard (HTML)',
				click() {
					if(self.preview) clipboard.writeText(self.preview);
				}
			}));
			menu.append(new MenuItem({ type: 'separator' }));
			menu.append(new MenuItem({
				label: 'Toggle Preview',
				click() { self.togglePreview(); }
			}));
			menu.popup(remote.getCurrentWindow());
		},
		importNotes() {
			var notePaths = dialog.showOpenDialog(remote.getCurrentWindow(), {
				title: 'Import Note',
				filters: [{
					name: 'Markdown',
					extensions: ['md', 'markdown', 'txt']
				}],
				properties: ['openFile', 'multiSelections']
			});
			if (!notePaths || notePaths.length == 0) {
				return;
			}
			var noteBodies = notePaths.map((notePath) => {
				return fs.readFileSync(notePath, 'utf8');
			});
			this.addNotes(noteBodies);
		},
		moveSync() {
			var currentPath = models.getBaseLibraryPath();
			if (!currentPath) {
				this.$message('error', 'Current Syncing Dir Not found', 5000);
			}
			var newPath = dialog.showSaveDialog(remote.getCurrentWindow(), {
				title: 'Move Sync Folder',
				defaultPath: path.join(currentPath, 'pmlibrary')
			});
			if (!newPath) {
				return;
			}
			fs.mkdir(newPath, (err) => {
				if (err) {
					this.$message('error', 'Folder Already Existed', 5000);
					return;
				}
				// copy files
				models.copyData(currentPath, newPath);
				models.setBaseLibraryPath(newPath);
				remote.getCurrentWindow().reload();
			});
		},
		openSync() {
			var currentPath = models.getBaseLibraryPath();
			var newPaths = dialog.showOpenDialog(remote.getCurrentWindow(), {
				title: 'Open Existing Sync Folder',
				defaultPath: currentPath || '/',
				properties: ['openDirectory', 'createDirectory']
			});
			if (!newPaths) {
				return;
			}
			var newPath = newPaths[0];

			models.setBaseLibraryPath(newPath);
			settings.set('baseLibraryPath', newPath);
			remote.getCurrentWindow().reload();
		},
		/**
		 * shows the Credits dialog window.
		 * @function openCredits
		 * @return {Void} Function doesn't return anything
		 */
		openCredits() {
			var message = 'PileMd was originally created by Hiroki KIYOHARA.\n' +
				'The full list of Authors is available on GitHub.\n\n' +
				'This Fork with updated components and additional features is maintained by MattNer0.';

			this.$refs.dialog.init('Credits', message, [{
				label: 'Ok',
				cancel: true
			}]);
		},
		/**
		 * change the application theme.
		 * @function changeTheme
		 * @param  {String}  value  The theme name
		 * @return {Void} Function doesn't return anything
		 */
		changeTheme(value) {
			var allowedThemes = ['original', 'light', 'dark'];
			if(allowedThemes.indexOf(value) >= 0) {
				this.selectedTheme = value;
				settings.set('theme', value);

				var body = document.querySelector('body');
				switch(value) {
					case 'original':
						body.classList.add('original-theme');
						body.classList.remove('light-theme');
						break;
					case 'light':
						body.classList.add('light-theme');
						body.classList.remove('original-theme');
						break;
					case 'dark':
						body.classList.remove('light-theme');
						body.classList.remove('original-theme');
						break;
					default:
						break;
				}
			}
		},
		/**
		 * change how notes are sorted in the sidebar
		 * @function changeDisplayOrder
		 * @param  {String}  value   The sort by field
		 * @return {Void} Function doesn't return anything
		 */
		changeDisplayOrder(value) {
			var allowedOrders = ['updatedAt', 'createdAt', 'title'];
			if(allowedOrders.indexOf(value) >= 0) {
				this.notesDisplayOrder = value;
			}
		},
		/**
		 * sends a Flash Message.
		 * @function sendFlashMessage
		 * @param    {Integer}    period   How long it will last (in ms)
		 * @param    {String}     level    Flash level (info,error)
		 * @param    {String}     text     Flash message text
		 * @param    {String}     url      Url to open when Flash Message is clicked
		 * @return {Void} Function doesn't return anything
		 */
		sendFlashMessage(period, level, text, url) {
			var message = {
				level: 'flashmessage-' + level,
				text: text,
				period: period,
				url: url
			};
			this.messages.push(message);
			setTimeout(() => {
				this.messages.shift();
			}, message.period);
		},
		/**
		 * calculates the sidebar width and
		 * changes the main container margins to accomodate it.
		 * If the application is in fullscreen mode (sidebar hidden)
		 * then the sidebar is moved outside of the visible workspace.
		 * @function update_editor_size
		 * @return {Void} Function doesn't return anything
		 */
		update_editor_size() {
			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar .cell-container');
			if (cellsLeft.length == 0) {
				return;
			}

			var widthTotalLeft = parseInt( cellsLeft[0].style.width.replace('px','') ) + 4;
			widthTotalLeft += parseInt( cellsLeft[1].style.width.replace('px','') ) + 4;

			if(this.isFullScreen) {
				document.querySelector('.sidebar').style.left = '-' + widthTotalLeft + 'px';
				document.querySelector('.main-cell-container .my-browser').style.width = '100vw';
				widthTotalLeft = 0;
			} else {
				document.querySelector('.sidebar').style.left = '';
				setTimeout(() => {
					document.querySelector('.main-cell-container .my-browser').style.width = 'calc( 100vw - ' + widthTotalLeft + 'px )';
				}, 300);
			}

			setTimeout(() => {
				document.querySelector('.main-cell-container').style.marginLeft = widthTotalLeft + 'px';
			}, 5);
		},
		/**
		 * saves the sidebar width (both racks and notes lists).
		 * @function save_editor_size
		 * @return {Void} Function doesn't return anything
		 */
		save_editor_size() {
			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar .cell-container');
			this.racksWidth = cellsLeft.length > 0 ? parseInt( cellsLeft[0].style.width.replace('px','') ) : 180;
			settings.set('racksWidth', this.racksWidth);
			this.notesWidth = cellsLeft.length > 1 ? parseInt( cellsLeft[1].style.width.replace('px','') ) : 180;
			settings.set('notesWidth', this.notesWidth);
		},
		sidebarDrag() {
			this.update_editor_size();
		},
		sidebarDragEnd() {
			this.update_editor_size();
			this.save_editor_size();
		},
		updatePreview() {
			if(this.isPreview && this.selectedNote.data) {
				this.preview = preview.render(this.selectedNote, this);
				this.noteHeadings = preview.getHeadings();
			}
		},
		/**
		 * update the context menu in the system tray icon.
		 * @function updateTrayMenu
		 * @return {Void} Function doesn't return anything
		 */
		updateTrayMenu: _.debounce(function () {
			var self = this;
			traymenu.setRacks(this.racks, (rack) => {
				/**
				 * function called when user clicks on a rack or folder in the tray menu
				 * @param {Object}  rack  selected rack or folder in the tray menu
				 */
				self.openRack(rack);
				self.changeRackOrFolder(rack);
			}, (note) => {
				/**
				 * function called when user click on a note or bookmark in the tray menu
				 * @param {Object}  note  selected note
				 */
				self.changeNote(note);
			});
		}, 500)
	},
	watch: {
		isPreview() {
			this.updatePreview();
			this.scrollUpScrollbarNote();
		},
		fontsize() {
			settings.set('fontsize', this.fontsize);
		},
		keepHistory() {
			settings.set('keepHistory', this.keepHistory);
			if (!this.keepHistory) {
				this.notesHistory = [];
				models.resetHistory();
			}
		},
		selectedNote() {
			this.noteHeadings = [];
			this.updatePreview();
			if (this.selectedNote instanceof models.Note) {
				this.selectedRackOrFolder = this.selectedNote.data.folder;
				this.scrollUpScrollbarNote();
			}
		},
		'selectedNote.body': function() {
			this.saveNote();
		},
		selectedRackOrFolder() {
			//this.update_editor_size();
			this.scrollUpScrollbarNotes();
		}
	}
});
global.appVue = appVue;
