const path = require('path');
const fs = require('fs');

const _ = require('lodash');

var settings = require('./utils/settings');
settings.init();
settings.loadWindowSize();

var libini = require('./utils/libini');
var traymenu = require('./utils/traymenu');

//var Vue = require('vue');
import Vue from 'vue';

//var ApplicationMenu = require('./applicationmenu').ApplicationMenu;
var models = require('./models');
var initialModels = require('./initialModels');
var preview = require('./preview');
var searcher = require('./searcher');

// Electron things
const electron = require('electron');
const remote = electron.remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const dialog = remote.dialog;

var arr = require('./utils/arr');

// Vue.js plugins
import component_flashmessage from './components/flashmessage.vue';
import component_racks from './components/racks.vue';
import component_notes from './components/notes.vue';
import component_modal from './components/modal.vue';
import component_addNote from './components/addNote.vue';
import component_windowBar from './components/windowBar.vue';
import component_titleMenu from './components/titleMenu.vue';
import component_noteMenu from './components/noteMenu.vue';
import component_handlerStack from './components/handlerStack.vue';
import component_handlerNotes from './components/handlerNotes.vue';
import component_codeMirror from './components/codemirror.vue';

// Loading CSSs
require('../scss/pilemd-light.scss');
require('../scss/pilemd-original.scss');
require('../scss/pilemd.scss');

