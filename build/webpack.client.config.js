const webpack = require('webpack')
const merge = require('webpack-merge')
const base = require('./webpack.base.config')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')
const path = require('path');

module.exports = function (mikser, layout) {
	return merge(base(mikser, layout), {
		entry: path.join(__dirname, '../lib/entry-client.js'),
		output: {
			path: path.join(mikser.config.runtimeFilesFolder, path.dirname(layout._id)),
			filename: path.basename(layout.vue.app) + '.js',
		},
		resolve: {
			alias: {
				'layout.vue': layout.source
			}
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.VUE_ENV': '"client"'
			}),
			new VueSSRClientPlugin()
		]
	})
}