// تحميل مكتبة Supabase
(function loadSupabase() {
  console.log('⏳ بدء تحميل مكتبة Supabase...');
  const supabaseScript = document.createElement('script');
  supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';
  supabaseScript.async = true;

  supabaseScript.onload = () => {
    if (window.supabase) {
      console.log('✅ تم تحميل مكتبة Supabase بنجاح');
      // إشعار باقي الكود أن المكتبة أصبحت متاحة
      window.dispatchEvent(new CustomEvent('supabaseLoaded'));
    } else {
      console.error('⚠️ تم تحميل الملف لكن كائن Supabase غير موجود');
    }
  };

  supabaseScript.onerror = () => {
    console.error('❌ فشل في تحميل مكتبة Supabase');
    // وضع علامة ليتحقق باقي الكود منها
    window.supabaseLoadError = true;
  };

  document.head.appendChild(supabaseScript);
})();
