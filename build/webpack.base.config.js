const webpack = require('webpack')
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const path = require('path')

module.exports = function (mikser, layout) {
	var config = {
		devtool: '#cheap-module-source-map',
		resolve: {
			modules: [mikser.options.workingFolder, 'node_modules'],
			extensions: ['.js', '.vue'],
			alias: {
				'layouts': mikser.config.layoutsFolder,
				'files': mikser.config.filesFolder,
				'shared': mikser.config.sharedFolder,
				'runtime': mikser.config.runtimeFilesFolder,
				'plugins': mikser.config.pluginsFolder,
				'routes': path.join(mikser.config.runtimeFolder, 'vue-routes.js'),
			}
		},
		plugins: [
			new FriendlyErrorsPlugin(),
			new webpack.DefinePlugin({
				'process.env.VUE_APP': '"' + layout.vue.app + '"',
				'process.env.VUE_SSR': layout.vue.ssr,
				'process.env.NODE_ENV': mikser.options.debug ? '"development"' : '"production"',
			}),
		],
		module: {
			noParse: /es6-promise\.js$/,
			rules: [
				{
					test: mikser.config.layoutsFolder,
					loader: 'front-matter-loader?onlyBody'
				},{
					test: /\.vue$/,
					loader: 'vue-loader',
					options: {
						loaders: {
							js: 'babel-loader?presets[]=env',
							scss: 'css-loader'
						}
					}
				},{
					test: /\.js$/,
					loader: 'babel-loader',
					exclude: /node_modules/,
					query : {
						presets: [require.resolve('babel-preset-env')]
					},
				}
			]
		},
	}
	return config
}