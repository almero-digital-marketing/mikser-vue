const webpack = require('webpack')
const merge = require('webpack-merge')
const base = require('./webpack.base.config')
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')
const path = require('path');

module.exports = function (mikser, layout) {
	return merge(base(mikser, layout), {
		target: 'node',
		devtool: '#source-map',
		entry: path.join(__dirname, '../lib/entry-server.js'),
		output: {
			filename: 'server-bundle.js',
			libraryTarget: 'commonjs2'
		},
		resolve: {
			alias: {
				'layout.vue': layout.source
			}
		},
		performance: {
			hints: false,
			maxAssetSize: Infinity
		},
		externals: {
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.VUE_ENV': '"server"'
			}),
			new VueSSRServerPlugin()
		]
	})
}