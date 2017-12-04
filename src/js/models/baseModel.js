const uid = require('../utils/uid');

class Model {
	constructor(data) {
		this.uid = data.uid || uid.timeUID();
	}

	get data() {
		return { uid: this.uid };
	}

	update(data) {
		this.uid = data.uid;
	}

	static setModel(model) {
		model.saveModel();
	}

	static removeModelFromStorage(model) {
		model.remove();
	}

	static generateNewUID() {
		return uid.timeUID();
	}
}

module.exports = Model;
