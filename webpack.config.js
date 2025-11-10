const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv = {}) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './build/main.js',
    output: {
      filename: isProduction ? 'assets/[name].[contenthash].js' : 'assets/[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
      publicPath: '',
    },
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    devServer: {
      static: path.resolve(__dirname, 'dist'),
      port: 3000,
      open: true,
      hot: true,
      client: {
        overlay: true,
      },
      watchFiles: ['build/**/*'],
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
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
      ...(isProduction
        ? [
            new MiniCssExtractPlugin({
              filename: 'assets/[name].[contenthash].css'
            })
          ]
        : []),
    ],
    resolve: {
      extensions: ['.js'],
    }
  };
};
