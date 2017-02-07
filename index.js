'use strict'

var path = require('path')
var cluster = require('cluster')
var fs = require("fs-extra-promise")
var _ = require('lodash')
var traverse = require('traverse')
var mask = require('json-mask')
var Promise = require('bluebird');

var baseRender = require('./render/base')
var applicationRender = require('./render/application')

var Vue = require('vue');
var vueServerRenderer = require('vue-server-renderer');
var vueRenderer = vueServerRenderer.createRenderer();

module.exports = function (mikser) {
	var plugin = {
	}
	mikser.generator.engines.push({
		extensions: ['vue'],
		pattern: '**/*.vue', 
		render: function(context) {
			if (!context.layout || !context.layout.template) return context.content;
			let layoutSource = context.layout.source
			let layoutId = context.layout._id
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
					output.stats.errors.forEach((err) => mikser.diagnostics.log('error', err))
					output.stats.warnings.forEach((err) => mikser.diagnostics.log('warning', err))


					let modules = output.stats.modules
						.map((module) => path.resolve(path.join(mikser.options.workingFolder, module.name)))
						.filter((module) => _.startsWith(module, mikser.config.layoutsFolder) || _.startsWith(module, mikser.config.filesFolder) || _.startsWith(module, mikser.config.sharedFolder) || _.startsWith(module, mikser.config.pluginsFolder))
						.filter((module) => module != layoutSource)
					return Promise.map(modules, (module) => mikser.database.layouts.update({_id: layoutId}, { $push: { modules: { $each: modules}}})).return(output.content)
				}))
			}
		}
	})
	return Promise.resolve(plugin)

}