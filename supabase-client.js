// supabase-client.js

// 1. أدخل بياناتك الجديدة هنا
// ملاحظة: هذا هو المفتاح الذي قدمته. يجب عليك استبداله بمفتاح جديد فوراً من لوحة تحكم Supabase.
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

/**
 * --------------------------------------------------------------------------------
 * إعداد عميل Supabase بطريقة أكثر أماناً وقوة.
 * 
 * 1. نتحقق أولاً من أن مكتبة Supabase قد تم تحميلها بنجاح.
 * 2. نأخذ دالة createClient من الكائن العام supabase.
 * 3. ننشئ اتصالنا ونضعه في window.supabase ليكون متاحاً لجميع السكربتات الأخرى.
 * --------------------------------------------------------------------------------
 */

// التحقق من وجود مكتبة Supabase لتجنب الأخطاء
if (typeof supabase === 'undefined' || !supabase.createClient) {
  console.error('خطأ: مكتبة Supabase لم يتم تحميلها بشكل صحيح. تأكد من أن وسم <script> الخاص بها موجود في ملف HTML قبل هذا السكربت.');
} else {
  const { createClient } = supabase;
  
  window.supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true, // خيار جيد للحفاظ على جلسة المستخدم
      autoRefreshToken: true, // تحديث التوكن تلقائياً عند انتهاء صلاحيته
      detectSessionInUrl: true // للتعامل مع المصادقة عبر الرابط (مثل تسجيل الدخول عبر البريد الإلكتروني)
    }
  });

  console.log('تم تهيئة عميل Supabase بنجاح.');
}