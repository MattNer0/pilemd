var fs = require('fs');
var path = require('path');
var url = require('url');
var http = require('http');

module.exports = {
	getFileDataFromUrl(file_url) {
		var path_url = url.parse(file_url).pathname;
		return {
			basename: path.basename(path_url),
			extname: path.extname(path_url)
		};
	},
	downloadMultipleFiles(array_urls, target_folder) {
		array_urls.forEach((url) => {
			this.downloadFile(url, target_folder);
		});
	},
	downloadFile(source_url, target_folder, filename) {
		if (!filename) filename = this.getFileDataFromUrl(source_url).basename;
		if (!target_folder || !filename) return;

		var file = path.join(target_folder, filename);
		http.get(source_url, function(res) {
			var imagedata = '';
			res.setEncoding('binary');
			res.on('data', function(chunk) {
				imagedata += chunk;
			});
			res.on('end', function() {
				fs.writeFile(file, imagedata, 'binary', function(err) {
					if (err) throw err;
					console.log('Downloaded', filename, 'to', target_folder);
				});
			});
		});
	}
};
