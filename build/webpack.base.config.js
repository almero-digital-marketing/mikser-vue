const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')

module.exports = function (mikser) {
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
			}
		},
		plugins: [
			new FriendlyErrorsPlugin()
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
							js: 'babel-loader',
							scss: 'css-loader'
						}
					}
				},{
					test: /\.js$/,
					loader: 'babel-loader',
					exclude: /node_modules/
				}
			]
		},
	}
	return config
}