var path = require('path');
var fs = require('fs');

var settings = require('./utils/settings');
settings.init();
settings.loadWindowSize();

//var Vue = require('vue');
import Vue from 'vue';

//var ApplicationMenu = require('./applicationmenu').ApplicationMenu;
var models = require('./models');
var initialModels = require('./initialModels');
var preview = require('./preview');
var searcher = require('./searcher');

// Electron things
var electron = require('electron');
var remote = electron.remote;
var Menu = remote.Menu;
var MenuItem = remote.MenuItem;
var dialog = remote.dialog;

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

new Vue({
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
		fontsize: settings.get('fontsize') || "15"
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
		 * @return  {Array}  notes array
		 */
		filteredNotes() {
			var self = this;
			if(this.search && this.selectedRackOrFolder){
				if (this.selectedRackOrFolder instanceof models.Rack) {
					this.selectedRackOrFolder.folders.forEach(function(folder){
						var newNotes = folder.readContents();
						if(newNotes) self.notes = self.notes.concat(newNotes);
					});
				}
			}
			return searcher.searchNotes(this.selectedRackOrFolder, this.search, this.isNoteRackSelected ? this.notes : this.selectedRackOrFolder.notes);
		},
		/**
		 * Returns currently selected folder or "undefined" if no folder is selected.
		 * @return  {Object}  currently selected folder
		 */
		selectedFolder() {
			if(this.selectedRackOrFolder instanceof models.Folder) return this.selectedRackOrFolder;
			return undefined;
		},
		/**
		 * Check if the title attribute is defined to see
		 * if the "selectedNote" is really a note object or just an empty object
		 * @return  {Boolean}  true if note is selected
		 */
		isNoteSelected() {
			if(this.isNoteRackSelected && this.selectedNote.title) return true;
			return false;
		},
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

		this.$watch('selectedNote.body', () => {
			var result = models.Note.setModel(this.selectedNote);
			if (result && result.error && result.path) {
				this.$refs.dialog.init('Error', result.error + "\nNote: " + result.path, [{
					label: 'Ok',
					cancel: true
				}]);
			}
		});

		// Flash message
		this.$on('flashmessage-push', function(message) {
			this.messages.push(message);
			setTimeout(() => {
				this.messages.shift()
			}, message.period)
		});

		// Modal
		this.$on('modal-show', function(modalMessage) {
			this.modalTitle = modalMessage.title;
			this.modalDescription = modalMessage.description;
			this.modalPrompts = modalMessage.prompts;
			this.modalOkcb = modalMessage.okcb;
			this.modalShow = true;
		});

		if (!models.getBaseLibraryPath()) {
			// Hey, this is first time.
			// * Setting up directory
			// * Create new notes
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

		this.racks = racks;
		this.folders = folders;
		this.notes = notes;

		if(initial_notes.length > 0){
			initial_notes[0].data.rack.openFolders = true;
			this.selectedRackOrFolder = initial_notes[0].data.folder;
			this.selectedNote = initial_notes[0];
		}

		this.changeTheme(this.selectedTheme);

		// Save it not to remove
		//this.watcher = models.makeWatcher(this.racks, this.folders, this.notes);
	},
	mounted() {
		var self = this;
		this.$nextTick(function () {
			
			window.addEventListener('resize', (e) => {
				e.preventDefault();
				settings.saveWindowSize();
				self.update_editor_size();
			});

			this.init_sidebar_width();

			setTimeout(function(){
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
			this.$nextTick(function () {
				this.$refs.refNotes.scrollTop = 0;
			});
		},
		/**
		 * Scrolls to the top of the selected note.
		 */
		scrollUpScrollbarNote() {
			this.$nextTick(function () {
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
			return rf;
		},
		/**
		 * Event called when a note is selected.
		 * @param  {Object}  note  selected note
		 */
		changeNote(note) {
			var self = this;

			if (this.isNoteRackSelected) {
				if(!note.body) note.loadBody();
				if(note.isEncrypted){
					var message = "Insert the secret key to Encrypt and Decrypt this note";
					this.$refs.dialog.init('Secret Key', message, [{
						label: 'Ok',
						cb(data){
							var result = note.decrypt(data.secretkey);
							if(result.error) {
								setTimeout(function(){
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
			rack.folders = rack.folders.sort(function(a, b) { return a.ordering - b.ordering });
			rack.openFolders = true;
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
				models.Rack.setModel(r);
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
				models.Rack.setModel(r);
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
				models.Folder.setModel(f);
			});
			rack.folders = folders;
			this.folders.push(folder);
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
				models.Note.setModel(newNote);
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
				models.Note.setModel(newNote);
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
		addNotes(noteTexts) {
			var uid = this.calcSaveUid();
			var newNotes = noteTexts.map((noteText) => {
				return new models.Note({body: noteText, folderUid: uid})
			});
			newNotes.forEach((note) => {
				models.Note.setModel(note);
			});
			this.notes = newNotes.concat(this.notes)
		},
		/*isSearchAll() {
			return this.selectedRackOrFolder === null;
		},
		selectAll() {
			this.selectedRackOrFolder = null;
		},
		allDragOver(event) {
			if (!this.draggingNote || this.draggingNote.folderUid == null) {
				event.preventDefault();
				return false
			}
			//event.preventDefault();
			this.allDragHover = true;
		},
		allDragLeave(event) {
			if (!this.draggingNote) {return false}
			this.allDragHover = false;
		},
		dropToAll(event) {
			if (!this.draggingNote || this.draggingNote.folderUid == null) {
				event.preventDefault();
				event.stopPropagation();
				return false
			}
			this.allDragHover = false;
			var note = this.draggingNote;
			note.folderUid = null;
			models.Note.setModel(note);

			var s = this.selectedRackOrFolder;
			this.selectedRackOrFolder = null;
			this.draggingNote = null;
			Vue.nextTick(() => {
				this.selectedRackOrFolder = s;
			});
		},*/
		/**
		 * Displays context menu for the list of racks.
		 */
		shelfMenu() {
			var menu = new Menu();
			menu.append(new MenuItem({
				label: 'Add Rack',
				click() { this.addRack(); }
			}));
			menu.append(new MenuItem({
				label: 'Add Rack Separator',
				click() { this.addRackSeparator(); }
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
		}
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
		selectedRackOrFolder() {
			if (this.selectedRackOrFolder) {
				var newData = this.selectedRackOrFolder.readContents();

				if (this.selectedRackOrFolder instanceof models.Folder) {
					if(newData) {
						this.notes = this.notes.concat( newData );
						this.selectedRackOrFolder.notes = newData;
					}
					var filteredNotes = searcher.searchNotes(this.selectedRackOrFolder, this.search, this.notes);
					filteredNotes.forEach(function(note){
						if(!note.body) note.loadBody();
					});
				} else {
					if(newData) this.folders = this.folders.concat( newData );
				}
				this.update_editor_size();
			}
			this.scrollUpScrollbarNotes();
		}
	}
});