// Not to accept image dropping and so on.
// Electron will be show local images without this.
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
		isFullScreen: false,
		isPreview: settings.get('vue_isPreview') || false,
		selectedTheme: settings.get('theme') || 'original',
		preview: "",
		racks: [],
		folders: [],
		notes: [],
		selectedRackOrFolder: null,
		search: "",
		selectedNote: {},
		draggingNote: null,
		allDragHover: false,
		messages: [],
		modalShow: false,
		modalTitle: 'title',
		modalDescription: 'description',
		modalPrompts: [],
		modalOkcb: null,
		racksWidth: settings.get('racksWidth') || 180,
		notesWidth: settings.get('notesWidth') || 180,
		propertiesWidth: 180,
		fontsize: settings.get('fontsize') || "15",
		notesDisplayOrder: 'updatedAt',
	},
	components: {
		'flashmessage': component_flashmessage,
		'racks': component_racks,
		'notes': component_notes,
		'modal': component_modal,
		'addNote': component_addNote,
		'windowBar': component_windowBar,
		'titleMenu': component_titleMenu,
		'noteMenu': component_noteMenu,
		'handlerStack': component_handlerStack,
		'handlerNotes': component_handlerNotes,
		'codemirror': component_codeMirror
	},
	computed: {
		
		/**
		 * Filters notes based on search terms.
		 * It also makes sure that all the notes inside the current selected rack are loaded,
		 * otherwise we wouldn't be able to find any results for the current search.
		 * 
		 * @return  {Array}  notes array
		 */
		filteredNotes() {
			if(this.search && this.selectedRackOrFolder){
				if (this.selectedRackOrFolder instanceof models.Rack) {
					this.selectedRackOrFolder.folders.forEach((folder) => {
						var newNotes = folder.readContents();
						if(newNotes) this.notes = this.notes.concat(newNotes);
					});
				}
			}

			var notes = this.isNoteRackSelected ? this.notes : this.selectedRackOrFolder.notes;
			//arr.sortBy(notes, this.notesDisplayOrder, false)
			return searcher.searchNotes(this.selectedRackOrFolder, this.search, notes);
		},
		/**
		 * Returns currently selected folder or "undefined" if no folder is selected.
		 * 
		 * @return    {Object}     Currently selected folder
		 */
		selectedFolder() {
			if(this.selectedRackOrFolder instanceof models.Folder) return this.selectedRackOrFolder;
			return undefined;
		},
		/**
		 * Check if the title attribute is defined to see
		 * if the "selectedNote" is really a note object or just an empty object
		 * 
		 * @return    {Boolean}    True if note is selected
		 */
		isNoteSelected() {
			if(this.isNoteRackSelected && this.selectedNote.title) return true;
			return false;
		},
		/**
		 * Check if the current selected rack is a bookmark rack or not.
		 * 
		 * @return    {Boolean}    True if current rack doesn't hold bookmarks.
		 */
		isNoteRackSelected() {
			if(this.selectedRackOrFolder instanceof models.BookmarkFolder) return false;
			return true;
		}
	},
	created() {
		var notes = [];
		var folders = [];
		var racks = [];
		var initial_notes = [];

		// Modal
		this.$on('modal-show', (modalMessage) => {
			this.modalTitle = modalMessage.title;
			this.modalDescription = modalMessage.description;
			this.modalPrompts = modalMessage.prompts;
			this.modalOkcb = modalMessage.okcb;
			this.modalShow = true;
		});

		if (!models.getBaseLibraryPath()) {
			// Hey, this is the first time.
			initialModels.initialFolder();
		}

		if( models.doesLibraryExists() ){
			// Library folder exists, let's read what's inside

			racks = models.Rack.readRacks();
			if( racks.length == 0 ){
				initial_notes = initialModels.initialSetup(racks);
				racks = models.Rack.readRacks();

				if(initial_notes.length == 1){
					folders = initial_notes[0].data.rack.readContents();
					notes = initial_notes;
				}
			}
		}

		this.racks = arr.sortBy(racks.slice(), 'ordering', true);
		this.folders = folders;
		this.notes = notes;

		if(initial_notes.length > 0){
			initial_notes[0].data.rack.openFolders = true;
			this.selectedRackOrFolder = initial_notes[0].data.folder;
			this.selectedNote = initial_notes[0];
		}

		this.changeTheme(this.selectedTheme);
		traymenu.init();

		var last_history = libini.readKey(models.getBaseLibraryPath(), 'history');
		if (last_history && last_history.rack.length > 0) {
			last_history.rack.forEach((r, i) => {
				this.readRackContent(this.racks[r]);
			});
			this.updateTrayMenu();
		}

		if(remote.getGlobal('argv')) {
			var argv = remote.getGlobal('argv');
			if(argv.length > 1 && path.extname(argv[1]) == '.md' && fs.existsSync(argv[1])) {
				var notePath = argv[1];
				var noteData = models.Note.isValidNotePath(notePath);
				if (noteData) {
					console.log('opened note', notePath);
					if (notePath.indexOf(models.getBaseLibraryPath()) == 0) {
						var openedRack = this.racks.find((rack) => {
							return rack.data.path == path.join(path.dirname(notePath), '..');
						});
						if(openedRack) this.readRackContent(openedRack);
						var openedNote = this.notes.find((note) => {
							return note.data.path == notePath;
						});
						if(openedNote) {
							this.changeRackOrFolder(openedNote.data.folder);
							this.changeNote(openedNote);
						}
					} else {
						if(noteData.ext == '.mdencrypted' ) {

						} else {
							var openedNote = new models.Note({
								name: path.basename(notePath, noteData.ext),
								body: "",
								path: notePath,
								extension: noteData.ext,
								created_at: noteData.stat.birthtime,
								updated_at: noteData.stat.mtime
							});
							this.notes.push(openedNote);
							this.changeNote(openedNote);
						}
					}
				} else {
					console.log('path not valid!');
				}
			}
		}

		// Save it not to remove
		//this.watcher = models.makeWatcher(this.racks, this.folders, this.notes);
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

			setTimeout(() => {
				self.update_editor_size();
			}, 100);
		});
	},
	methods: {
		/**
		 * Initialize the width of the left sidebar elements.
		 */
		init_sidebar_width() {
			var handlerStack = document.getElementById('handlerStack')
			if(handlerStack) handlerStack.previousElementSibling.style.width = this.racksWidth+"px";

			var handlerNotes = document.getElementById('handlerNotes')
			if(handlerNotes) handlerNotes.previousElementSibling.style.width = this.notesWidth+"px";
		},
		/**
		 * Scrolls to the top of the notes sidebar.
		 */
		scrollUpScrollbarNotes() {
			this.$nextTick(() => {
				this.$refs.refNotes.scrollTop = 0;
			});
		},
		/**
		 * Scrolls to the top of the selected note.
		 */
		scrollUpScrollbarNote() {
			this.$nextTick(() => {
				this.$refs.myEditor.scrollTop = 0;
			});
		},
		/**
		 * Event called when rack or folder is selected.
		 * @param  {Object}  obj  selected rack or folder
		 * @return {Object}       previous rack or folder selected
		 */
		changeRackOrFolder(obj) {
			var rf = this.selectedRackOrFolder;
			this.selectedRackOrFolder = obj;
			if(this.selectedRackOrFolder && !this.selectedRackOrFolder.data.bookmarks) {
				if (this.selectedRackOrFolder instanceof models.Rack) {
					libini.pushKey(models.getBaseLibraryPath(), ['history', 'rack'], this.selectedRackOrFolder.ordering, 3 );
				} else {
					libini.pushKey(models.getBaseLibraryPath(), ['history', 'rack'], this.selectedRackOrFolder.data.rack.ordering, 3 );
					//libini.pushKey(models.getBaseLibraryPath(), ['history', 'folder'], this.selectedRackOrFolder.ordering, 3 );
				}
			}
			return rf;
		},
		/**
		 * Event called when a note is selected.
		 * @param  {Object}  note  selected note
		 */
		changeNote(note) {
			var self = this;

			if (this.isNoteSelected) {
				//if (!this.isPreview) this.$refs.refCodeMirror.updateNoteBeforeSaving();
				this.saveNote();
			}

			if (this.isNoteRackSelected) {
				if (!note.body) note.loadBody();
				if (note.isEncrypted) {
					var message = "Insert the secret key to Encrypt and Decrypt this note";
					this.$refs.dialog.init('Secret Key', message, [{
						label: 'Ok',
						cb(data) {
							var result = note.decrypt(data.secretkey);
							if(result.error) {
								setTimeout(() => {
									self.$refs.dialog.init('Error', result.error + "\nNote: " + note.path, [{
										label: 'Ok',
										cancel: true
									}]);	
								}, 100);
							} else {
								self.selectedNote = note;
							}
						}
					}, {
						label: 'Cancel',
						cancel: true
					}], [{
						type: 'password',
						retValue: '',
						label: 'Secret Key',
						name: 'secretkey',
						required: true
					}]);
				} else {
					this.selectedNote = note;
				}
			} else {
				electron.shell.openExternal(note.body);
			}
		},
		/**
		 * Event called when a note is dragged.
		 * @param  {Object}  note  Note being dragged
		 */
		setDraggingNote(note) {
			this.draggingNote = note;
		},
		/**
		 * Event called when user selects a new Rack.
		 * Loads folders inside the specified Rack and orders them.
		 * The folders are then displayed in the sidebar
		 * @param  {Object}  rack  rack to be opened
		 */
		openRack(rack) {
			if(!(rack instanceof models.Rack)) return;
			this.readRackContent(rack);
			rack.openFolders = true;
		},
		readRackContent(rack) {
			if(!(rack instanceof models.Rack)) return;
			var newData = rack.readContents();
			if(newData) {
				this.folders = this.folders.concat( newData );
				for(var i=0;i<newData.length;i++){
					var newNotes = newData[i].readContents();
					if(newNotes) {
						this.notes = this.notes.concat( newNotes );
						newData[i].notes = newNotes;
					}
				}
			}
			rack.folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
		},
		/**
		 * Hides rack content (folders).
		 * @param  {Object}  rack  rack to be closed
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
		 * Adds a new rack to the working directory.
		 * The new rack is placed on top of the list.
		 * @param {Object}  rack  new rack
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
		 * Adds a new rack separator to the working directory.
		 * The new rack is placed on top of the list.
		 */
		addRackSeparator() {

			var rack = new models.RackSeparator();
			var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
			racks.unshift(rack);
			racks.forEach((r, i) => {
				r.ordering = i;
				r.saveModel();
			});
			this.racks = racks;
		},
		/**
		 * Removes one Rack and its contents from the current working directory.
		 * @param  {Object}  rack  rack to be removed
		 */
		removeRack(rack) {
			rack.remove(this.notes, this.folders);
			arr.remove(this.racks, (r) => {return r == rack});
			this.selectedRackOrFolder = null;
			// We need to close the current selected note if it was from the removed rack.
			if(this.isNoteSelected && this.selectedNote.data.rack == rack) {
				this.selectedNote = {};
			}
		},
		/**
		 * Inserts a new Folder inside the selected Rack.
		 * The new Folder is placed on top of the list.
		 * @param {Object}  rack    current rack
		 * @param {Object}  folder  new folder
		 */
		addFolderToRack(rack, folder) {
			this.openRack(rack);
			var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
			folders.unshift(folder);
			folders.forEach((f, i) => {
				f.ordering = i;
				if(!f.data.bookmarks) f.saveModel();
			});
			rack.folders = folders;
			if(rack.data.bookmarks) rack.saveModel();
			else this.folders.push(folder);
		},
		/**
		 * Deletes a folder and its contents from the parent rack.
		 * @param  {Object}  folder  folder to be removed
		 */
		deleteFolder(folder) {
			folder.remove(this.notes);
			
			arr.remove(this.folders, (f) => {return f == folder});
			arr.remove(folder.data.rack.folders, (f) => {return f == folder});

			this.selectedRackOrFolder = null;
			// We need to close the current selected note if it was from the removed folder.
			if(this.isNoteSelected && this.selectedNote.data.folder == folder) {
				this.selectedNote = {};
			}
		},
		/**
		 * Event called after folder was dragged into a rack.
		 * @param  {Object}  rack    rack folder dragged into
		 * @param  {Object}  folder  dragged folder
		 */
		folderDragEnded(rack, folder) {
			if(!rack) return;
			rack.folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
		},
		/**
		 * Toggles left sidebar.
		 */
		toggleFullScreen() {
			this.isFullScreen = !this.isFullScreen;
			settings.set('vue_isFullScreen', this.isFullScreen);
			this.update_editor_size();
		},
		/**
		 * Toggles markdown note preview.
		 */
		togglePreview() {
			this.isPreview = !this.isPreview;
			settings.set('vue_isPreview', this.isPreview);
			this.update_editor_size();
		},
		calcSaveUid() {
			if (this.selectedRackOrFolder instanceof models.Rack) {
				var f = this.selectedRackOrFolder.folders;
				if (!f || f.length == 0) {
					return null;
				} else {
					return f[0].uid
				}
			} else if (this.selectedRackOrFolder instanceof models.Folder) {
				return this.selectedRackOrFolder.uid;
			} else {
				return null;
			}
		},
		/**
		 * Finds the currently selected folder.
		 * If a rack object is selected instead of a folder object,
		 * then it will get the first folder inside the rack.
		 * @return  {Object}  folder object if one is selected, "null" otherwise
		 */
		getCurrentFolder() {
			if (this.selectedRackOrFolder == null){
				return null;
			} else if (this.selectedRackOrFolder instanceof models.Rack) {
				var f = this.selectedRackOrFolder.folders;
				if (!f || f.length == 0) {
					return null;
				} else {
					return f[0];
				}
			} else if (this.selectedRackOrFolder instanceof models.Folder) {
				return this.selectedRackOrFolder;
			} else {
				return null;
			}
		},
		/**
		 * Add new note to the current selected Folder
		 */
		addNote() {
			var currFolder = this.getCurrentFolder();
			var newNote = models.Note.newEmptyNote(currFolder);
			if(newNote){
				if(currFolder.notes) currFolder.notes.unshift(newNote);
				this.notes.unshift(newNote);
				newNote.saveModel();
				this.changeNote(newNote);
				this.isPreview = false;

				if (this.search.length > 0) {
					this.search = '';
				}
			} else {
				if(this.racks.length > 0){
					var message = 'You must select Rack and Folder first!';
				} else {
					var message = 'You must create a Folder first!';
				}
				this.$refs.dialog.init('Error', message, [{
					label: 'Ok'
				}]);
			}
		},
		/**
		 * Add new encrypted note to the current selected Folder
		 */
		addEncryptedNote() {
			var currFolder = this.getCurrentFolder();
			var newNote = models.EncryptedNote.newEmptyNote(currFolder);
			if(newNote){
				if(currFolder.notes) currFolder.notes.unshift(newNote);
				this.notes.unshift(newNote);
				newNote.saveModel();
				this.changeNote(newNote);
				this.isPreview = false;

				if (this.search.length > 0) {
					this.search = '';
				}
			} else {
				if(this.racks.length > 0){
					var message = 'You must select Rack and Folder first!';
				} else {
					var message = 'You must create a Folder first!';
				}
				this.$refs.dialog.init('Error', message, [{
					label: 'Ok'
				}]);
			}
		},
		/**
		 * add a series of notes
		 * @param {Array}  noteTexts  array which contains the new notes
		 */
		addNotes(noteTexts) {
			var uid = this.calcSaveUid();
			var newNotes = noteTexts.map((noteText) => {
				return new models.Note({body: noteText, folderUid: uid})
			});
			newNotes.forEach((note) => {
				note.saveModel();
			});
			this.notes = newNotes.concat(this.notes)
		},
		/**
		 * Save current selected Note.
		 */
		saveNote() {
			if(this.selectedNote && this.isPreview) this.preview = preview.render(this.selectedNote, this);
			var result = this.selectedNote.saveModel();
			if (result && result.error && result.path) {
				/*this.$refs.dialog.init('Error', result.error + "\nNote: " + result.path, [{
					label: 'Ok',
					cancel: true
				}]);*/
				this.sendFlashMessage(3000, 'error', result.error);
			} else if(result && result.saved) {
				this.sendFlashMessage(1000, 'info', 'Note saved');
			}
		},
		/**
		 * add a new bookmark inside a specific folder
		 * @param {Object}  folder  selected folder
		 */
		addBookmark(folder) {
			var newBookmark = models.BookmarkFolder.newEmptyBookmark(folder);
			folder.notes.push(newBookmark);
			this.editBookmark(newBookmark);
		},
		/**
		 * edit bookmark title and url through a popup dialog
		 * @param {Object}  bookmark  selected bookmark object
		 */
		editBookmark(bookmark) {
			var self = this;
			this.$refs.dialog.init('Bookmark', '', [{
				label: 'Cancel',
				cancel: true,
				/**
				 * function called when user click on the 'Cancel' button
				 *
				 * @param      {Object}            data    Form data object
				 */
				cb(data) {
					if(bookmark.name === '' && bookmark.body === '') {
						bookmark.folder.removeNote(bookmark);
					}
				}
			}, {
				label: 'Ok',
				/**
				 * function called when user click on the 'Ok' button
				 *
				 * @param      {Object}            data    Form data object
				 */
				cb(data) {
					if(bookmark.body != data.bkurl || !bookmark.attributes['THUMBNAIL']) {
						console.log('Loading Bookmark thumbnail...', data.bkurl);
						models.BookmarkFolder.setBookmarkNameUrl(bookmark, data.bkname, data.bkurl);
						self.$refs.webview.src = data.bkurl;
						var bookmarkFavicon = (e) => {
							if(e.favicons && e.favicons.length > 0) {
								models.BookmarkFolder.setBookmarkIcon(bookmark, e.favicons[0]);
							}
							self.$refs.webview.removeEventListener('page-favicon-updated', bookmarkFavicon);
						};
						var bookmarkLoaded = (e) => {
							if(bookmark.name === '') {
								models.BookmarkFolder.setBookmarkNameUrl(bookmark, self.$refs.webview.getTitle(), data.bkurl);
							}
							self.$refs.webview.capturePage((image) => {
								/**
								 * callback after webview took a page screenshot
								 * 
								 * @param    {Object}     image     NativeImage page screenshot
								 */
								self.$refs.webview.src = '';
								models.BookmarkFolder.setBookmarkThumb(bookmark, image);
								console.log('Bookmark thumbnail was succesful!');
								bookmark.rack.saveModel();
							});
							self.$refs.webview.removeEventListener('did-finish-load', bookmarkLoaded);
						};

						self.$refs.webview.addEventListener('page-favicon-updated', bookmarkFavicon);
						self.$refs.webview.addEventListener('did-finish-load', bookmarkLoaded);
					} else {
						models.BookmarkFolder.setBookmarkNameUrl(bookmark, data.bkname, data.bkurl);
					}
					bookmark.rack.saveModel();
				},
				/**
				 * validate the form input data
				 *
				 * @param      {Object}            data    Form data object
				 * @return     {(boolean|string)}          If false, the validation was succesful.
				 *                                         If a string value is returned it means that's the name of the field that failed validation.
				 */
				validate(data) {
					var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
					var regex = new RegExp(expression);
					if (data.bkurl.match(regex)) {
						return false;
					} else {
						/**
						 * @todo gonna use this to highlight the wrong field in the dialog form
						 */
						return 'bkurl';
					}
				}
			}], [{
				type: 'text',
				retValue: bookmark.name,
				label: 'Name',
				name: 'bkname',
				required: false
			},{
				type: 'text',
				retValue: bookmark.body,
				label: 'URL',
				name: 'bkurl',
				required: true
			}]);
		},
		openImg(url) {
			this.$refs.dialog.image(url);
		},
		/**
		 * Displays context menu for the list of racks.
		 */
		shelfMenu() {
			var self = this;
			var menu = new Menu();
			menu.append(new MenuItem({
				label: 'Add Rack',
				click() { self.$refs.refRacks.addRack(); }
			}));
			menu.append(new MenuItem({
				label: 'Add Bookmark Rack',
				click() {
					self.$refs.refRacks.addBookmarkRack();
				}
			}));
			menu.append(new MenuItem({
				label: 'Add Rack Separator',
				click() { self.addRackSeparator(); }
			}));
			menu.popup(remote.getCurrentWindow());
		},
		/**
		 * Displays context menu on the selected note in preview mode.
		 */
		previewMenu() {
			var clipboard = electron.clipboard;
			var self = this;
			var menu = new Menu();

			menu.append(new MenuItem({
				label: 'Copy',
				accelerator: 'CmdOrCtrl+C',
				click() { document.execCommand("copy"); }
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
				filters: [{name: 'Markdown', extensions: ['md', 'markdown', 'txt']}],
				properties: ['openFile', 'multiSelections']
			});
			if (!notePaths || notePaths.length == 0) {
				return
			}
			var noteBodies = notePaths.map((notePath) => {
				return fs.readFileSync(notePath, 'utf8');
			});
			this.addNotes(noteBodies);
		},
		moveSync() {
			var currentPath = models.getBaseLibraryPath();
			if (!currentPath) {this.$message('error', 'Current Syncing Dir Not found', 5000)}
			var newPath = dialog.showSaveDialog(remote.getCurrentWindow(), {
				title: 'Move Sync Folder',
				defaultPath: path.join(currentPath, 'pmlibrary')
			});
			if (!newPath) {return}
			fs.mkdir(newPath, (err) => {
				if (err) {this.$message('error', 'Folder Already Existed', 5000); return}
				// Copy files
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
			if (!newPaths) {return}
			var newPath = newPaths[0];

			models.setBaseLibraryPath(newPath);
			settings.set('baseLibraryPath', newPath);
			remote.getCurrentWindow().reload();
		},
		/**
		 * Shows the Credits dialog window.
		 */
		openCredits() {
			var message = "PileMd was originally created by Hiroki KIYOHARA.\n"+
				"The full list of Authors is available on GitHub.\n\n"+
				"This Fork with updated components and additional features is maintained by MattNer0.";

			this.$refs.dialog.init('Credits', message, [{
				label: 'Ok',
				cancel: true
			}]);
		},
		/**
		 * Change the application theme.
		 * @param  {String}  value  theme name
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
						body.classList.remove("light-theme");
						break;
					case 'light':
						body.classList.add('light-theme');
						body.classList.remove('original-theme');
						break;
					case 'dark':
						body.classList.remove('light-theme');
						body.classList.remove('original-theme');
						break;
				}
			}
		},
		/**
		 * Sends a Flash Message.
		 *
		 * @param      {Integer}    period   How long it will last (in ms)
		 * @param      {String}     level    Flash level (info,error)
		 * @param      {String}     text     Flash message text
		 * @param      {String}     url      Url to open when Flash Message is clicked
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
		 * Calculates the sidebar width and
		 * changes the main container margins to accomodate it.
		 * If the application is in fullscreen mode (sidebar hidden)
		 * then the sidebar is moved outside of the visible workspace.
		 */
		update_editor_size() {
			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar .cell-container');
			if (cellsLeft.length == 0) {
				return;
			}

			var widthTotalLeft = parseInt( cellsLeft[0].style.width.replace('px','') ) + 5;
			if(this.isNoteRackSelected) widthTotalLeft += parseInt( cellsLeft[1].style.width.replace('px','') ) + 5;

			if(this.isFullScreen) {
				document.querySelector('.sidebar').style.left = "-"+widthTotalLeft+'px';
				widthTotalLeft = 0;
			} else {
				document.querySelector('.sidebar').style.left = "";
			}

			document.querySelector('.main-cell-container').style.marginLeft = widthTotalLeft+'px';
		},
		/**
		 * Saves the sidebar width (both racks and notes lists).
		 */
		save_editor_size() {
			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar .cell-container');
			this.racksWidth = cellsLeft.length > 0 ? parseInt( cellsLeft[0].style.width.replace('px','') ) : 180;
			settings.set('racksWidth', this.racksWidth);
			if(this.isNoteRackSelected) {
				this.notesWidth = cellsLeft.length > 1 ? parseInt( cellsLeft[1].style.width.replace('px','') ) : 180;
				settings.set('notesWidth', this.notesWidth);
			}
		},
		sidebarDrag() {
			this.update_editor_size();
		},
		sidebarDragEnd() {
			this.update_editor_size();
			this.save_editor_size();
		},
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
			}, 500
		)
	},
	watch: {
		isPreview() {
			if(this.selectedNote.data){
				this.preview = preview.render(this.selectedNote, this);
			}
			this.scrollUpScrollbarNote();
		},
		fontsize() {
			settings.set('fontsize', this.fontsize);
		},
		selectedNote() {
			if(this.isPreview) {
				this.preview = preview.render(this.selectedNote, this);
			}
			this.selectedRackOrFolder = this.selectedNote.data.folder;
			this.scrollUpScrollbarNote();
		},
		'selectedNote.body': function() {
			this.saveNote();
		},
		selectedRackOrFolder() {
			if (this.selectedRackOrFolder) {
				var newData = this.selectedRackOrFolder.readContents();

				if (this.selectedRackOrFolder instanceof models.Folder) {
					if(newData) {
						this.notes = this.notes.concat( newData );
						this.selectedRackOrFolder.notes = newData;
					}
					var filteredNotes = searcher.searchNotes(this.selectedRackOrFolder, this.search, this.notes);
					filteredNotes.forEach((note) => {
						if(!note.body) note.loadBody();
					});
				} else {
					if(newData) this.folders = this.folders.concat( newData );
				}
				this.update_editor_size();
			}
			this.scrollUpScrollbarNotes();
		},
		racks() {
			this.updateTrayMenu();
		},
		folders() {
			this.updateTrayMenu();
		},
		notes() {
			this.updateTrayMenu();
		}
	}
});
global.appVue = appVue;
