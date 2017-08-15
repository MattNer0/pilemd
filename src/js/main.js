var path = require('path');
var fs = require('fs');

var settings = require('./utils/settings');
settings.init();
settings.loadWindowSize();

//var Vue = require('vue');
import Vue from 'vue';

var ApplicationMenu = require('./applicationmenu').ApplicationMenu;
var models = require('./models');
var initialModels = require('./initialModels');
var preview = require('./preview');
var searcher = require('./searcher');

// Electron things
var remote = require('electron').remote;
var Menu = remote.Menu;
var MenuItem = remote.MenuItem;
var dialog = remote.dialog;

var arr = require('./utils/arr');

var eventHub = new Vue();
global.eventHub = eventHub;

// Vue.js plugins

import component_flashmessage from './components/flashmessage.vue';
import component_racks from './components/racks.vue';
import component_notes from './components/notes.vue';
import component_modal from './components/modal.vue';
import component_windowBar from './components/windowBar.vue';
import component_titleMenu from './components/titleMenu.vue';
import component_codemirrorMenu from './components/codemirrorMenu.vue';
import component_handlerStack from './components/handlerStack.vue';
import component_handlerNotes from './components/handlerNotes.vue';
import component_codeMirror from './components/codemirror.vue';

import vueScrollbar from 'vue2-scrollbar';
require('vue2-scrollbar/dist/style/vue2-scrollbar.css');

//require('./components/modal/modal')(Vue);
//require('./components/notes/notes')(Vue);
//require('./components/codemirror')(Vue, {imageURL: '', imageParamName: 'image'});
//require('./components/resizeHandler').handlerStack(Vue);
//require('./components/resizeHandler').handlerNotes(Vue);
//require('./components/menu/titleMenu')(Vue);
//require('./components/menu/codemirrorMenu')(Vue);

