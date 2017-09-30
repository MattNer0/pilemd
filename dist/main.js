const electron = require('electron');
const fs = require('fs');
const path = require('path');
const {app, Tray, BrowserWindow, Menu, autoUpdater, dialog, ipcMain} = electron;

const {download} = require('electron-dl');

var mainWindow = null;
var appIcon = null;

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
	// Someone tried to run a second instance, we should focus our window.
	if (mainWindow) {
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	}
});

if (shouldQuit) {
	app.quit();
	return;
}

const APP_NAME = app.getName();
const DARWIN_ALL_CLOSED_MENU = [
	{
		label: APP_NAME,
		submenu: [
			{
				label: 'About ' + APP_NAME,
				role: 'about'
			},
			{
				type: 'separator'
			},
			{
				label: 'Services',
				role: 'services',
				submenu: []
			},
			{
				type: 'separator'
			},
			{
				label: 'Hide ' + APP_NAME,
				accelerator: 'Command+H',
				role: 'hide'
			},
			{
				label: 'Hide Others',
				accelerator: 'Command+Shift+H',
				role: 'hideothers'
			},
			{
				label: 'Show All',
				role: 'unhide'
			},

			{
				type: 'separator'
			},
			{
				label: 'Quit ' + APP_NAME,
				accelerator: 'Command+Q',
				click: function() {
					app.quit();
				}
			}
		]
	},
	{
		label: 'File',
		submenu: [
			{
				label: 'New ' + APP_NAME + ' Window',
				click: makeWindow
			}
		]
	}
];
// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform != 'darwin') {
		app.quit();
	} else {
		Menu.setApplicationMenu(Menu.buildFromTemplate(DARWIN_ALL_CLOSED_MENU));
	}
});

function makeWindow() {

	var settings_path = path.join(electron.app.getPath('appData'), 'pilemdConfig.json');
	var settings_data = null;
	try {
		settings_data = JSON.parse(fs.readFileSync(settings_path));
	} catch (e) {
		settings_data = {};
	}

	var WINDOW_WIDTH = settings_data['screen_width'] || 1024;
	var WINDOW_HEIGHT = settings_data['screen_height'] || 768;
	var WINDOW_CENTER = true;
	var WINDOW_X = undefined;
	var WINDOW_Y = undefined;

	if (process.platform == 'linux') {
		let bounds = electron.screen.getPrimaryDisplay().bounds;
		WINDOW_X = bounds.x + ((bounds.width - WINDOW_WIDTH) / 2);
		WINDOW_Y = bounds.y + ((bounds.height - WINDOW_HEIGHT) / 2);
		WINDOW_CENTER = false;
	}

	// Create the browser window.
	var conf = {
		width: WINDOW_WIDTH,
		height: WINDOW_HEIGHT,
		x: WINDOW_X,
		y: WINDOW_Y,
		minWidth: 270,
		minHeight: 437,
		center: WINDOW_CENTER,
		title: 'PileMd',
		backgroundColor: '#36393e',
		show: false,
		darkTheme: true,
		tabbingIdentifier: 'pilemd',
		titleBarStyle: 'hidden',
		frame: false,
		webPreferences: {
			devTools: true,
			webgl: false,
			webaudio: false
		}
	};

	if (process.platform == 'linux') {
		conf['icon'] = __dirname + '/icon.png';
	}

	mainWindow = new BrowserWindow(conf);
	mainWindow.setMenu(null);
	mainWindow.loadURL('file://' + __dirname + '/index.html');
	mainWindow.setContentProtection(true);

	appIcon = new Tray(__dirname + '/icon.png');
	var contextMenu = Menu.buildFromTemplate([{
		label: 'Show App', click: function() {
			mainWindow.show();
		}
	},{
		label: 'Quit', click: function() {
			app.isQuiting = true;
			app.quit();
		}
	}]);
	appIcon.setToolTip(conf.title);
	appIcon.setContextMenu(contextMenu);
	appIcon.setHighlightMode('always');
	appIcon.on('click', function(e) {
		if (mainWindow.isVisible()) {
			mainWindow.hide();
		} else {
			mainWindow.show();
		}
	});

	global.appIcon = appIcon;
	global.isLinux = process.platform == 'linux';
	global.argv = process.argv;

	// Open the DevTools.
	//mainWindow.webContents.openDevTools();

	mainWindow.webContents.on('will-navigate', (e, url) => {
		e.preventDefault();
		electron.shell.openExternal(url);
	});

	// Emitted when the window is closed.
	mainWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});
}

ipcMain.on('download-btn', (e, args) => {
	download(BrowserWindow.getFocusedWindow(), args.url, args.options).then((dl) => {
		console.log('Saved to '+ dl.getSavePath());
	}).catch(console.error);
});

/*
function applyUpdater() {
	var feedUrl = 'https://zwkuawed8b.execute-api.ap-northeast-1.amazonaws.com/prod?version=' + app.getVersion();

	autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) => {

		var index = dialog.showMessageBox(mainWindow, {
			type: 'info',
			buttons: ['Restart', 'Later'],
			title: "PileMd",
			message: 'The new version has been downloaded. Please restart the application to apply the updates.',
			detail: releaseName + "\n\n" + releaseNotes
		});

		if (index === 1) {
			return;
		}

		quitAndUpdate();
	});
	autoUpdater.on("error", (error) => {});
	autoUpdater.setFeedURL(feedUrl);
	autoUpdater.checkForUpdates();
}
*/

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
	makeWindow();
	//applyUpdater();
});

app.on('activate', () => {
	if(!mainWindow){
		makeWindow();
		//autoUpdater.checkForUpdates();
	} else {
		mainWindow.show();
	}
});
