'use strict'

var path = require('path');
var webpack = require('webpack');
var MemoryFS = require('memory-fs');
var mfs = new MemoryFS();
var serialize = require('serialize-javascript');
var vm = require('vm');
var cluster = require('cluster');
var fs = require("fs-extra-promise");
var _ = require('lodash');
var traverse = require('traverse');
var mask = require('json-mask')

var Vue = require('vue');
var vueServerRenderer = require('vue-server-renderer');
var vueRenderer = vueServerRenderer.createRenderer();

module.exports = function (mikser) {

	var config = {
		webpack: {
			target: 'node',
			module: {
				rules: [{
					test: mikser.config.layoutsFolder,
					loader: 'front-matter-loader?onlyBody'
				},{
					test: /\.vue$/,
					loader: 'vue-loader',
					options: {
						loaders: {
							js: 'babel-loader',
							scss: 'css-loader'
						}
					}
				},{
					test: /\.js$/,
					loader: 'babel-loader',
					exclude: /node_modules/,
					query: {
						presets: ['es2015', 'stage-2']
					},
				}]
			},
		}
	}

	config = _.defaultsDeep(mikser.options.vue || {}, mikser.config.vue || {}, config);

	var cache = {}
	var plugin = {
		invalidateCache: function() {
			cache = {};
		}
	}
	if (cluster.isMaster) {
		var invalidateCache = (entity) => {
			if (path.extname(entity._id) == '.vue') {
				mikser.broker.broadcast('mikser.plugins.vue.invalidateCache');
			}
		}
		mikser.on('mikser.manager.importLayout', invalidateCache);
		mikser.on('mikser.manager.importView', invalidateCache);
		mikser.on('mikser.manager.deleteLayout', invalidateCache);
		mikser.on('mikser.manager.deleteView', invalidateCache);
	}
	mikser.generator.engines.push({
		extensions: ['vue'],
		pattern: '**/*.vue', 
		render: function(context) {
			if (context.layout && context.layout.template) {
				let layoutName = context.layout.source;
				if (!context.layout.meta.externalMeta) {
					layoutName = 'layout';
				}
				let cached = cache[context.layout._id];
				let renderer; 
				if (cached && cached.importDate.getTime() == context.layout.importDate.getTime()) {
					renderer = cached.renderer;
				} else {
					let cached = cache[context.layout._id];
					let layoutId = context.layout._id;
					let layoutSource = context.layout.source;
					let layoutImportDate = context.layout.importDate;
					let sourceCode;
					if (cached && cached.importDate.getTime() == layoutImportDate.getTime()) {
						sourceCode = cached.sourceCode;
					} else {
						config.webpack.entry = layoutSource;
						config.webpack.output = {
							path: path.dirname(layoutSource),
							filename: path.basename(layoutSource),
							libraryTarget: 'commonjs2'
						};
						let serverCompiler = webpack(config.webpack);
						serverCompiler.outputFileSystem = mfs;
						sourceCode = new Promise((resolve, reject) => {
							serverCompiler.run((err, statsObject) => {
								if (err) return reject(err);
								let stats = statsObject.toJson();
								let compiledSource = mfs.readFileSync(layoutSource, 'utf8');
								resolve(compiledSource);
							});
						});
						cache[layoutId] = {
							importDate: layoutImportDate,
							sourceCode: sourceCode
						}
					}

					let initData = {
						entity: _.cloneDeep(context.entity),
						layout: _.cloneDeep(context.layout),
						data: _.cloneDeep(context.data),
						content: context.content
					}
					delete initData.layout.content
					delete initData.entity.guide

					if (context.layout.meta.mask) {
						initData = mask(initData, context.layout.meta.mask)
					}

					traverse(initData).forEach(function (value) {
						if (_.isString(value)) {
							this.update(value.replace(mikser.options.workingFolder,''));
						}
					});

					return context.async(sourceCode.then((code) => {
						const vueConfig = vm.runInNewContext(code, {module});
						const dataMixin = {
							beforeCreate() {
								const data = typeof this.$options.data === 'function'
									? this.$options.data.call(this)
									: this.$options.data || {};
								this.$options.data = Object.assign(data, initData);
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
								let init = `<script>window.__VUE_INITIAL_DATA__ = ${serialize(initData, {isJSON: true})};</script>`;
								resolve(init + result);
							});
						});
					}));
				}
			}
			return context.content;
		}
	});
	return Promise.resolve(plugin);

}