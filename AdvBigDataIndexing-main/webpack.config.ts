import webpack, { WebpackPluginInstance } from 'webpack'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import nodeExternals from 'webpack-node-externals'
import TerserPlugin from 'terser-webpack-plugin'
import path from 'path'

const isDev = process.env.NODE_ENV !== 'production'
const getPlugins = (): WebpackPluginInstance[] => {
  const plugins = [new webpack.ProgressPlugin()]

  if (isDev) {
    plugins.push(new ForkTsCheckerWebpackPlugin())
  }
  return plugins
}
const config: webpack.Configuration = {
  name: 'server',
  context: path.resolve(process.cwd()),
  mode: isDev ? 'development' : 'production',
  devtool: isDev ? 'inline-source-map' : 'source-map',
  target: 'node',
  entry: {
    webapp: './webapp/server.ts',
    consumer: './consumer/plan.consumer.ts',
    graphql: './graphql/graphql-server.ts'
  },
  output: {
    clean: true,
    publicPath: 'dist/',
    path: path.resolve(process.cwd(), 'dist'),
    filename: '[name].js'
  },
  optimization: {
    minimizer: [new TerserPlugin({ terserOptions: { compress: { drop_console: true } } })]
  },
  resolve: {
    extensions: ['.ts']
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  externals: [nodeExternals()],
  plugins: getPlugins()
}

export default config
