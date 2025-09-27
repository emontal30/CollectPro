// supabaseClient.js - ملف Supabase منفصل
import { createClient } from "@supabase/supabase-js";
import { appConfig } from "./config.js";

// إنشاء عميل Supabase
export const supabase = createClient(
  appConfig.supabaseUrl,
  appConfig.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// دوال مساعدة للمصادقة
export class AuthHelper {
  // تسجيل الدخول بـ Google
  static async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('❌ Google Login Error:', error.message);
        throw error;
      }

      console.log('✅ تم تحويل المستخدم لـ Google:', data);
      return data;
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول بـ Google:', error);
      throw error;
    }
  }

  // تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
  static async signInWithEmail(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('❌ Email Login Error:', error.message);
        throw error;
      }

      console.log('✅ تم تسجيل الدخول بنجاح:', data.user.email);
      return data;
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      throw error;
    }
  }

  // تسجيل الخروج
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('✅ تم تسجيل الخروج بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تسجيل الخروج:', error);
      throw error;
    }
  }

  // الحصول على المستخدم الحالي
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      return user;
    } catch (error) {
      console.error('❌ خطأ في الحصول على المستخدم:', error);
      return null;
    }
  }

  // التحقق من وجود جلسة نشطة
  static async checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      return session;
    } catch (error) {
      console.error('❌ خطأ في فحص الجلسة:', error);
      return null;
    }
  }
}

// للتوافق مع الكود القديم
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.AuthHelper = AuthHelper;
}