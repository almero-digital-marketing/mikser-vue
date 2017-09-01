'use strict'

var yaml = require('js-yaml');
var path = require('path');
var fs = require("fs-extra-promise");
var _ = require('lodash');
var Promise = require('bluebird');

var webpack = require('webpack');
var serverConfig = require('./build/webpack.server.config');
var clientConfig = require('./build/webpack.client.config');

var MemoryFS = require('memory-fs');
var mfs = new MemoryFS();

var renderer = require('./lib/renderer')

module.exports = function (mikser) {

	function compileServer(layout) {
		var config = serverConfig(mikser, layout)
		let serverCompiler = webpack(config)
		serverCompiler.outputFileSystem = mfs;
		return new Promise((resolve, reject) => {
			serverCompiler.run((err, stats) => {
				if (err) return reject(err);
				layout.vue.bundle = mfs.readFileSync(path.join(config.output.path, 'vue-ssr-server-bundle.json'), 'utf-8');
				stats = stats.toJson()
				stats.errors.forEach((err) => mikser.diagnostics.log('error', err))
				stats.warnings.forEach((err) => mikser.diagnostics.log('warning', err))
				layout.vue.modules = stats.modules
					.map((module) => path.resolve(path.join(mikser.options.workingFolder, module.name)))
					.filter((module) => _.startsWith(module, mikser.config.layoutsFolder) || _.startsWith(module, mikser.config.filesFolder) || _.startsWith(module, mikser.config.sharedFolder) || _.startsWith(module, mikser.config.pluginsFolder))
					.filter((module) => module != layout.source)
					resolve();
			});
		})
	}

	function compileClient(layout) {
		var config = clientConfig(mikser, layout)
		let appPattern = '**' + path.join(path.dirname(layout._id), config.output.filename);
		if (mikser.config.watcher.ignored.indexOf(appPattern) == -1) {
			mikser.config.watcher.ignored.push(appPattern);
			console.log(mikser.config.watcher.ignored)
		}
		let clientCompiler = webpack(config)
		return new Promise((resolve, reject) => {
			clientCompiler.run((err, stats) => {
				if (err) return reject(err);
				stats = stats.toJson()
				stats.errors.forEach((err) => mikser.diagnostics.log('error', err))
				stats.warnings.forEach((err) => mikser.diagnostics.log('warning', err))
				resolve();
			});
		});
	}

	function build(layout) {
		if (_.endsWith(layout.source, '.vue') && layout.meta.app){
			var debug = mikser.debug('vue');
			layout.vue = {};
			if (layout.meta.app === true) {
				layout.vue.app = path.basename(layout.source, '.vue');
			} else {
				layout.vue.app = layout.mata.app;
			}
			layout.vue.client = path.join(path.dirname(layout._id), layout.vue.app + '.js');
			return mikser.database.findDocuments({'meta.route': { $exists: true }})
				.then((routes) => {
					let exp = routes.map((entity, index) => {
						return 'import ROUTE_' + index + ' from "layouts' + entity.meta.route + '"';
					}).join("\n")
					exp += '\nexport default [' + routes.map((entity, index) => {
						let url = mikser.config.cleanUrls ? entity.url.replace('/index.html','') : entity.url;
						return '{path: "' + url + '", ' +
						'component: ROUTE_' + index + ', ' + 
						'meta:' + JSON.stringify(entity.meta) + '},'
					}).join("\n") + ']'
					return fs.writeFileAsync(path.join(mikser.config.runtimeFolder,'vue-routes.js'), exp);
				})
				.then(() => {
					return Promise.join(compileServer(layout),compileClient(layout))
						.then(() => mikser.tools.runtimeSync())
						.return(true);
				});
		}
		return Promise.resolve(false);
	}

	function reloadModules(file) {
		return mikser.database.findLayouts({"vue.modules": { $in: [file]}}).then((layouts) => {
			return Promise.map(layouts, (layout) => {
				return mikser.scheduler.scheduleLayout(layout._id);
			});
		});
	}

	mikser.on('mikser.scheduler.scheduleLayout', (layout) => {
		return build(layout).then((stats) => {
			if (stats) return mikser.database.layouts.save(layout);
		})
	});

	mikser.on('mikser.watcher.layoutAction', (event, file) => reloadModules(path.join(mikser.config.layoutsFolder,file)));
	mikser.on('mikser.watcher.fileAction', (event, file) => reloadModules(file));
	mikser.on('mikser.watcher.pluginsAction', (event, file) => reloadModules(path.join(mikser.config.pluginsFolder,file)));

	mikser.generator.engines.push({
		extensions: ['vue'],
		pattern: '**/*.vue', 
		render: function(context) {
			if (!context.layout || !context.layout.template) return context.content;
			return context.async(renderer(context))
		}
	})
	return {}
}