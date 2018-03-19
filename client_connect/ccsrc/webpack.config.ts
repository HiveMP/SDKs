import * as webpack from 'webpack';
import { resolve } from 'path';
const ExternalsPlugin = require('webpack/lib/ExternalsPlugin');

const config: webpack.Configuration = {
  entry: './src/index.ts',
  mode: 'development',
  target: (compiler: any) => {
    new ExternalsPlugin("commonjs", [
      "curl-native"
    ]).apply(compiler);
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  node: {
    'curl-native': false,
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