module.exports = function (mikser) {
	var config = {
		devtool: '#source-map',
		target: 'node',
		profile: true,
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
	return config
}