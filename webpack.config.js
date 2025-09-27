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
    config: './config.js',
    auth: './auth.js'
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
          // تحسين معالجة الصور لـ Vercel - وضع الصور في مجلد public
          filename: isVercel ? 'public/[name].[hash][ext]' : (cdnUrl ? `${cdnUrl}/public/[name].[hash][ext]` : 'public/[name].[hash][ext]'),
          publicPath: isVercel ? '/public/' : (cdnUrl ? `${cdnUrl}/` : '/'),
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
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      template: './login.html',
      filename: 'login.html',
      chunks: ['login']
    }),
    new HtmlWebpackPlugin({
      template: './dashboard.html',
      filename: 'dashboard.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      template: './admin.html',
      filename: 'admin.html',
      chunks: ['admin']
    }),
    new HtmlWebpackPlugin({
      template: './harvest.html',
      filename: 'harvest.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      template: './archive.html',
      filename: 'archive.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      template: './my-subscription.html',
      filename: 'my-subscription.html',
      chunks: ['my-subscription']
    }),
    new HtmlWebpackPlugin({
      template: './payment.html',
      filename: 'payment.html',
      chunks: ['payment']
    }),
    new HtmlWebpackPlugin({
      template: './subscriptions.html',
      filename: 'subscriptions.html',
      chunks: ['subscriptions']
    }),
    new HtmlWebpackPlugin({
      template: './register.html',
      filename: 'register.html',
      chunks: ['login']
    }),
    new HtmlWebpackPlugin({
      template: './reset-password.html',
      filename: 'reset-password.html',
      chunks: ['login']
    }),
    new HtmlWebpackPlugin({
      template: './auth-callback.html',
      filename: 'auth-callback.html',
      chunks: ['main']
    }),
    new CopyPlugin({
      patterns: [
        // نسخ الملفات الثابتة
        { from: '*.css', to: '[name][ext]' },
        { from: '*.json', to: '[name][ext]' },
        { from: '_redirects', to: '_redirects' },
        { from: 'sw.js', to: 'sw.js' },
        { from: 'env.js', to: 'env.js' },
        { from: 'supabase-loader.js', to: 'supabase-loader.js' },
        { from: 'sidebar.js', to: 'sidebar.js' },
        { from: 'script.js', to: 'script.js' },
        { from: 'cdn-config.js', to: 'cdn-config.js' },
        // نسخ مجلد public بالكامل
        { from: 'public', to: 'public', noErrorOnMissing: true }
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