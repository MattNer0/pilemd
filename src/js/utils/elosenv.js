const electron = require('electron');
const remote = electron.remote;
const path = require('path');

module.exports = {
	homePath() {
		return remote.app.getPath('home');
	},
	appDataPath() {
		return remote.app.getPath('appData');
	},
	tempPath() {
		return remote.app.getPath('temp');
	},
	workingDirectory() {
		var exe = remote.app.getPath('exe');
		return path.dirname(exe);
	}
};
