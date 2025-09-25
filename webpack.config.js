const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';
const cdnUrl = process.env.CDN_URL || '';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    main: './script.js',
    login: './login.js',
    admin: './admin.js',
    'my-subscription': './my-subscription.js',
    payment: './payment.js',
    subscriptions: './subscriptions.js',
    sidebar: './sidebar.js',
    auth: './auth.js',
    'api-client': './api-client.js',
    'supabase-loader': './supabase-loader.js'
  },
  output: {
    filename: isDevelopment ? '[name].bundle.js' : '[name].[contenthash].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: '/',
    assetModuleFilename: 'assets/[hash][ext][query]',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            cacheDirectory: true,
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: false,
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('autoprefixer')
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: cdnUrl ? `${cdnUrl}/images/[name].[hash][ext]` : 'images/[name].[hash][ext]',
          publicPath: cdnUrl ? `${cdnUrl}/` : undefined,
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: cdnUrl ? `${cdnUrl}/fonts/[name].[hash][ext]` : 'fonts/[name].[hash][ext]',
          publicPath: cdnUrl ? `${cdnUrl}/` : undefined,
        }
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: isDevelopment ? '[name].css' : '[name].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      chunks: ['main', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './login.html',
      filename: 'login.html',
      chunks: ['login', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './dashboard.html',
      filename: 'dashboard.html',
      chunks: ['main', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './admin.html',
      filename: 'admin.html',
      chunks: ['admin', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './harvest.html',
      filename: 'harvest.html',
      chunks: ['main', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './archive.html',
      filename: 'archive.html',
      chunks: ['main', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './my-subscription.html',
      filename: 'my-subscription.html',
      chunks: ['my-subscription', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './payment.html',
      filename: 'payment.html',
      chunks: ['payment', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './subscriptions.html',
      filename: 'subscriptions.html',
      chunks: ['subscriptions', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './register.html',
      filename: 'register.html',
      chunks: ['login', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './reset-password.html',
      filename: 'reset-password.html',
      chunks: ['login', 'auth', 'sidebar']
    }),
    new CopyPlugin({
      patterns: [
        { from: '*.css', to: '[name][ext]' },
        { from: '*.json', to: '[name][ext]' },
        { from: '_redirects', to: '_redirects' },
        { from: 'sw.js', to: 'sw.js' },
        { from: 'env.js', to: 'env.js' },
        { from: 'config.js', to: 'config.js' },
        { from: 'auth.js', to: 'auth.js' },
        { from: 'sidebar.js', to: 'sidebar.js' },
        { from: 'login.js', to: 'login.js' },
        { from: 'admin.js', to: 'admin.js' },
        { from: 'script.js', to: 'script.js' },
        { from: 'api-client.js', to: 'api-client.js' },
        { from: 'supabase-loader.js', to: 'supabase-loader.js' },
        { from: 'my-subscription.js', to: 'my-subscription.js' },
        { from: 'payment.js', to: 'payment.js' },
        { from: 'subscriptions.js', to: 'subscriptions.js' },
        // نسخ ملفات الصور الموجودة فعلاً
        { from: 'logo-momkn.png', to: '[name][ext]' },
        { from: 'logo-tick.png', to: '[name][ext]' },
        { from: 'logoapp.png', to: '[name][ext]' },
        { from: 'logo-archive.png', to: '[name][ext]' }
      ]
    })
  ],
  optimization: {
    minimizer: [
      new CssMinimizerPlugin(),
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: !isDevelopment,
          },
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          enforce: true,
        },
        supabase: {
          test: /[\\/]node_modules[\\/]@supabase[\\/]/,
          name: 'supabase',
          chunks: 'all',
          priority: 15,
        }
      },
    },
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  performance: {
    hints: isDevelopment ? false : 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true
  },
  devtool: isDevelopment ? 'eval-source-map' : 'source-map',
};
