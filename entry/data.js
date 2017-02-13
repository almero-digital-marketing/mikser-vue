'use strict';

if (typeof Object.assign !== 'function') {
	Object.assign = function (target) {
		if (target == null) {
			throw new TypeError('Cannot convert undefined or null to object');
		}

		target = Object(target);
		for (let index = 1; index < arguments.length; index++) {
			const source = arguments[index];
			if (source != null) {
				for (const key in source) {
					if (Object.prototype.hasOwnProperty.call(source, key)) {
						target[key] = source[key];
					}
				}
			}
		}
		return target;
	};
}

const dataMixin = {};
dataMixin.install = (Vue, options) => {
	Vue.mixin({
		beforeCreate() {
			if (this.$isServer) return;
			const initData = window.__VUE_INITIAL_DATA__ || {};
			const data = typeof this.$options.data === 'function'
			? this.$options.data.call(this)
			: this.$options.data || {};
			this.$options.data = Object.assign(data, initData);
		}
	});
};

module.exports = dataMixin;
