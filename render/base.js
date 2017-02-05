var webpackConfig = require('../webpack/base')
var MemoryFS = require('memory-fs')
var serialize = require('serialize-javascript')
var mfs = new MemoryFS()
var vm = require('vm')
var Vue = require('vue')
var vueServerRenderer = require('vue-server-renderer')
var vueRenderer = vueServerRenderer.createRenderer()

module.exports = function (context, state) {
	var config = webpackConfig(context.mikser);
	let layoutSource = context.layout.source;
	config.entry = layoutSource;
	config.output = {
		path: path.dirname(layoutSource),
		filename: path.basename(layoutSource),
		libraryTarget: 'commonjs2'
	};
	let serverCompiler = webpack(config)
	serverCompiler.outputFileSystem = mfs;
	let sourceCode = new Promise((resolve, reject) => {
		serverCompiler.run((err, stats) => {
			if (err) return reject(err);
			let code = mfs.readFileSync(layoutSource, 'utf8');
			resolve({
				code: code,
				stats: stats.toJson()
			});
		});
	});

	return sourceCode.then((output) => {
		const vueConfig = vm.runInNewContext(source.code, {module});
		const dataMixin = {
			beforeCreate() {
				const data = typeof this.$options.data === 'function'
					? this.$options.data.call(this)
					: this.$options.data || {};
				this.$options.data = Object.assign(data, state);
			}
		};
		if (vueConfig.mixins) {
			vueConfig.mixins.push(dataMixin);
		} else {
			vueConfig.mixins = [dataMixin];
		}
		let vueInstance = new Vue(vueConfig);
		return new Promise((resolve, reject) => {
			vueRenderer.renderToString(vueInstance, (err, result) => {
				if (err) return reject(err);
				let init = `<script>window.__VUE_INITIAL_DATA__ = ${serialize(state, {isJSON: true})};</script>`;
				output.content = init + result;
				resolve(output);
			});
		});
	});
}
