const electron = require('electron');
const fs = require('fs');
const path = require('path');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const Menu = electron.Menu;
const autoUpdater = electron.autoUpdater;
const dialog = electron.dialog;


// Report crashes to our server.
// electron.crashReporter.start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

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
app.on('window-all-closed', function() {
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

	// Create the browser window.
	var conf = {
		width: settings_data['screen_width'] || 1024,
		height: settings_data['screen_height'] || 768,
		minWidth: 270,
		minHeight: 437,
		center: true,
		title: 'PileMd',
		backgroundColor: '#3a3e4c',
		show: true,
		darkTheme: true,
		tabbingIdentifier: 'pilemd',
		/*titleBarStyle: 'hidden',
		frame: false,*/
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

	// Set ApplicationMenu bar
	mainWindow.setMenu(null);

	// and load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/index.html');

	// Open the DevTools.
	//mainWindow.webContents.openDevTools();

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

function applyUpdater() {
	var feedUrl = 'https://zwkuawed8b.execute-api.ap-northeast-1.amazonaws.com/prod?version=' + app.getVersion();

	autoUpdater.on('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) {

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
	makeWindow();
	//applyUpdater();
});

app.on('activate', function() {
	if(!mainWindow){
		makeWindow();
		//autoUpdater.checkForUpdates();
	}
});
