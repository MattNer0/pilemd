const path = require('path');
const fs = require('fs');

const settings = require('./utils/settings');
settings.init();
settings.loadWindowSize();

const Vue = require('vue');
const moment = require('moment');

//const Handler = require('./resizeHandler');

const ApplicationMenu = require('./applicationmenu').ApplicationMenu;
const models = require('./models');
const initialModels = require('./initialModels');
const preview = require('./preview');
const searcher = require('./searcher');

// Electron things
const remote = require('electron').remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;
const dialog = remote.dialog;

const arr = require('./utils/arr');

// Vue.js plugins
Vue.use(require('./components/flashmessage'));
Vue.use(require('./components/modal/modal'));
Vue.use(require('./components/racks/racks'));
Vue.use(require('./components/notes/notes'));
Vue.use(require('./components/codemirror'),
	{imageURL: '', imageParamName: 'image'});
Vue.use(require('./components/resizeHandler').handlerStack);
Vue.use(require('./components/resizeHandler').handlerNotes);
Vue.use(require('./components/menu/titleMenu'));
Vue.use(require('./components/menu/codemirrorMenu'));

// Loading CSSs

require('../css/materialicons.css');
require('../css/mystyle.css');
require('../css/highlight.css');

//require('../css/tinyscrollbar.css');
//const tinyscrollbar = require('./tinyscrollbar.min.js');

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
	replace: false,
	data: {
		isFullScreen: false,
		isPreview: settings.get('vue_isPreview') || false,
		preview: "",
		racks: [],
		editingRack: null,
		folders: [],
		notes: [],
		selectedRackOrFolder: null,
		search: "",
		selectedNote: {},
		draggingNote: null,
		allDragHover: false,
		messages: [],
		modalShow: false,
		modalTitle: 'Title',
		modalDescription: 'description',
		modalPrompts: [],
		modalOkcb: null,
		racksWidth: 180,
		notesWidth: 180,
		//scrollbarNotes: null
	},
	computed: {
		filteredNotes: function() {
			var self = this;
			if(this.search && this.selectedRackOrFolder){
				if (this.selectedRackOrFolder instanceof models.Rack) {
					this.selectedRackOrFolder.folders.forEach(function(folder){
						var newNotes = folder.readContents();
						if(newNotes){
							console.log('folder deep', folder.name);
							console.log(newNotes);
							self.notes = self.notes.concat(newNotes);
						}
					});
				}
			}
			return searcher.searchNotes(this.selectedRackOrFolder, this.search, this.notes);
		}
	},
	created: function() {
		var notes = [];
		var folders = [];
		var racks = [];
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
				initialModels.initialSetup();
				racks = models.Rack.readRacks();
			}
		}
		
		this.$set('racks', 		racks);
		this.$set('folders', 	folders);
		this.$set('notes', 		notes);

		this.$watch('selectedNote.body', () => {
			var result = models.Note.setModel(this.selectedNote);
			if(result && result.error && result.path){
				dialog.showMessageBox(remote.getCurrentWindow(), {
					type: "none",
					buttons: ['Ok'],
					title: "Error",
					message: result.error + "\nNote: " + result.path
				});
			}
		});

		this.$watch('selectedNote', () => {
			if(this.isPreview) {
				this.$set('preview', preview.render(this.selectedNote, this));
			}
		});

		this.$watch('selectedRackOrFolder', () => {

			if(this.selectedRackOrFolder){
				var newData = this.selectedRackOrFolder.readContents();

				if (this.selectedRackOrFolder instanceof models.Folder) {
					if(newData) this.notes = this.notes.concat( newData );
					var filteredNotes = searcher.searchNotes(this.selectedRackOrFolder, this.search, this.notes);
					filteredNotes.forEach(function(note){
						if(!note.body) note.loadBody();
					});
				} else {
					if(newData) this.folders = this.folders.concat( newData );
				}
			}
		});

		/*this.$watch('filteredNotes', () => {
			setTimeout(() => {
				this.update_scrollbar_notes();
			}, 100);
		});*/

		this.$watch('isPreview', () => {
			if(this.selectedNote.data){
				this.$set('preview', preview.render(this.selectedNote, this));
			}
		});

		// Should select latest selected note.
		/*if(notes.length > 0){
			this.selectedNote = models.Note.latestUpdatedNote(notes);
		}*/

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

		/*var app = new ApplicationMenu();
		app.setToggleWidescreen(this.toggleFullScreen);
		app.setTogglePreview(this.togglePreview);
		app.setAddNewNote(this.addNote);
		app.setCredits(this.openCredits);
		app.setImportNotes(this.importNotes);
		app.setMoveSync(this.moveSync);
		app.setOpenExistingSync(this.openSync);
		*/
		// Save it not to remove
		
		//this.watcher = models.makeWatcher(this.racks, this.folders, this.notes);
	},
	ready: function(){
		/*var $scrollbar = document.querySelector(".my-notes");
		this.scrollbarNotes  = tinyscrollbar($scrollbar);*/
		var self = this;
		window.addEventListener('resize', (e) => {
			e.preventDefault();
			settings.saveWindowSize();
			self.update_editor_size();
		});
	},
	events: {
		togglePreview: function() {
			this.isPreview = !this.isPreview;
			settings.set('vue_isPreview', this.isPreview);

			this.update_editor_size();

			if(this.isPreview){

				var menu = new ApplicationMenu();
				// FIXME as same as componets/codemirror.js Fucking hell
				menu.setEditSubmenu([
					{
						label: 'Cut',
						accelerator: 'CmdOrCtrl+X',
						role: 'cut'
					},
					{
						label: 'Copy',
						accelerator: 'CmdOrCtrl+C',
						role: 'copy'
					},
					{
						label: 'Paste',
						accelerator: 'CmdOrCtrl+V',
						role: 'paste'
					}]);
				//menu.setMenu();
			}
		}
	},
	methods: {
		toggleFullScreen: function() { 
			this.isFullScreen = !this.isFullScreen;
			settings.set('vue_isFullScreen', this.isFullScreen);
			this.update_editor_size();
		},
		togglePreview: function() {
			this.$dispatch('togglePreview');
		},
		addRack: function() {
			var rack = new models.Rack({name: "", ordering: 0});
			var racks = arr.sortBy(this.racks.slice(), 'ordering', true);
			racks.push(rack);
			racks.forEach((r, i) => {
				r.ordering = i;
				models.Rack.setModel(r);
			});
			this.racks = racks;
			this.editingRack = rack;
		},
		calcSaveUid: function() {
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
		getCurrentFolder: function() {
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
		addNote: function() {
			var newNote = models.Note.newEmptyNote( this.getCurrentFolder() );
			if(newNote){
				this.notes.unshift(newNote);
				models.Note.setModel(newNote);
				this.selectedNote = newNote;
				this.isPreview = false;

				if (this.search.length > 0) {
					this.search = '';
				}
			} else {
				if(this.racks.length > 0){
					dialog.showErrorBox("Error", "You must select Rack and Folder first!" );
				} else {
					dialog.showErrorBox("Error", "You must create a Folder first!" );
				}
			}
		},
		addNotes: function(noteTexts) {
			var uid = this.calcSaveUid();
			var newNotes = noteTexts.map((noteText) => {
				return new models.Note({body: noteText, folderUid: uid})
			});
			newNotes.forEach((note) => {
				models.Note.setModel(note);
			});
			this.notes = newNotes.concat(this.notes)
		},
		isSearchAll: function() {
			return this.selectedRackOrFolder === null;
		},
		selectAll: function() {
			this.selectedRackOrFolder = null;
		},
		allDragOver: function(event) {
			if (!this.draggingNote || this.draggingNote.folderUid == null) {
				event.preventDefault();
				return false
			}
			//event.preventDefault();
			this.allDragHover = true;
		},
		allDragLeave: function(event) {
			if (!this.draggingNote) {return false}
			this.allDragHover = false;
		},
		dropToAll: function(event) {
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
		},
		// Electron methods
		shelfMenu: function() {
			var menu = new Menu();
			menu.append(new MenuItem({label: 'Add Rack', click: () => {this.addRack()}}));
			menu.popup(remote.getCurrentWindow());
		},
		previewMenu: function() {
			var menu = new Menu();
			menu.append(new MenuItem({label: 'Toggle Preview', click: () => {this.togglePreview()}}));
			//menu.append(new MenuItem({label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => {} }));
			menu.popup(remote.getCurrentWindow());
		},
		importNotes: function() {
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
		moveSync: function() {
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
		openSync: function() {
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
		openCredits: function() {
			dialog.showMessageBox(remote.getCurrentWindow(), {
				type: "none",
				buttons: ['Ok'],
				title: "Credits",
				message: "PileMd was originally created by Hiroki KIYOHARA.\n"+
					"The full list of Authors is available on GitHub.\n\n"+
					"This Fork with updated components and additional features is maintained by MattNer0."
			});
		},
		/*update_scrollbar_notes: function() {
			this.scrollbarNotes.update();
		},*/
		update_editor_size: function() {
			var cells = document.querySelectorAll('.outer_wrapper .cell-container');
			var widthTotal = parseInt( cells[0].style.width.replace('px','') ) + parseInt( cells[1].style.width.replace('px','') ) + 10;
			if(this.isFullScreen){
				document.querySelector('.sidebar').style.left = "-"+widthTotal+'px';
				document.querySelector('.main-cell-container').style.transition = "margin-left 400ms";
				widthTotal = 0;
			} else {
				document.querySelector('.sidebar').style.left = "";
				setTimeout(function(){
					document.querySelector('.main-cell-container').style.transition = "";
				}, 400);
			}
			document.querySelector('.main-cell-container').style.marginLeft = widthTotal+'px';
			// (window.innerWidth-widthTotal)
		},
		menu_close: function() {
			var win = remote.getCurrentWindow();
			win.close();
		},
		menu_max: function() {
			var win = remote.getCurrentWindow();
			if(win.isMaximized()){
				win.unmaximize();
			} else {
				win.maximize();
			}
		},
		menu_min: function() {
			var win = remote.getCurrentWindow();
			win.minimize();
		}
	}
});