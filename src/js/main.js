import path from "path";
import fs from "fs";

import _ from "lodash";

import settings from "./utils/settings";
settings.init();
settings.loadWindowSize();

import libini from "./utils/libini";
import traymenu from "./utils/traymenu";

import Vue from 'vue';

import VTooltip from 'v-tooltip'
Vue.use(VTooltip);

import models from "./models";
import preview from "./preview";
import searcher from "./searcher";

// electron things
import { ipcRenderer, remote, clipboard, shell } from "electron";
const { Menu, MenuItem, dialog } = remote;

import arr from "./utils/arr";
import theme from "./utils/theme";
import elosenv from "./utils/elosenv";

// vue.js plugins
import component_outline from './components/outline.vue';
import component_codeMirror from './components/codemirror.vue';
import component_flashmessage from './components/flashmessage.vue';
import component_handlerNotes from './components/handlerNotes.vue';
import component_handlerStack from './components/handlerStack.vue';
import component_modal from './components/modal.vue';
import component_noteMenu from './components/noteMenu.vue';
import component_noteFooter from './components/noteFooter.vue';
import component_buckets from './components/buckets.vue';
import component_buckets_special from './components/bucketsSpecial.vue';
import component_folders from './components/folders.vue';
import component_folders_special from './components/foldersSpecial.vue';
import component_notes from './components/notes.vue';
import component_addNote from './components/addNote.vue';
import component_titleBar from './components/titleBar.vue';
import component_tabsBar from './components/tabsBar.vue';
import component_searchBar from './components/searchBar.vue';

// loading CSSs
import "../scss/pilemd.scss";

// not to accept image dropping and so on.
// electron will show local images without this.
document.addEventListener('dragover', (e) => {
	e.preventDefault();
});
document.addEventListener('drop', (e) => {
	e.preventDefault();
	e.stopPropagation();
});

theme.load("dark");

var settings_baseLibraryPath = settings.get('baseLibraryPath');
if (settings_baseLibraryPath) models.setBaseLibraryPath(settings_baseLibraryPath);

