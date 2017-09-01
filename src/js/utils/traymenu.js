const electron = require('electron');
var Menu = electron.remote.Menu;

var mainWindow = null;
var appIcon = null;
var menu_array = [];

module.exports = {
	init() {
		mainWindow = electron.remote.getCurrentWindow();
		appIcon = electron.remote.getGlobal('appIcon');

		mainWindow.on('show', this.refreshTrayMenu);
		mainWindow.on('hide', this.refreshTrayMenu);
		this.refreshTrayMenu();
	},
	refreshTrayMenu() {
		var contextMenu = Menu.buildFromTemplate([{
			label: mainWindow.isVisible() ? 'Hide App' : 'Show App',
			click: function() {
				if (mainWindow.isVisible()) {
					mainWindow.hide();
				} else {
					mainWindow.show();
				}
			}
		}, { type: 'separator' }].concat(menu_array, [{ type: 'separator' }, {
			label: 'Quit', click: function() {
				electron.app.isQuiting = true;
				electron.app.quit();
			}
		}]));
		appIcon.setContextMenu(contextMenu);
	},
	setRacks(racks, rackfolder_cb, note_cb) {
		menu_array = [];
		for (var i = 0; i < racks.length; i++) {
			if (racks[i].data.separator) {
				menu_array.push({ type: 'separator' });
			} else {
				menu_array.push(this.oneRackMenuItem(racks[i], rackfolder_cb, note_cb));
			}
		}
		if (appIcon) this.refreshTrayMenu();
	},
	oneRackMenuItem(rack, rackfolder_cb, note_cb) {
		var self = this;
		var folder_array = [];
		if (rack.folders) {
			for (var i = 0; i < rack.folders.length; i++) {
				folder_array.push(this.oneFolderMenuItem(rack.folders[i], rackfolder_cb, note_cb));
			}
		}

		return {
			label: rack.name,
			submenu: folder_array.length > 0 ? folder_array : undefined,
			click: function(item, w, e) {
				if (rackfolder_cb) rackfolder_cb(rack);
			}
		};
	},
	oneFolderMenuItem(folder, rackfolder_cb, note_cb) {
		var self = this;
		var note_array = [];
		if (folder.notes) {
			for (var i = 0; i < folder.notes.length; i++) {
				if (folder.data.bookmarks) {
					note_array.push(this.oneBookmarkMenuItem(folder.notes[i]));
				} else {
					note_array.push(this.oneNoteMenuItem(folder.notes[i], note_cb));
				}
			}
		}

		return {
			label: folder.name,
			submenu: note_array.length > 0 ? note_array : undefined,
			click: function(item, w, e) {
				if (rackfolder_cb) rackfolder_cb(folder);
			}
		};
	},
	oneBookmarkMenuItem(bookmark) {
		return {
			label: bookmark.name,
			click: function(item, w, e) {
				electron.shell.openExternal(bookmark.body);
			}
		};
	},
	oneNoteMenuItem(note, note_cb) {
		return {
			label: note.title,
			click: function(item, w, e) {
				if (!mainWindow.isVisible()) mainWindow.show();
				if (note_cb) note_cb(note);
			}
		};
	}
};
