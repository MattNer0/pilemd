var _ = require('lodash');

module.exports = function(Vue, options) {
	Vue.filter('truncate', function(value, len) {
		if (value && value.length > len) {
			return value.slice(0, len) + '...';
		} else {
			return value;
		}
	});
};
