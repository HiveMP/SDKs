import * as webpack from 'webpack';
import { resolve } from 'path';
const ExternalsPlugin = require('webpack/lib/ExternalsPlugin');
const NodeTemplatePlugin = require('webpack/lib/node/NodeTemplatePlugin');
const ReadFileCompileWasmTemplatePlugin = require('webpack/lib/node/ReadFileCompileWasmTemplatePlugin');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const FunctionModulePlugin = require("webpack/lib/FunctionModulePlugin");
const LoaderTargetPlugin = require("webpack/lib/LoaderTargetPlugin");

const config: webpack.Configuration = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: false,
  target: (compiler: any) => {
    new NodeTemplatePlugin({
      asyncChunkLoading: false
    }).apply(compiler);
    new ReadFileCompileWasmTemplatePlugin({
      filename: 'bundle.js',
      path: resolve(__dirname, 'dist')
    }).apply(compiler);
    new FunctionModulePlugin({
      filename: 'bundle.js',
      path: resolve(__dirname, 'dist')
    }).apply(compiler);
    new NodeTargetPlugin().apply(compiler);
    new LoaderTargetPlugin("node").apply(compiler);
    new ExternalsPlugin("commonjs", [
      "curl-native",
      "timers",
      "console",
      "hotpatching",
      "process",
      "steam"
    ]).apply(compiler);
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /^node_modules/,
      }
    ]
  },
  node: {
    'curl-native': false,
    'process': false,
  },
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  output: {
    filename: 'bundle.js',
    path: resolve(__dirname, 'dist')
  }
}

export default config;