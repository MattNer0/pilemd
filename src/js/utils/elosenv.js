const electron = require('electron');
const remote = electron.remote;

function homePath() {
	//return remote.process.env.HOME || remote.process.env.USERPROFILE || '/';
	return remote.app.getPath('home');
}

module.exports = {
	homePath: homePath
};
