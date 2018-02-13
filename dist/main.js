const electron = require('electron');
const fs = require('fs');
const path = require('path');
const { app, Tray, BrowserWindow, Menu, ipcMain, protocol } = electron;

const { download } = require('electron-dl');

var mainWindow = null;
var backgroundWindow = null;
var backgroundBrowserWindow = null;
var appIcon = null;

var DEBUG = false;

// support for portable mode
app.setPath(
	'userData',
	fs.existsSync(path.join(
		path.dirname(process.execPath),
		'.portable'
	)) == true ? path.join(path.dirname(process.execPath), 'userdata') : app.getPath("userData")
);

var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
	// someone tried to run a second instance, we should focus our window.
	if (mainWindow) {
		if (!mainWindow.isVisible()) {
			mainWindow.show();
		}
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	} else {
		if (!backgroundWindow) makeBackgroundWindow();
		makeMainWindow();
	}
});

if (shouldQuit) {
	app.quit();
}

/**
 * @function makeMainWindow
 * @return {Void} Function doesn't return anything
 */
function makeMainWindow() {
	var settings_path = path.join(electron.app.getPath('userData'), 'pilemdConfig.json');
	var settings_data = null;
	try {
		settings_data = JSON.parse(fs.readFileSync(settings_path));
	} catch (e) {
		settings_data = {};
	}

	var WINDOW_WIDTH = settings_data['screen_width'] || 1024;
	var WINDOW_HEIGHT = settings_data['screen_height'] || 768;
	var WINDOW_CENTER = true;
	var WINDOW_X;
	var WINDOW_Y;

	if (process.platform == 'linux') {
		let bounds = electron.screen.getPrimaryDisplay().bounds;
		WINDOW_X = bounds.x + ((bounds.width - WINDOW_WIDTH) / 2);
		WINDOW_Y = bounds.y + ((bounds.height - WINDOW_HEIGHT) / 2);
		WINDOW_CENTER = false;
	}

	// create the browser window.
	var conf = {
		width            : WINDOW_WIDTH,
		height           : WINDOW_HEIGHT,
		x                : WINDOW_X,
		y                : WINDOW_Y,
		minWidth         : 400,
		minHeight        : 400,
		center           : WINDOW_CENTER,
		title            : 'PileMd',
		backgroundColor  : '#36393e',
		show             : false,
		darkTheme        : true,
		tabbingIdentifier: 'pilemd',
		frame            : false,
		webPreferences   : {
			devTools            : DEBUG,
			webgl               : false,
			webaudio            : false,
			backgroundThrottling: true
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
		label: 'Show App',
		click() {
			mainWindow.show();
		}
	},{
		label: 'Quit',
		click() {
			app.isQuiting = true;
			app.quit();
		}
	}]);
	appIcon.setToolTip(conf.title);
	appIcon.setContextMenu(contextMenu);
	appIcon.setHighlightMode('always');
	appIcon.on('click', function() {
		if (mainWindow.isVisible()) {
			mainWindow.hide();
		} else {
			mainWindow.show();
		}
	});

	global.appIcon = appIcon;
	global.isLinux = process.platform == 'linux';
	global.argv = process.argv;

	// open the DevTools.
	if (DEBUG) mainWindow.webContents.openDevTools();

	mainWindow.webContents.on('will-navigate', (e, url) => {
		e.preventDefault();
		electron.shell.openExternal(url);
	});

	// emitted when the window is closed.
	mainWindow.on('closed', () => {
		// dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});
}

/**
 * @function makeBackgroundWindow
 * @return {Void} Function doesn't return anything
 */
function makeBackgroundWindow(callback) {
	backgroundWindow = new BrowserWindow({
		width         : 960,
		height        : 960,
		show          : DEBUG,
		skipTaskbar   : true,
		webPreferences: {
			devTools            : false,
			webgl               : false,
			webaudio            : false,
			backgroundThrottling: true
		}
	});

	backgroundWindow.on('closed', () => {
		backgroundWindow = null;
	});

	backgroundWindow.setMenu(null);
	backgroundWindow.loadURL('file://' + __dirname + '/background.html');

	if (callback) {
		backgroundWindow.once('ready-to-show', callback);
	}
}

/**
 * @function makeBackgroundBrowserWindow
 * @return {Void} Function doesn't return anything
 */
function makeBackgroundBrowserWindow(callback) {
	backgroundBrowserWindow = new BrowserWindow({
		width         : 960,
		height        : 960,
		show          : false,
		skipTaskbar   : true,
		webPreferences: {
			devTools            : false,
			webgl               : false,
			webaudio            : false,
			backgroundThrottling: true
		}
	});

	backgroundBrowserWindow.on('closed', () => {
		backgroundBrowserWindow = null;
	});

	backgroundBrowserWindow.setMenu(null);
	backgroundBrowserWindow.loadURL('file://' + __dirname + '/bbrowser.html');

	if (callback) {
		backgroundBrowserWindow.once('ready-to-show', callback);
	}
}

var DARWIN_ALL_CLOSED_MENU;
function init() {
	var APP_NAME = app.getName();
	DARWIN_ALL_CLOSED_MENU = [{
		label: APP_NAME,
		submenu: [
			{
				label: 'About ' + APP_NAME,
				role : 'about'
			},
			{ type: 'separator' },
			{
				label  : 'Services',
				role   : 'services',
				submenu: []
			},
			{ type: 'separator' },
			{
				label      : 'Hide ' + APP_NAME,
				accelerator: 'Command+H',
				role       : 'hide'
			}, {
				label      : 'Hide Others',
				accelerator: 'Command+Shift+H',
				role       : 'hideothers'
			}, {
				label: 'Show All',
				role : 'unhide'
			},
			{ type: 'separator' },
			{
				label      : 'Quit ' + APP_NAME,
				accelerator: 'Command+Q',
				click      : () => { app.quit(); }
			}
		]
	}, {
		label: 'File',
		submenu: [{
			label: 'New ' + APP_NAME + ' Window',
			click: () => {
				if (!backgroundWindow) makeBackgroundWindow();
				makeMainWindow();
			}
		}]
	}];

	protocol.registerFileProtocol('pilemd', (request, callback) => {
		const url = request.url.substr(9);
		callback({ path: path.normalize(decodeURI(url)) });
	}, (err) => {
		if (err) console.error('Failed to register protocol');
	});

	makeBackgroundWindow();
	makeMainWindow();

	ipcMain.on('download-btn', (e, args) => {
		download(BrowserWindow.getFocusedWindow(), args.url, args.options).then((dl) => {
			console.log('Saved to '+ dl.getSavePath());
		}).catch(console.error);
	});
	
	// relay events to background task
	ipcMain.on('download-files', (event, payload) => backgroundWindow.webContents.send('download-files', payload));
	ipcMain.on('load-racks', (event, payload) => backgroundWindow.webContents.send('load-racks', payload));
	ipcMain.on('load-page', (event, payload) => {
		if (backgroundBrowserWindow) {
			backgroundBrowserWindow.webContents.send('load-page', payload);
		} else {
			makeBackgroundBrowserWindow(() => {
				backgroundBrowserWindow.webContents.send('load-page', payload);
			});
		}
	});
	
	ipcMain.on('kill-bbrowser', (event, payload) => {
		if (backgroundBrowserWindow) backgroundBrowserWindow.close();
	});
	
	
	// relay events to main task
	ipcMain.on('loaded-racks', (event, payload) => mainWindow.webContents.send('loaded-racks', payload));
	ipcMain.on('loaded-folders', (event, payload) => mainWindow.webContents.send('loaded-folders', payload));
	ipcMain.on('loaded-notes', (event, payload) => mainWindow.webContents.send('loaded-notes', payload));
	ipcMain.on('loaded-all-notes', (event, payload) => mainWindow.webContents.send('loaded-all-notes', payload));
	
	ipcMain.on('load-page-fail', (event, payload) => mainWindow.webContents.send('load-page-fail', payload));
	ipcMain.on('load-page-success', (event, payload) => mainWindow.webContents.send('load-page-success', payload));
	ipcMain.on('load-page-favicon', (event, payload) => mainWindow.webContents.send('load-page-favicon', payload));
	ipcMain.on('load-page-finish', (event, payload) => mainWindow.webContents.send('load-page-finish', payload));

	ipcMain.on('download-files-failed', (event, payload) => mainWindow.webContents.send('download-files-failed', payload));
	
	
	ipcMain.on('console', (event, payload) => {
		console.log(payload);
	});
}

// this method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', init);

app.on('activate', () => {
	if (!backgroundWindow) makeBackgroundWindow();
	if (!mainWindow) {
		makeMainWindow();
	} else {
		mainWindow.show();
	}
});

app.on('window-all-closed', () => {
	if (process.platform == 'darwin') {
		// on OS X it is common for applications and their menu bar
		// to stay active until the user quits explicitly with Cmd + Q
		Menu.setApplicationMenu(Menu.buildFromTemplate(DARWIN_ALL_CLOSED_MENU));
	} else {
		// quit when all windows are closed.
		app.quit();
	}
});