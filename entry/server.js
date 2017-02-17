var vm = require('vm');
var Vue = require('vue');
var vueServerRenderer = require('vue-server-renderer');
var vueRenderer = vueServerRenderer.createRenderer();
var _ = require('lodash')
var traverse = require('traverse');
var serialize = require('serialize-javascript');

module.exports = function (context) {
	var debug = context.mikser.debug('vue')

	const vueConfig = vm.runInNewContext(context.layout.code, {module});
	if (vueConfig.generate) vueConfig.generate(context)

	const data = typeof vueConfig.data === 'function'
		? vueConfig.data.call(context)
		: vueConfig.data || {};
	let initalData = {}
	traverse(data).forEach(function (x) {
		let objectPath = this.path.slice();
		let objectCurrent = objectPath.pop();
		if (!objectCurrent) return;
		if (objectCurrent[0] == '$') {
			objectPath.push(objectCurrent.substr(1));
			let origin = _.get(context, objectPath.join('.'));
			origin = origin.apply(null, _.get(data, this.path.join('.')));
			_.set(initalData, objectPath.join('.'), origin);
		} else {
			let path = this.path.join('.');
			let origin = _.get(context, path);
			if (origin == undefined) return;
			if (_.isArray(x)) {
				_.set(initalData, path, origin);
			} else if (_.isObject(x)) {
				if (_.isEmpty(x)) {
					_.set(initalData, path, origin);
				}
			} else {
				_.set(initalData, path, origin);
			}
		}
	});
	initalData.ptr = _.trimEnd(context.href('/'), '/')

	const dataMixin = {
		beforeCreate() {
			const data = typeof this.$options.data === 'function'
			? this.$options.data.call(this)
			: this.$options.data || {};
			this.$options.data = Object.assign(data, initalData);
		}
	};
	if (vueConfig.mixins) {
		vueConfig.mixins.push(dataMixin);
	} else {
		vueConfig.mixins = [dataMixin];
	}
	return new Promise((resolve, reject) => {
		let vueInstance = new Vue(vueConfig);
		vueRenderer.renderToString(vueInstance, (err, result) => {
			if (err) return reject(err);
			let init = `<script>window.__VUE_INITIAL_DATA__ = ${serialize(initalData, {isJSON: true})};</script>`;
			let content = init + result;
			resolve(content);
		})
	})
}
