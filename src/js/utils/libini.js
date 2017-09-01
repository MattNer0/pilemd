const fs = require('fs');
const path = require('path');
const ini = require('ini');

var libIni = '.library.ini';

module.exports = {
	iniPath(library_path) {
		return path.join(library_path, libIni);
	},
	readIni(library_path) {
		if (fs.existsSync(this.iniPath(library_path))) {
			return ini.parse(fs.readFileSync(this.iniPath(library_path), 'utf-8'));
		} else {
			return {};
		}
	},
	readKey(library_path, key) {
		if (typeof key === 'string') {
			return this.readIni(library_path)[key];
		} else if (key.length == 2) {
			return this.readIni(library_path)[key[0]][key[1]];
		}
	},
	readKeyAsArray(library_path, key) {
		var keyvalue = this.readKey(library_path, key);
		var newArray = [];
		if (keyvalue) {
			var keys = Object.keys(keyvalue);
			for (var i = 0; i < keys.length; i++) {
				newArray.push({
					key: keys[i],
					value: keyvalue[keys[i]]
				});
			}
		}
		return newArray;
	},
	writeKey(library_path, key, value) {
		var config = this.readIni(library_path);
		if (typeof key === 'string') {
			if (value === undefined)
				delete config[key];
			else
				config[key] = value;
		} else if (key.length == 2) {
			if (!config[key[0]]) config[key[0]] = {};
			if (value === undefined)
				delete config[key[0]][key[1]];
			else
				config[key[0]][key[1]] = value;
		}
		fs.writeFileSync(this.iniPath(library_path), ini.stringify(config));
	},
	pushKey(library_path, key, value, maxlength) {
		var keyvalue = this.readKey(library_path, key);
		if (!keyvalue || typeof keyvalue === 'string') keyvalue = [];
		keyvalue.unshift(value);
		keyvalue = keyvalue.slice(0, maxlength);
		this.writeKey(library_path, key, keyvalue);
	},
	removeKey(library_path, key) {
		this.writeKey(library_path, key, undefined);
	}
};
