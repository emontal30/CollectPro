import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Key is missing in environment variables.')
}

// إعداد العميل مع تفعيل التخزين المحلي واستعادة الجلسة
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage, // الاعتماد الصريح على التخزين المحلي
    autoRefreshToken: true, // تجديد التوكن تلقائياً
    persistSession: true, // الحفاظ على الجلسة
    detectSessionInUrl: true // اكتشاف روابط تسجيل الدخول (OAuth)
  }
})