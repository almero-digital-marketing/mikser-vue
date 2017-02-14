'use strict'

var path = require('path')
var cluster = require('cluster')
var fs = require("fs-extra-promise")
var _ = require('lodash')
var Promise = require('bluebird');
var extend = require('node.extend');
var webpack = require('webpack');

var webpackServer = require('./webpack/server');
var MemoryFS = require('memory-fs');
var mfs = new MemoryFS();
var path = require('path');

var ssr = require('./render/server-renderer')
var csr = require('./render/client-renderer')

var Vue = require('vue');

module.exports = function (mikser) {
	var plugin = {
	}

	mikser.on('mikser.manager.importLayout', (layout) => {
		if (_.endsWith(layout.source, '.vue')){
			var debug = mikser.debug('vue');
			var ssrConfig = webpackServer(mikser)
			let compile = layout.meta.compile;
			ssrConfig.entry = layout.source;
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
			});
		}
	})

	mikser.generator.engines.push({
		extensions: ['vue'],
		pattern: '**/*.vue', 
		render: function(context) {
			if (!context.layout || !context.layout.template) return context.content;
			return context.async(ssr(context))
		}
	})
	return Promise.resolve(plugin)
}