# TODO: Fix Deployment Errors on Vercel

## 1. Update webpack.config.js
- [x] Add 'config': './config.js' to entry object.
- [x] Add 'config' to chunks in all HtmlWebpackPlugin instances.
- [x] Remove { from: '*.css', to: '[name][ext]' } and { from: 'config.js', to: 'config.js' } from CopyPlugin patterns.

## 2. Update JS Entry Files for CSS Imports
- [x] In sidebar.js: Add `import './sidebar.css';`
- [x] In login.js: Add `import './login.css';`
- [x] In admin.js: Add `import './admin.css';`
- [x] In my-subscription.js: Add `import './my-subscription.css';`
- [x] In payment.js: Add `import './payment.css';`
- [x] In subscriptions.js: Add `import './subscriptions.css';`
- [x] Check and add for other pages if needed (e.g., dashboard, harvest, archive).

## 3. Update HTML Templates
- [x] Remove hardcoded <script src="config.js">, <script src="auth.js">, <script src="sidebar.js">, <script src="supabase-loader.js">, <script src="env.js">, <script src="page.js"> from all *.html files.
- [x] Remove hardcoded <link rel="stylesheet" href="sidebar.css"> and page-specific CSS links.
- [x] Keep external scripts (Font Awesome, Google GSI) and inline scripts.

## 4. Build and Verify
- [x] Run `npm run build` to generate dist/.
- [x] Check dist/ contents for bundled files (e.g., config.bundle.js, sidebar.css).
- [ ] Deploy to Vercel and test login.html for no console errors.

## 5. Testing
- [ ] Test all pages on deployed site for asset loading and functionality.