// Loading CSSs
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
		propertiesOpen: false,
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
		'windowBar': component_windowBar,
		'titleMenu': component_titleMenu,
		'codemirrorMenu': component_codemirrorMenu,
		'handlerStack': component_handlerStack,
		'handlerNotes': component_handlerNotes,
		'codemirror': component_codeMirror,
		'vueScrollbar': vueScrollbar
	},
	computed: {
		filteredNotes: function() {
			var self = this;
			if(this.search && this.selectedRackOrFolder){
				if (this.selectedRackOrFolder instanceof models.Rack) {
					this.selectedRackOrFolder.folders.forEach(function(folder){
						var newNotes = folder.readContents();
						if(newNotes) self.notes = self.notes.concat(newNotes);
					});
				}
			}
			return searcher.searchNotes(this.filterFolder, this.search, this.notes);
		},
		filterFolder: function() {
			if(this.selectedRackOrFolder instanceof models.Rack && this.selectedNote.data) {
				return this.selectedNote.data.folder;
			}
			return this.selectedRackOrFolder;
		}
	},
	created: function() {
		var notes = [];
		var folders = [];
		var racks = [];
		var initial_notes = [];

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

		// Save it not to remove
		//this.watcher = models.makeWatcher(this.racks, this.folders, this.notes);
	},
	mounted: function(){
		var self = this;
		this.$nextTick(function () {
			
			window.addEventListener('resize', (e) => {
				e.preventDefault();
				settings.saveWindowSize();
				self.update_editor_size();
			});

			var handlerStack = document.getElementById('handlerStack')
			if(handlerStack) handlerStack.previousElementSibling.style.width = this.racksWidth+"px";

			var handlerNotes = document.getElementById('handlerNotes')
			if(handlerNotes) handlerNotes.previousElementSibling.style.width = this.notesWidth+"px";

			setTimeout(function(){
				self.update_editor_size();
			}, 100);
		});

		eventHub.$on('togglePreview', self.togglePreviewCallBack);
	},
	methods: {
		init_scrollbar_racks: function() {
			this.$nextTick(function () {
				this.$refs.RacksScrollbar.scrollToY(0);
				this.$refs.RacksScrollbar.calculateSize();
			});
		},
		init_scrollbar_note: function() {
			this.$nextTick(function () {
				this.$refs.MainScrollbar.scrollToY(0);
				this.$refs.MainScrollbar.calculateSize();
			});
		},
		changeRackOrFolder: function(obj) {
			this.selectedRackOrFolder = obj;
			this.init_scrollbar_racks();
		},
		changeNote: function(obj) {
			this.selectedNote = obj;
		},
		openrack: function(rack) {
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
			this.init_scrollbar_racks();
		},
		closerack: function(rack) {
			rack.openFolders = false;
			this.init_scrollbar_racks();
		},
		folderDrag: function(obj) {
			var rack = obj.rack;
			rack.folders = rack.folders.sort(function(a, b) { return a.ordering - b.ordering });
		},
		toggleFullScreen: function() {
			this.isFullScreen = !this.isFullScreen;
			settings.set('vue_isFullScreen', this.isFullScreen);
			this.update_editor_size();
		},
		toggleProperties: function() {
			this.propertiesOpen = !this.propertiesOpen;
			this.update_editor_size();
		},
		togglePreview: function() {
			eventHub.$emit('togglePreview');
		},
		togglePreviewCallBack: function() {
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
			}
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
			var currFolder = this.getCurrentFolder();
			var newNote = models.Note.newEmptyNote(currFolder);
			if(newNote){
				if(currFolder.notes) currFolder.notes.unshift(newNote);
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
			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar .cell-container');
			var cellsRight = document.querySelectorAll('.outer_wrapper .sidebar-right .cell-container');
			//var widthTotalLeft = parseInt( cellsLeft[0].style.width.replace('px','') ) + 5;
			//var widthTotalRight = parseInt( cellsRight[0].style.width.replace('px','') );
			if (cellsLeft.length == 0 || cellsRight.length == 0) {
				return;
			}

			var widthTotalLeft = parseInt( cellsLeft[0].style.width.replace('px','') ) + parseInt( cellsLeft[1].style.width.replace('px','') ) + 10;
			var widthTotalRight = parseInt( cellsRight[0].style.width.replace('px','') ); //+ parseInt( cellsRight[1].style.width.replace('px','') ) + 10;

			if(this.isFullScreen){
				document.querySelector('.sidebar').style.left = "-"+widthTotalLeft+'px';
				widthTotalLeft = 0;
			} else {
				document.querySelector('.sidebar').style.left = "";
			}

			if(this.propertiesOpen && this.selectedNote.data) {
				document.querySelector('.sidebar-right').style.right = "0px";
			} else {
				document.querySelector('.sidebar-right').style.right = "-"+widthTotalRight+'px';
				widthTotalRight = 0;
			}

			document.querySelector('.main-cell-container').style.marginLeft = widthTotalLeft+'px';
			document.querySelector('.main-cell-container').style.marginRight = widthTotalRight+'px';
		},
		save_editor_size: function() {
			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar .cell-container');
			this.racksWidth = cellsLeft.length > 0 ? parseInt( cellsLeft[0].style.width.replace('px','') ) : 180;
			this.notesWidth = cellsLeft.length > 1 ? parseInt( cellsLeft[1].style.width.replace('px','') ) : 180;
			settings.set('racksWidth', this.racksWidth);
			settings.set('notesWidth', this.notesWidth);
		},
		editordrag: function() {
			this.update_editor_size();
		},
		editordragend: function() {
			this.update_editor_size();
			this.save_editor_size();
		}
	},
	watch: {
		isPreview: function() {
			if(this.selectedNote.data){
				this.preview = preview.render(this.selectedNote, this);
			}
			this.init_scrollbar_note();
		},
		fontsize: function() {
			settings.set('fontsize', this.fontsize);
		},
		selectedNote: function() {
			if(this.isPreview) {
				this.preview = preview.render(this.selectedNote, this);
			}
			this.selectedRackOrFolder = this.selectedNote.data.folder;
			this.$nextTick(function () {
				this.$refs.MainScrollbar.calculateSize();
				this.$refs.MainScrollbar.scrollToY(0);
			});
		},
		selectedRackOrFolder: function() {
			if (this.selectedRackOrFolder) {
				var newData = this.selectedRackOrFolder.readContents();

				if (this.selectedRackOrFolder instanceof models.Folder) {
					if(newData) {
						this.notes = this.notes.concat( newData );
						this.selectedRackOrFolder.notes = newData;
					}
					var filteredNotes = searcher.searchNotes(this.filterFolder, this.search, this.notes);
					filteredNotes.forEach(function(note){
						if(!note.body) note.loadBody();
					});
				} else {
					if(newData) this.folders = this.folders.concat( newData );
				}
				this.$nextTick(function () {
					this.$refs.NotesScrollbar.calculateSize();
					this.$refs.NotesScrollbar.scrollToY(0);
				});
			}
		}
	}
});
