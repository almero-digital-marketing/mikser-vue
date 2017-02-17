'use strict'

var path = require('path')
var fs = require("fs-extra-promise")
var _ = require('lodash')
var Promise = require('bluebird');
var webpack = require('webpack');

var webpackConfig = require('./webpack.config');
var MemoryFS = require('memory-fs');
var mfs = new MemoryFS();

var ssr = require('./entry/server')
var csr = path.join(__dirname, '/entry/client.js')

var Vue = require('vue');

module.exports = function (mikser) {
	function build(layout) {
		if (_.endsWith(layout.source, '.vue') && layout.meta.app){
			var debug = mikser.debug('vue');
			var ssrConfig = webpackConfig(mikser)
			ssrConfig.entry = layout.source;
			ssrConfig.target = 'node';
			ssrConfig.profile = true;
			ssrConfig.output = {
				path: path.dirname(layout.source),
				filename: path.basename(layout.source),
				libraryTarget: 'commonjs2'
			};
			let serverCompiler = webpack(ssrConfig)
			serverCompiler.outputFileSystem = mfs;
			return new Promise((resolve, reject) => {
				serverCompiler.run((err, stats) => {
					if (err) return reject(err);
					let code = mfs.readFileSync(layout.source, 'utf8');
					layout.code = code;
					stats = stats.toJson()
					stats.errors.forEach((err) => mikser.diagnostics.log('error', err))
					stats.warnings.forEach((err) => mikser.diagnostics.log('warning', err))
					layout.modules = stats.modules
						.map((module) => path.resolve(path.join(mikser.options.workingFolder, module.name)))
						.filter((module) => _.startsWith(module, mikser.config.layoutsFolder) || _.startsWith(module, mikser.config.filesFolder) || _.startsWith(module, mikser.config.sharedFolder) || _.startsWith(module, mikser.config.pluginsFolder))
						.filter((module) => module != layout.source)
						resolve();
				});
			}).then(() => {
				var csrConfig = webpackConfig(mikser)
				csrConfig.entry = csr;
				csrConfig.resolve.alias.app = layout.source;
				if (!mikser.options.debug) {
					csrConfig.plugins.push(new webpack.DefinePlugin({ 'process.env': { NODE_ENV: '"production"' } }));
				}
				if (layout.meta.app === true) {
					layout.meta.app = path.join(path.dirname(layout._id), path.basename(layout.source, '.vue') + '.js');
					csrConfig.output = {
						path: path.join(mikser.config.runtimeFilesFolder, path.dirname(layout._id)),
						filename: path.basename(layout.source, '.vue') + '.js',
					}
				} else if (_.isString(layout.meta.app)) {
					csrConfig.output = {
						path: path.join(mikser.config.runtimeFilesFolder, path.dirname(layout.meta.app)),
						filename: path.basename(layout.meta.app),
					}
				}
				let appPattern = '**' + layout.meta.app;
				if (mikser.config.watcher.ignored.indexOf(appPattern) == -1) {
					mikser.config.watcher.ignored.push(appPattern);
				}
				let clientCompiler = webpack(csrConfig)
				return new Promise((resolve, reject) => {
					clientCompiler.run((err, stats) => {
						if (err) return reject(err);
						stats = stats.toJson()
						stats.errors.forEach((err) => mikser.diagnostics.log('error', err))
						stats.warnings.forEach((err) => mikser.diagnostics.log('warning', err))
						resolve();
					});
				});
			})
			.then(() => mikser.tools.runtimeSync())
			.return(true);
		}
		return Promise.resolve(false);
	}

	function reloadModules(file) {
		return mikser.database.findLayouts({modules: { $in: [file]}}).then((layouts) => {
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
	mikser.on('mikser.manager.importLayout', build);

	mikser.on('mikser.watcher.layoutAction', (event, file) => reloadModules(path.join(mikser.config.layoutsFolder,file)));
	mikser.on('mikser.watcher.fileAction', (event, file) => reloadModules(file));
	mikser.on('mikser.watcher.pluginsAction', (event, file) => reloadModules(path.join(mikser.config.pluginsFolder,file)));

	mikser.generator.engines.push({
		extensions: ['vue'],
		pattern: '**/*.vue', 
		render: function(context) {
			if (!context.layout || !context.layout.template) return context.content;
			return context.async(ssr(context))
		}
	})
}