var appVue = new Vue({
	el: '#main-editor',
	template: require('../html/app.html'),
	data: {
		loadedEverything : false,
		loadedRack       : false,
		isFullScreen     : false,
		isPreview        : false,
		isToolbarEnabled : settings.getSmart('toolbarNote', true),
		isFullWidthNote  : settings.getSmart('fullWidthNote', true),
		keepHistory      : settings.getSmart('keepHistory', true),
		preview          : "",
		racks            : [],
		notes            : [],
		notesHistory     : [],
		selectedRack     : null,
		selectedFolder   : null,
		selectedNote     : null,
		showHistory      : false,
		showSearch       : false,
		showAll          : false,
		showFavorites    : false,
		noteTabs         : [],
		editingRack      : null,
		editingFolder    : null,
		originalNameRack : "",
		draggingRack     : null,
		draggingFolder   : null,
		draggingNote     : null,
		search           : '',
		loadingUid       : '',
		allDragHover     : false,
		messages         : [],
		noteHeadings     : [],
		modalShow        : false,
		modalTitle       : 'title',
		modalDescription : 'description',
		modalPrompts     : [],
		modalOkcb        : null,
		racksWidth       : settings.getSmart('racksWidth', 200),
		notesWidth       : settings.getSmart('notesWidth', 200),
		fontsize         : settings.getSmart('fontsize', 15),
		notesDisplayOrder: 'updatedAt',
	},
	components: {
		'flashmessage'  : component_flashmessage,
		'buckets'       : component_buckets,
		'folders'       : component_folders,
		'foldersSpecial': component_folders_special,
		'bucketsSpecial': component_buckets_special,
		'notes'         : component_notes,
		'modal'         : component_modal,
		'addNote'       : component_addNote,
		'titleBar'      : component_titleBar,
		'searchBar'     : component_searchBar,
		'noteMenu'      : component_noteMenu,
		'noteFooter'    : component_noteFooter,
		'handlerStack'  : component_handlerStack,
		'handlerNotes'  : component_handlerNotes,
		'codemirror'    : component_codeMirror,
		'outline'       : component_outline,
		'tabsBar'       : component_tabsBar
	},
	computed: {
		/**
		 * filters notes based on search terms
		 * @function filteredNotes
		 * @return  {Array}  notes array
		 */
		filteredNotes() {
			if (this.selectedFolder) {
				return searcher.searchNotes(this.search, this.selectedFolder.notes);
			} else if (this.selectedRack && this.showAll) {
				return searcher.searchNotes(this.search, this.selectedRack.allnotes);
			} else if (this.selectedRack && this.showFavorites) {
				return searcher.searchNotes(this.search, this.selectedRack.starrednotes);
			} else if (this.showHistory) {
				return this.notesHistory;
			} else {
				return [];
			}
		},
		searchRack() {
			if (this.search && this.racks.length > 0) {
				var meta_rack = {
					folders: []
				};

				this.racks.forEach((r) => {
					r.folders.forEach((f) => {
						if (f.searchnotes(this.search).length > 0) {
							meta_rack.folders.push(f);
						}
					});
				});

				return meta_rack;
			}

			return null;
		},
		/**
		 * check if the title attribute is defined to see
		 * if the 'selectedNote' is really a note object or just an empty object
		 * 
		 * @return    {Boolean}    True if note is selected
		 */
		isNoteSelected() {
			if (this.selectedNote instanceof models.Note) return true;
			return false;
		},
		/**
		 * check if the title attribute is defined to see
		 * if the 'selectedNote' is really a note object or just an empty object
		 * 
		 * @return    {Boolean}    True if note is selected
		 */
		isOutlineSelected() {
			if(this.selectedNote instanceof models.Outline) return true;
			return false;
		},
		mainCellClass() {
			var classes = [ 'font' + this.fontsize ];
			if (this.noteTabs.length > 1) classes.push('tabs-open');
			if (this.isFullWidthNote) classes.push('full-note');
			return classes;
		}
	},
	created() {
		this.$on('modal-show', (modalMessage) => {
			this.modalTitle = modalMessage.title;
			this.modalDescription = modalMessage.description;
			this.modalPrompts = modalMessage.prompts;
			this.modalOkcb = modalMessage.okcb;
			this.modalShow = true;
		});

		// hey, this is the first time.
		if (!models.getBaseLibraryPath()) {
			models.setLibraryToInitial();
		}

		if (models.doesLibraryExists()) {
			// library folder exists, let's read what's inside
			ipcRenderer.send('load-racks', { library: models.getBaseLibraryPath() });

		} else {
			elosenv.console.error("Couldn't open library directory. Path: " + models.getBaseLibraryPath());
			setTimeout(() => {
				this.$refs.dialog.init('Error', 'Couldn\'t open library directory.\nPath: '+models.getBaseLibraryPath(), [{
					label: 'Ok',
					cancel: true
				}]);
			}, 100);
		}
	},
	mounted() {
		var self = this;
		this.$nextTick(() => {
			window.addEventListener('resize', (e) => {
				e.preventDefault();
				self.update_editor_size();
			});
			window.addEventListener('keydown', (e) => {
				if (e.keyCode == "86" && e.shiftKey && e.ctrlKey && self.isPreview) {
					e.preventDefault();
					e.stopPropagation();
					self.togglePreview();
				}
			}, true);

			this.init_sidebar_width();
		});

		ipcRenderer.on('loaded-racks', (event, data) => {
			if (!data || !data.racks) return;

			var racks = [];
			data.racks.forEach((r) => {
				racks.push(new models.Rack(r));
			});

			this.racks = arr.sortBy(racks.slice(), 'ordering', true);

			this.racks.forEach((r, i) => {
				if (r.ordering != i+1) {
					r.ordering = i+1;
					r.saveOrdering();
				}
			});

			this.loadedRack = true;
		});

		ipcRenderer.on('loaded-folders', (event, data) => {
			if (!data) return;

			data.forEach((r) => {
				var rack = this.findRackByPath(r.rack);
				var folders = [];
				r.folders.forEach((f) => {
					f.rack = rack;
					folders.push(new models.Folder(f));
				});

				rack.folders = arr.sortBy(folders.slice(), 'ordering', true);
			});
		});

		function loadByParent(obj, rack, parent) {
			var folder;
			if (parent) {
				folder = parent.folders.filter((f) => {
					return f.path == obj.folder;
				})[0];
			} else if (rack) {
				folder = rack.folders.filter((f) => {
					return f.path == obj.folder;
				})[0];
			}

			var notes = [];
			obj.notes.forEach((n) => {
				n.rack = rack;
				n.folder = folder;
				switch(n._type) {
					case 'encrypted':
						notes.push(new models.EncryptedNote(n));
						break;
					case 'outline':
						notes.push(new models.Outline(n));
						break;
					default:
						notes.push(new models.Note(n));
						break;
				}
			});

			folder.notes = notes;
			self.notes = notes.concat(self.notes);

			if (obj.subnotes && obj.subnotes.length > 0) {
				obj.subnotes.forEach((r) => {	
					loadByParent(r, rack, folder);
				});
			}
		}

		ipcRenderer.on('loaded-notes', (event, data) => {
			if (!data) return;

			var rack;
			data.forEach((r) => {
				if (!rack || rack.path != r.rack) {
					rack = this.findRackByPath(r.rack);
				}
				loadByParent(r, rack);
			});
		});

		ipcRenderer.on('loaded-all-notes', (event, data) => {
			if (!data) return;

			elosenv.console.log("Loaded all notes in the library.");

			if (this.keepHistory && this.notes.length > 1) {
				this.notesHistory = arr.sortBy(this.notes.filter(function(obj) {
					return !obj.isEncrypted;
				}), 'updatedAt').slice(0,10);
			}

			if (this.notes.length == 1) {
				this.changeNote(this.notes[0]);

			} else if (remote.getGlobal('argv')) {
				var argv = remote.getGlobal('argv');
				if (argv.length > 1 && path.extname(argv[1]) == '.md' && fs.existsSync(argv[1])) {
					var openedNote = this.findNoteByPath(argv[1]);
					if (openedNote) {
						this.changeNote(openedNote);
					} else {
						elosenv.console.error("Path not valid");
					}
				}
			}

			traymenu.init();

			this.loadedEverything = true;
		});

		ipcRenderer.on('load-page-fail', (event, data) => {
			this.sendFlashMessage(5000, 'error', 'Load Failed');
			this.loadingUid = '';
		});

		ipcRenderer.on('load-page-finish', (event, data) => {
			this.loadingUid = '';
		});

		ipcRenderer.on('load-page-success', (event, data) => {
			switch (data.mode) {
				case 'note-from-url':
					if (data.markdown) {
						var new_note = this.addNote();
						new_note.body = data.markdown;
						this.sendFlashMessage(1000, 'info', 'New Note From Url');
					} else {
						this.sendFlashMessage(5000, 'error', 'Conversion Failed');
					}
					break;
				default:
					break;
			}
		});

		ipcRenderer.on('download-files-failed', (event, data) => {
			if (!data.replaced || data.replaced.length == 0) return;
			var noteObj = this.findNoteByPath(data.note);
			if (noteObj) {
				for (var i=0; i<data.replaced.length; i++) {
					var subStr = data.replaced[i];
					noteObj.body = noteObj.body.replace(subStr.new, subStr.original);
				}
			}
			this.sendFlashMessage(5000, 'error', data.error);
		});
	},
	methods: {
		findNoteByPath(notePath) {
			if (!notePath) return undefined;
			return this.notes.find((note) => {
				return note.data.path == notePath;
			});
		},
		findRackByPath(rackPath) {
			try {
				return this.racks.filter((rk) => {
					return rk.path == rackPath;
				})[0];
			} catch(e) {
				elosenv.console.warn("Couldn't find rack by path \""+rackPath+"\"");
				return null;
			}
		},
		findFolderByPath(rack, folderPath) {
			try {
				var folder = rack.folders.filter((f) => {
					return f.path == folderPath;
				})[0];
				if (folder) return folder;
				var rp = path.relative(rack.path, folderPath);
				rp = rp.split(path.sep);
				var parent = rack;
				for (var i = 0; i < rp.length; i++) {
					parent = parent.folders.filter((f) => {
						return f.path == path.join(parent.path, rp[i]);
					})[0];
				}
				return parent;
			} catch(e) {
				elosenv.console.warn("Couldn't find folder by path \""+folderPath+"\"");
				return null;
			}
		},
		/**
		 * initialize the width of the left sidebar elements.
		 * @function init_sidebar_width
		 * @return {Void} Function doesn't return anything
		 */
		init_sidebar_width() {
			this.racksWidth = Math.min(this.racksWidth, this.notesWidth);
			this.notesWidth = this.racksWidth;

			var handlerStack = document.getElementById('handlerStack');
			if (handlerStack) handlerStack.previousElementSibling.style.width = this.racksWidth + 'px';
			this.$refs.refHandleStack.checkWidth(this.racksWidth);

			var handlerNotes = document.getElementById('handlerNotes');
			if (handlerNotes) handlerNotes.previousElementSibling.style.width = this.notesWidth + 'px';
			this.$refs.refHandleNote.checkWidth(this.notesWidth);

			this.$nextTick(() => {
				this.update_editor_size();
			});
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
		openHistory() {
			if (this.showHistory) {
				this.toggleFullScreen();
			} else {
				this.changeRack(null);
				this.showSearch = false;
				this.showHistory = true;
				this.setFullScreen(false);
				this.update_editor_size();
			}
		},
		openSearch() {
			if (this.showSearch) {
				this.toggleFullScreen();
			} else {
				this.changeRack(null);
				this.showHistory = false;
				this.showSearch = true;
				this.setFullScreen(false);
				this.update_editor_size();

				this.$nextTick(() => {
					var searchInput = document.getElementById('search-bar');
					searchInput.focus();
				});
			}
		},
		changeRack(rack, from_sidebar) {
			var should_update_size = false;
			var same_rack = false;

			if (this.selectedRack === null && rack) should_update_size = true;
			else if (this.selectedFolder !== null && rack) should_update_size = true;

			if (this.selectedRack == rack && rack !== null) {
				same_rack = true;
				should_update_size = true;
			}
			
			if (this.selectedNote && this.selectedNote.rack == rack) {
				if (from_sidebar && rack instanceof models.Rack) {
					this.selectedRack = rack;
					this.showHistory = false;
					this.showSearch = false;
				}
				this.changeFolder(this.selectedNote.folder);
			} else if (rack === null || rack instanceof models.Rack) {
				this.selectedRack = rack;
				this.editingRack = null;
				this.editingFolder = null;
				this.originalNameRack = "";

				this.showHistory = false;
				this.showSearch = false;

				if (!same_rack) {
					this.selectedFolder = null;
					this.showAll = false;
					this.showFavorites = false;
				}
			} else {
				this.changeFolder(rack);
			}

			if (should_update_size) {
				this.update_editor_size();
			}

			if (same_rack) {
				this.$nextTick(() => {
					this.toggleFullScreen();
				});
			} else {
				this.setFullScreen(false);
			}
		},
		changeFolder(folder, weak) {
			if (weak && folder && (this.showAll || this.showFavorites) && this.selectedRack == folder.rack) return;
			if (this.selectedFolder === null && folder) this.update_editor_size();
			this.editingRack = null;
			this.editingFolder = null;
			this.originalNameRack = "";

			if (folder && !this.showSearch && !this.showHistory) this.selectedRack = folder.rack;
			if (!this.showHistory) this.selectedFolder = folder;
			this.showAll = false;
			this.showFavorites = false;
		},
		showAllRack(rack) {
			//this.changeRack(rack);

			this.selectedFolder = null;
			this.editingRack = null;
			this.editingFolder = null;
			this.originalNameRack = "";
			this.showHistory = false;
			this.showSearch = false;
			this.showAll = true;
			this.showFavorites = false;

			this.update_editor_size();
		},
		showFavoritesRack(rack) {
			//this.changeRack(rack);

			this.selectedFolder = null;
			this.editingRack = null;
			this.editingFolder = null;
			this.originalNameRack = "";
			this.showHistory = false;
			this.showSearch = false;
			this.showAll = false;
			this.showFavorites = true;

			this.update_editor_size();
		},
		/**
		 * event called when a note is selected.
		 * @param  {Object}  note  selected note
		 * @return {Void} Function doesn't return anything
		 */
		changeNote(note, newtab) {
			var self = this;

			if (this.isNoteSelected && this.selectedNote && this.selectedNote != note) {
				this.selectedNote.saveModel();
			}

			if (note === null) {
				this.selectedNote = null;
				return;
			} else if (note == this.selectedNote) {
				if (this.selectedRack === null && !this.showSearch) this.changeFolder(note.folder);
				else if (!this.isFullScreen) {
					this.setFullScreen(true);
					this.update_editor_size();
				}
				return;
			}

			if (note.folder && note.folder instanceof models.Folder) {
				note.folder.parent.openFolder = true;
				if (this.selectedFolder != note.folder) {
					this.changeFolder(note.folder, true);
				}
			}

			if (this.noteTabs.length > 1) {
				newtab = true;
			}

			if (this.noteTabs.length == 0) {
				this.noteTabs.push(note);
			} else if (this.noteTabs.indexOf(note) == -1) {
				if (newtab) {
					this.noteTabs.push(note);
				}

				if (!newtab && this.selectedNote) {
					var ci = this.noteTabs.indexOf(this.selectedNote);
					this.noteTabs.splice(ci, 1, note);
				}
			}

			if (note instanceof models.Outline) {
				this.selectedNote = note;
			} else {
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
				}
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
		 * @description removes the Rack (and its contents) from the current working directory.
		 * @param  {Object}  rack    The rack
		 * @return {Void} Function doesn't return anything
		 */
		removeRack(rack) {
			if (this.selectedRack === rack) this.selectedRack = null;
			rack.remove(this.notes);
			arr.remove(this.racks, (r) => {
				return r == rack;
			});
			// we need to close the current selected note if it was from the removed rack.
			if (this.isNoteSelected && this.selectedNote.rack == rack) {
				this.selectedNote = null;
			}
		},
		setEditingRack(rack) {
			if (rack) {
				this.editingRack = rack.uid;
				this.originalNameRack = rack.name;
			} else {
				this.editingRack = null;
				this.originalNameRack = "";
			}
		},
		setEditingFolder(folder) {
			if (folder) {
				this.editingFolder = folder.uid;
			} else {
				this.editingFolder = null;
			}
		},
		setDraggingRack(rack) {
			if (rack) {
				this.draggingRack = rack;
			} else {
				this.draggingRack = null;
			}
		},
		setDraggingFolder(folder) {
			if (folder) {
				this.draggingFolder = folder;
			} else {
				this.draggingFolder = null;
			}
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
			var folders = arr.sortBy(rack.folders.slice(), 'ordering', true);
			folders.unshift(folder);
			folders.forEach((f, i) => {
				f.ordering = i;
				f.saveModel();
			});
			rack.folders = folders;
		},
		/**
		 * deletes a folder and its contents from the parent rack.
		 * @function deleteFolder
		 * @param  {Object}  folder  The folder
		 * @return {Void} Function doesn't return anything
		 */
		deleteFolder(folder) {
			if (this.selectedFolder === folder) this.selectedFolder = null;
			arr.remove(folder.parent.folders, (f) => {
				return f == folder;
			});
			folder.remove(this.notes);
			// we need to close the current selected note if it was from the removed folder.
			if(this.isNoteSelected && this.selectedNote.folder == folder) {
				this.selectedNote = null;
			}
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
		},
		/**
		 * toggles left sidebar.
		 * 
		 * @return {Void} Function doesn't return anything
		 */
		toggleFullScreen() {
			this.setFullScreen(!this.isFullScreen);
		},
		setFullScreen(value) {
			this.isFullScreen = value;
			settings.set('vue_isFullScreen', this.isFullScreen);
			this.update_editor_size();
		},
		toggleToolbar() {
			this.isToolbarEnabled = !this.isToolbarEnabled;
			settings.set('toolbarNote', this.isToolbarEnabled);
		},
		toggleFullWidth() {
			this.isFullWidthNote = !this.isFullWidthNote;
			settings.set('fullWidthNote', this.isFullWidthNote);
		},
		/**
		 * @description toggles markdown note preview.
		 * @return {Void} Function doesn't return anything
		 */
		togglePreview() {
			this.isPreview = !this.isPreview;
			this.updatePreview();
		},
		calcSaveUid() {
			if (this.selectedRack) {
				var f = this.selectedRack.folders;
				if (!f || f.length == 0) {
					return null;
				}
				return f[0].uid;
			} else if (this.selectedFolder) {
				return this.selectedFolder.uid;
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
			if (this.selectedFolder) {
				return this.selectedFolder;
			} else if (this.selectedRack) {
				var f = this.selectedRack.folders;
				if (!f || f.length == 0) {
					return null;
				}
				return f[0];
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
			this.changeFolder(currFolder);
			var newNote = models.Note.newEmptyNote(currFolder);
			if (newNote) {
				if (this.search.length > 0) this.search = '';
				currFolder.notes.unshift(newNote);
				this.notes.unshift(newNote);
				this.isPreview = false;
				this.changeNote(newNote);
			} else {
				this.$refs.dialog.init('Error', 'You must select a Folder first!', [{ label: 'Ok' }]);
			}
			return newNote;
		},
		addOutline() {
			var currFolder = this.getCurrentFolder();
			this.changeNote(null);
			this.changeFolder(currFolder);
			var newOutline = models.Outline.newEmptyOutline(currFolder);
			if (newOutline) {
				if (this.search.length > 0) this.search = '';
				currFolder.notes.unshift(newOutline);
				this.notes.unshift(newOutline);
				this.isPreview = false;
				this.changeNote(newOutline);
			} else {
				this.$refs.dialog.init('Error', 'You must select a Folder first!', [{ label: 'Ok' }]);
			}
			return newOutline;
		},
		/**
		 * add new encrypted note to the current selected Folder
		 * 
		 * @return {Void} Function doesn't return anything
		 */
		addEncryptedNote() {
			var currFolder = this.getCurrentFolder();
			this.changeNote(null);
			this.changeFolder(currFolder);
			var newNote = models.EncryptedNote.newEmptyNote(currFolder);
			if (newNote) {
				if (this.search.length > 0) this.search = '';
				currFolder.notes.unshift(newNote);
				this.notes.unshift(newNote);
				this.isPreview = false;
				this.changeNote(newNote);
				newNote.saveModel();
			} else {
				this.$refs.dialog.init('Error', 'You must select a Folder first!', [{ label: 'Ok' }]);
			}
		},
		/*addNotes(noteTexts) {
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
		},*/
		/**
		 * @description save current selected Note.
		 * @return {Void} Function doesn't return anything
		 */
		saveNote: _.debounce(function () {
			var result;
			if (this.selectedNote) {
				result = this.selectedNote.saveModel();
			}
			if (result && result.error && result.path) {
				this.sendFlashMessage(5000, 'error', result.error);
			} else if(result && result.saved) {
				this.sendFlashMessage(1000, 'info', 'Note saved');
				if (this.selectedNote && this.notesDisplayOrder == 'updatedAt') {
					this.scrollUpScrollbarNotes();
				}
			}
		}, 500),
		addNoteFromUrl() {
			var self = this;
			this.$refs.dialog.init('Note', '', [{
				label: 'Cancel',
				cancel: true,
			}, {
				label: 'Ok',
				cb(data) {
					self.sendFlashMessage(1000, 'info', 'Loading page...');
					ipcRenderer.send('load-page', {
						url           : data.pageurl,
						mode          : 'note-from-url',
						webpreferences: 'images=no',
						style         : { height: '10000px' }
					});
				},
				/**
				 * @description validate the form input data
				 * @param   {Object}            data    Form data object
				 * @return  {(boolean|string)}          If false, the validation was succesful.
				 *                                      If a string value is returned it means that's the name of the field that failed validation.
				 */
				validate(data) {
					var expression = /[-a-zA-Z0-9@:%_+.~#?&=]{2,256}(\.[a-z]{2,4}|:\d+)\b(\/[-a-zA-Z0-9@:%_+.~#?&/=]*)?/gi;
					var regex = new RegExp(expression);
					if (data.pageurl.match(regex)) {
						return false;
					}
					// @todo gonna use this to highlight the wrong field in the dialog form
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
		 * @description displays an image with the popup dialog
		 * @param  {String}  url  The image url
		 * @return {Void} Function doesn't return anything
		 */
		openImg(url) {
			this.$refs.dialog.image(url);
		},
		contextOnPreviewLink(e, href) {
			if (e.stopPropagation) {
				e.stopPropagation();
			}
		
			var m = new Menu();
			m.append(new MenuItem({
				label: 'Copy Link',
				click: function() {
					clipboard.writeText(href);
				}
			}));
			m.append(new MenuItem({
				label: 'Open Link In Browser',
				click: () => {
					shell.openExternal(href)
				}
			}));
			m.popup(remote.getCurrentWindow());
		},
		/**
		 * displays context menu for the list of racks.
		 * @function backetsMenu
		 * @return {Void} Function doesn't return anything
		 */
		bucketsMenu() {
			var menu = new Menu();
			menu.append(new MenuItem({
				label: 'Add Bucket',
				click: () => {
					var backet = new models.Rack({
						name: "",
						ordering: 0
					});
					this.addRack(backet);
					this.setEditingRack(backet);
				}
			}));
			menu.popup(remote.getCurrentWindow());
		},
		foldersMenu() {
			if (this.selectedRack === null) return;

			var menu = new Menu();
			menu.append(new MenuItem({
				label: 'Add Folder',
				click: () => {
					var folder;
					folder = new models.Folder({
						name        : '',
						rack        : this.selectedRack,
						parentFolder: undefined,
						rackUid     : this.selectedRack.uid,
						ordering    : 0
					});
					this.addFolderToRack(this.selectedRack, folder);
					this.setEditingFolder(folder);
				}
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
		/*importNotes() {
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
		},*/
		moveSync() {
			var currentPath = models.getBaseLibraryPath();
			var newPaths = dialog.showOpenDialog(remote.getCurrentWindow(), {
				title: 'Select New Sync Folder',
				defaultPath: currentPath || '/',
				properties: ['openDirectory', 'createDirectory', 'promptToCreate']
			});
			if (!newPaths) {
				return;
			}
			var newPath = newPaths[0];

			// copy files
			if (models.copyData(currentPath, newPath)) {
				models.setBaseLibraryPath(newPath);
				settings.set('baseLibraryPath', newPath);
				remote.getCurrentWindow().reload();
			} else {
				this.sendFlashMessage(5000, 'error', 'Directory is not Valid');
			}
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
		 * shows the About dialog window.
		 * @function openAbout
		 * @return {Void} Function doesn't return anything
		 */
		openAbout() {
			var message = 'PileMd was originally created by Hiroki KIYOHARA.\n' +
				'The full list of Authors is available on GitHub.\n\n' +
				'This Fork with updated components and additional features is maintained by MattNer0.';

			this.$refs.dialog.init('About', message, [{
				label: 'Ok',
				cancel: true
			}]);
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
		 * saves the sidebar width (both racks and notes lists).
		 * @function save_editor_size
		 * @return {Void} Function doesn't return anything
		 */
		save_editor_size() {
			this.racksWidth = parseInt(this.$refs.sidebarFolders.style.width.replace('px','')) || 180;
			settings.set('racksWidth', this.racksWidth);
			this.notesWidth = parseInt(this.$refs.sidebarNotes.style.width.replace('px','')) || 180;
			settings.set('notesWidth', this.notesWidth);

			console.log(this.racksWidth, this.notesWidth);
		},
		sidebarDrag() {
			this.update_editor_size();
		},
		sidebarDragEnd() {
			this.update_editor_size();
			this.save_editor_size();
		},
		updatePreview(no_scroll) {
			if (this.isPreview && this.selectedNote) {
				this.preview = preview.render(this.selectedNote, this);
				this.noteHeadings = preview.getHeadings();
				if (no_scroll === undefined) this.scrollUpScrollbarNote();
			} else {
				this.noteHeadings = [];
				this.preview = '';
			}
		},
		closingWindow(quit) {
			settings.saveWindowSize();
			if (quit) {
				remote.app.quit();
			} else {
				var win = remote.getCurrentWindow();
				win.hide();
			}
		},
		/**
		 * calculates the sidebar width and
		 * changes the main container margins to accomodate it.
		 * If the application is in fullscreen mode (sidebar hidden)
		 * then the sidebar is moved outside of the visible workspace.
		 * @function update_editor_size
		 * @return {Void} Function doesn't return anything
		 */
		update_editor_size: _.debounce(function () {
			var widthTotalLeft = 0;
			var widthFixedLeft = 0;

			var cellsLeft = document.querySelectorAll('.outer_wrapper .sidebar > div');
			var cellsFixedLeft = document.querySelectorAll('.outer_wrapper .fixed-sidebar > div');

			for (var i = 0; i < cellsLeft.length; i++) {
				widthTotalLeft += cellsLeft[i].offsetWidth;
			}

			for (var i = 0; i < cellsFixedLeft.length; i++) {
				widthFixedLeft += cellsFixedLeft[i].offsetWidth;
			}

			if (this.isFullScreen) {
				document.querySelector('.sidebar').style.left = '-' + widthTotalLeft + 'px';
				widthTotalLeft = widthFixedLeft;
			} else {
				document.querySelector('.sidebar').style.left = '';
				widthTotalLeft += widthFixedLeft;
			}

			document.querySelector('.main-cell-container').style.marginLeft = widthTotalLeft + 'px';
		}, 100)
	},
	watch: {
		fontsize() {
			settings.set('fontsize', this.fontsize);
			if (this.selectedNote) {
				this.$nextTick(() => {
					this.$refs.refCodeMirror.refreshCM();
				});
			}
		},
		showSearch() {
			this.search = "";
		},
		keepHistory() {
			settings.set('keepHistory', this.keepHistory);
		},
		selectedNote() {
			if (this.selectedNote instanceof models.Note) {
				this.updatePreview();
			}
		},
		'selectedNote.body': function() {
			if (this.selectedNote instanceof models.Outline) return;
			this.saveNote();
		},
		selectedRack() {
			this.scrollUpScrollbarNotes();
		},
		selectedFolder() {
			this.scrollUpScrollbarNotes();
		}
	}
});
global.appVue = appVue;
