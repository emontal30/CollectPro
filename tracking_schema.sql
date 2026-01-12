-- ================================================================
-- نظام تتبع نشاط المستخدمين (User Activity Tracking)
-- الملف: tracking_schema.sql
-- ================================================================

-- 1. إنشاء جدول تتبع الإجراءات
CREATE TABLE IF NOT EXISTS public.user_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL, -- 'archive_today', 'save_and_go_to_harvest', 'update_balances', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. فهرس (Index) لتحسين سرعة استعلامات الإحصائيات حسب الوقت
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON public.user_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON public.user_actions(user_id);

-- 3. تفعيل الحماية (RLS)
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

-- 4. سياسات الأمان
-- أ) السماح للمستخدمين بإضافة (Insert) إجراءاتهم الخاصة
DROP POLICY IF EXISTS "Users can log their own actions" ON public.user_actions;
CREATE POLICY "Users can log their own actions" ON public.user_actions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ب) السماح للمدير فقط برؤية كل الإجراءات (للإحصائيات)
DROP POLICY IF EXISTS "Admins can view all actions" ON public.user_actions;
CREATE POLICY "Admins can view all actions" ON public.user_actions
FOR SELECT USING (public.is_admin());

-- ج) السماح للمستخدم برؤية إجراءاته (اختياري، قد لا يحتاجه الفرونت إند حالياً)
DROP POLICY IF EXISTS "Users can view their own actions" ON public.user_actions;
CREATE POLICY "Users can view their own actions" ON public.user_actions
FOR SELECT USING (auth.uid() = user_id);

-- 5. تنظيف البيانات القديمة تلقائياً (اختياري - لتوفير المساحة)
-- يمكن تشغيل هذا يدوياً أو عبر cron job إذا توفر
CREATE OR REPLACE FUNCTION clean_old_user_actions()
RETURNS void LANGUAGE sql AS $$
    DELETE FROM public.user_actions WHERE created_at < NOW() - INTERVAL '30 days';
$$;
