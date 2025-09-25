const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';
const isVercel = process.env.VERCEL === '1';
const cdnUrl = process.env.CDN_URL || (isVercel ? '' : '');

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
    // تعديل مهم لـ Vercel
    publicPath: isVercel ? '' : '/',
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
          // تحسين معالجة الصور لـ Vercel - وضع الصور في مجلد منفصل
          filename: isVercel ? 'assets/images/[name].[hash][ext]' : (cdnUrl ? `${cdnUrl}/images/[name].[hash][ext]` : 'images/[name].[hash][ext]'),
          publicPath: isVercel ? '/assets/images/' : (cdnUrl ? `${cdnUrl}/` : '/'),
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          // تحسين معالجة الخطوط لـ Vercel
          filename: isVercel ? 'fonts/[name].[hash][ext]' : (cdnUrl ? `${cdnUrl}/fonts/[name].[hash][ext]` : 'fonts/[name].[hash][ext]'),
          publicPath: isVercel ? '' : (cdnUrl ? `${cdnUrl}/` : ''),
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
      chunks: ['main', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './login.html',
      filename: 'login.html',
      chunks: ['login', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './dashboard.html',
      filename: 'dashboard.html',
      chunks: ['main', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './admin.html',
      filename: 'admin.html',
      chunks: ['admin', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './harvest.html',
      filename: 'harvest.html',
      chunks: ['main', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './archive.html',
      filename: 'archive.html',
      chunks: ['main', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './my-subscription.html',
      filename: 'my-subscription.html',
      chunks: ['my-subscription', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './payment.html',
      filename: 'payment.html',
      chunks: ['payment', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './subscriptions.html',
      filename: 'subscriptions.html',
      chunks: ['subscriptions', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './register.html',
      filename: 'register.html',
      chunks: ['login', 'config', 'auth', 'sidebar']
    }),
    new HtmlWebpackPlugin({
      template: './reset-password.html',
      filename: 'reset-password.html',
      chunks: ['login', 'config', 'auth', 'sidebar']
    }),
    new CopyPlugin({
      patterns: [
        // نسخ الملفات الثابتة فقط (ليس ملفات JS التي تتم معالجتها بالفعل)
        { from: '*.css', to: '[name][ext]' },
        { from: '*.json', to: '[name][ext]' },
        { from: '_redirects', to: '_redirects' },
        { from: 'sw.js', to: 'sw.js' },
        { from: 'env.js', to: 'env.js' },
        { from: 'config.js', to: 'config.js' }
        // تم إزالة نسخ الصور لأنها ستُعالج بواسطة asset/resource
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
        },
        // إضافة مجموعة مشتركة للملفات المستخدمة في كل الصفحات
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
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
  devtool: isDevelopment ? 'eval-source-map' : (isVercel ? 'hidden-source-map' : 'source-map'),
};