const fs = require('fs');
const path = require('path');

const electron = require('electron');
const remote = electron.remote;

const elosenv = require('./elosenv');

var settings_data = {};
var settings_filename = 'pilemdConfig.json';
var settings_path;

module.exports = {
    init(filename) {
		if (filename) settings_filename = filename;
		settings_path = path.join(elosenv.userDataPath(), settings_filename);
		if (!fs.existsSync(settings_path)) {
			settings_path = path.join(elosenv.userDataPath(), settings_filename);
		}

		try {
			settings_data = JSON.parse(fs.readFileSync(settings_path));
		} catch (e) {
			settings_data = {};
		}
	},

	get(key) {
		return settings_data[key];
	},

	getSmart(key, default_value) {
		return typeof settings_data[key] == typeof default_value ? settings_data[key] : default_value;
	},

	set(key, value) {
		settings_data[key] = value;
		fs.writeFile(settings_path, JSON.stringify(settings_data), (err) => {
			if (err) console.log(err);
		});
	},

	loadWindowSize() {
		var win = remote.getCurrentWindow();
		if (settings_data['screen_maximized']) {
			win.maximize();
		} else if (settings_data['screen_width'] && settings_data['screen_height']) {
			win.setSize(settings_data['screen_width'] , settings_data['screen_height']);
		}
	},

	saveWindowSize() {
		var win = remote.getCurrentWindow();
		var current_size = win.getSize();

		if (win.isMaximized()) {
			settings_data['screen_maximized'] = true;
			settings_data['screen_width'] = current_size[0];
			settings_data['screen_height'] = current_size[1];
		} else {
			settings_data['screen_maximized'] = false;
			settings_data['screen_width'] = current_size[0];
			settings_data['screen_height'] = current_size[1];
		}

		fs.writeFile(settings_path, JSON.stringify(settings_data), (err) => {
			if (err) console.log(err);
		});
	}
};
