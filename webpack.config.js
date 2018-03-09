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
		parallel: true,
		uglifyOptions: {
			ie8: false,
			ecma: 8,
			output: {
				comments: false,
				beautify: false
			},
		}
	}));
}

module.exports = {
	mode: isProduction ? 'production' : 'development',
	entry: {
		app: './src/js/main.js',
		background: './src/js/background.js',
		bbrowser: './src/js/bbrowser.js'
	},
	output: {
		path: __dirname + '/dist/build/',
		filename: '[name].js'
	},
	resolve: {
		alias: {
			vue: isProduction ? 'vue/dist/vue.min.js' : 'vue/dist/vue.js',
			autosize: isProduction ? 'autosize/dist/autosize.min.js' : 'autosize/dist/autosize.js'
		}
	},
	module: {
		rules: [
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
				loader: 'url-loader',
				options: {
					'limit' : 100000
				}
			},
			{
				test: /\.html$/,
				loader: 'html-loader',
				options: {
					'attrs' : false
				}
			},
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader'
				]
			},
			{
				test: /\.scss$/,
				use: [
					'style-loader',
					'css-loader',
					'sass-loader'
				]
			}
		]
	},
	plugins: webpackPlugins
};
