import * as webpack from 'webpack';
import { resolve } from 'path';

const config: webpack.Configuration = {
  entry: './src/index.ts',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
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