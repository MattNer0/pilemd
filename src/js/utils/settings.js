const fs = require('fs');
const path = require('path');

const electron = require('electron');
const remote = electron.remote;

var settings_data = {};
var settings_filename = "pilemdConfig.json";
var settings_path;

module.exports = {
	init(filename) {
		if(filename) settings_filename = filename;
		settings_path = path.join( remote.app.getPath('appData'), settings_filename);
		try{
			settings_data = JSON.parse(fs.readFileSync( settings_path ));
		} catch(e){
			settings_data = {};
		}
	},

	get(key) {
		return settings_data[key];
	},

	set(key, value) {
		settings_data[key] = value;
		fs.writeFile(settings_path, JSON.stringify(settings_data), (err) => {
			console.log(err);
		});
	},
};