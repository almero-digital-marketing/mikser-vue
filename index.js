'use strict'

var path = require('path')
var cluster = require('cluster')
var fs = require("fs-extra-promise")
var _ = require('lodash')
var traverse = require('traverse')
var mask = require('json-mask')

var baseRender = require('render/base')
var applicationRender = require('render/application')

var Vue = require('vue');
var vueServerRenderer = require('vue-server-renderer');
var vueRenderer = vueServerRenderer.createRenderer();

module.exports = function (mikser) {
	var plugin = {
	}
	if (cluster.isMaster) {
		// var invalidateCache = (entity) => {
		// 	if (path.extname(entity._id) == '.vue') {
		// 		mikser.broker.broadcast('mikser.plugins.vue.invalidateCache');
		// 	}
		// }
		// mikser.on('mikser.manager.importLayout', invalidateCache);
		// mikser.on('mikser.manager.importView', invalidateCache);
		// mikser.on('mikser.manager.deleteLayout', invalidateCache);
		// mikser.on('mikser.manager.deleteView', invalidateCache);
	}
	mikser.generator.engines.push({
		extensions: ['vue'],
		pattern: '**/*.vue', 
		render: function(context) {
			if (!context.layout || !context.layout.template) return context.content;

			let state = {
				entity: _.cloneDeep(context.entity),
				layout: _.cloneDeep(context.layout),
				data: _.cloneDeep(context.data),
				content: context.content
			}
			delete state.layout.content
			delete state.entity.guide

			if (context.layout.meta.mask) {
				state = mask(state, context.layout.meta.mask)
			}

			traverse(state).forEach(function (value) {
				if (_.isString(value)) {
					this.update(value.replace(mikser.options.workingFolder,''));
				}
			});

			if (context.layout.meta.app) {
				return context.async(applicationRender(context, state).then((output) => {
					return output.content;
				}));
			} else {
				return context.async(baseRender(context, state).then((output) => {
					output.stats.errors.forEach(err => mikser.diagnostics.log('error', err)
					output.stats.warnings.forEach(err => mikser.diagnostics.log('warning', err)

					return output.content;
				});
			}
		}
	});
	return Promise.resolve(plugin);

}