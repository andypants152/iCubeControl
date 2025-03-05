const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');


module.exports = {
  mode: 'development',
  entry: './build/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 3000,
    open: true,
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
    }
    ]
  },
  plugins: [
    new CopyPlugin({
        patterns: [
          // Copy Shoelace assets to dist/shoelace
          {
            from: path.resolve(__dirname, 'node_modules/@shoelace-style/shoelace/dist/'),
            to: path.resolve(__dirname, 'dist/shoelace/')
          }
        ]
      }),
    new HtmlWebpackPlugin({
      template: './build/index.html',
      inject: 'body',
    }),
  ],
  resolve: {
    extensions: ['.js'],
  }
};
