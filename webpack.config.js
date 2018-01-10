require('es6-promise').polyfill();

const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

var isProduction = process.env.NODE_ENV === undefined || process.env.NODE_ENV === 'production';

var webpackPlugins = [
	new webpack.DefinePlugin({
		ENV: JSON.stringify(process.env.NODE_ENV || 'production')
	}),
	new webpack.ExternalsPlugin('commonjs', [
		'electron',
		'fs',
		'datauri'
	]),
	new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
];

if (isProduction) {
	webpackPlugins.push(new UglifyJSPlugin({
		ie8: false,
		ecma: 8,
		parallel: true,
		output: {
			comments: false,
			beautify: false
		},
	}));
}

module.exports = {
	entry: {
		app: './src/js/main.js',
		background: './src/js/background.js',
		bbrowser: './src/js/bbrowser.js'
	},
	output: {
		path: __dirname + '/dist/',
		filename: '[name].js'
	},
	resolve: {
		alias: {
			vue: isProduction ? 'vue/dist/vue.min.js' : 'vue/dist/vue.js'
		}
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /(node_modules|dist)/
			},
			{
				test: /\.vue$/,
				loader: 'vue-loader',
				options: {
					loaders: {
						js: 'babel-loader'
					}
				}
			},
			{
				test: /\.(png|woff|woff2|ttf)$/,
				loader: 'url-loader?limit=100000'
			},
			{
				test: /\.html$/,
				loader: 'html-loader?attrs=false'
			},
			{
				test: /\.css$/,
				loader: 'style-loader!css-loader'
			},
			{
				test: /\.scss$/,
				loader: 'style-loader!css-loader!sass-loader'
			}
		]
	},
	plugins: webpackPlugins
};
