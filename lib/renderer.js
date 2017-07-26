var yaml = require('js-yaml');
var vm = require('vm');
var { createBundleRenderer } = require('vue-server-renderer');
var _ = require('lodash')
var traverse = require('traverse');
var serialize = require('serialize-javascript');

module.exports = function (context) {
	var debug = context.mikser.debug('vue')

	let vueContext = _.clone(context.layout.vue);
	vueContext.layout = context.layout;
	vueContext.url = context.entity.meta.href;
	vueContext.bundle = JSON.parse(vueContext.bundle);
	const entry = eval(vueContext.bundle.files[vueContext.bundle.entry]).App();
	if (entry.app.generate) entry.app.generate(context)


	const data = typeof entry.options.data === 'function'
		? entry.options.data.call(context)
		: entry.options.data || {};
	vueContext.initalData = data;
	vueContext.initalData.ptr = _.trimEnd(context.href('/'), '/');
	vueContext.initalData.options =  context.options;

	traverse(data).forEach(function (x) {
		let objectPath = this.path.slice();
		let objectCurrent = objectPath.pop();
		if (!objectCurrent) return;
		if (objectCurrent[0] == '$') {
			objectPath.push(objectCurrent.substr(1));
			let origin = _.get(context, objectPath.join('.'));
			origin = origin.apply(null, _.get(data, this.path.join('.')));
			_.set(vueContext.initalData, objectPath.join('.'), origin);
		} else {
			let path = this.path.join('.');
			let origin = _.get(context, path);
			if (origin == undefined) return;
			if (_.isArray(x)) {
				_.set(vueContext.initalData, path, origin);
			} else if (_.isObject(x)) {
				if (_.isEmpty(x)) {
					_.set(vueContext.initalData, path, origin);
				}
			} else {
				_.set(vueContext.initalData, path, origin);
			}
		}
	});
	return new Promise((resolve, reject) => {
		let bundleRenderer = createBundleRenderer(vueContext.bundle, {runInNewContext: false});
		bundleRenderer.renderToString(vueContext, (err, html) => {
			if (err) {
				console.log(err)
				return reject(err);
			}
			if (vueContext.state) {
				var init = `<script>window['VUE_INITIAL_STATE_${vueContext.app.toUpperCase()}'] = ${serialize(vueContext.state, {isJSON: true})};</script>`;
			} else {
				var init = `<script>window['VUE_INITIAL_DATA_${vueContext.app.toUpperCase()}'] = ${serialize(vueContext.initalData, {isJSON: true})};</script>`;
			}
			
			let app = `<script src="${vueContext.initalData.ptr + vueContext.client}" async></script>`;
			let content = init + html + app;
			resolve(content);
		});
	});
}
