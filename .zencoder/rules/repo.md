# CollectPro — Repo Profile

## نظرة عامة
- **الواجهة**: Vite + React 19 + React Router 7 + Tailwind CSS
- **الاعتماد الخلفي**: Supabase (auth + قاعدة بيانات + وظائف / Edge Functions)
- **المجلدات المهمة**:
  - `client/`: تطبيق الويب (Vite/React)
  - `supabase/functions/`: وظائف Supabase
  - `supabase/migrations/`: ترحيلات قاعدة البيانات
  - `.vscode/`: إعدادات VS Code

## أوامر التشغيل (داخل client)
1. التثبيت:
   ```bash
   npm install
   ```
2. تشغيل التطوير:
   ```bash
   npm run dev
   ```
3. البناء للإنتاج:
   ```bash
   npm run build
   ```
4. معاينة البناء:
   ```bash
   npm run preview
   ```

## المتغيرات السرّية (لا تُرفع إلى GitHub)
- ملف البيئة: `client/.env`
- أمثلة مهمة:
  - `VITE_SUPABASE_URL=`
  - `VITE_SUPABASE_ANON_KEY=`
- تأكد من بقاء هذه القيم خارج التحكم بالإصدارات (موجود `.gitignore` في `client/`).

## المكدس التقني (Dependencies)
- Runtime:
  - `react`, `react-dom`, `react-router-dom`
  - `@supabase/supabase-js`
- Tooling:
  - `vite`, `@vitejs/plugin-react`
  - `eslint` وأدواته
  - `tailwindcss`, `postcss`, `autoprefixer`

## بنية المشروع (مختصرة)
- `client/src/`
  - `main.jsx`, `App.jsx`, `App.css`
  - `pages/LoginPage.jsx`
  - `lib/supabaseClient` (إن وُجد)
- `supabase/`
  - `migrations/*.sql`
  - `functions/*`

## ملاحظات نشر
- النشر على Vercel/Netlify:
  - **Base directory**: `client`
  - **Build command**: `npm run build`
  - **Output directory**: `dist`
  - ضع متغيرات البيئة (`VITE_*`) في إعدادات منصة النشر.

## Supabase
- إدارة auth والجلسات تتم عبر Supabase JWT.
- للمزيد (سياسات RLS ووظائف البريد)، راجع `supabase/migrations` و`supabase/functions`.

## ملاحظات إضافية
- تأكد من عدم رفع أي مفاتيح سرية.
- استخدم فروعًا (`feature/*`, `fix/*`) ثم دمج إلى `main`.