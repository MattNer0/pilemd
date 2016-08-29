require('es6-promise').polyfill();

var webpack = require('webpack');

module.exports = {
  entry: './src/js/main.js',
  output: {
    path: __dirname + '/dist/',
    filename: 'app.js'
  },
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel-loader', exclude: /(node_modules|dist)/},
      {test: /\.(png|woff|woff2|ttf)$/, loader: "url-loader?limit=100000"},
      {test: /\.html$/, loader: 'html-loader?attrs=false'},
      {test: /\.css$/, loader: "style-loader!css-loader"}
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      ENV: JSON.stringify(process.env.NODE_ENV || 'production')
    }),
    new webpack.ExternalsPlugin('commonjs', [
      'electron',
      'fs',
      'chokidar',
      'datauri'
    ])
  ]
};
