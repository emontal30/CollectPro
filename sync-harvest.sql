-- ================================================================
-- COLLECTPRO - COLLABORATION SYSTEM (Final v6.1)
-- ملف: sync-harvest.sql
-- الوصف: نظام مشاركة التحصيلات - متوافق 100% مع schema.sql
-- ================================================================

-- ⚠️ ملاحظة: يُطبق هذا الملف بعد schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. جدول معرفات المستخدمين (User Codes)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    user_code TEXT UNIQUE NOT NULL, 
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- دالة توليد الكود التلقائي
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.profiles (id, user_code, full_name)
    VALUES (
        NEW.id, 
        'EMP-' || substring(md5(random()::text) from 1 for 6),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill للمستخدمين الحاليين
INSERT INTO public.profiles (id, user_code, full_name)
SELECT 
    id, 
    'EMP-' || substring(md5(id::text) from 1 for 6), 
    COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users 
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 2. جدول طلبات المشاركة
-- ================================================================

CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_code TEXT NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('viewer', 'editor')) DEFAULT 'editor',
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_receiver_code ON public.collaboration_requests(receiver_code, status);
CREATE INDEX IF NOT EXISTS idx_collab_sender ON public.collaboration_requests(sender_id);

-- ================================================================
-- 3. جدول البيانات الحية
-- ================================================================

CREATE TABLE IF NOT EXISTS public.live_harvest (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    rows JSONB DEFAULT '[]'::jsonb,
    master_limit NUMERIC DEFAULT 0,
    extra_limit NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    last_updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- 4. دوال الإشعارات
-- ================================================================

-- إشعار تحديث البيانات
CREATE OR REPLACE FUNCTION public.notify_live_harvest_change()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify(
    'live_harvest_update',
    json_build_object(
      'user_id', NEW.user_id,
      'updated_by', NEW.last_updated_by,
      'operation', TG_OP,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$;

-- إشعار طلبات المشاركة
CREATE OR REPLACE FUNCTION public.notify_collaboration_change()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM pg_notify(
      'collaboration_invite',
      json_build_object(
        'request_id', NEW.id,
        'receiver_code', NEW.receiver_code,
        'sender_id', NEW.sender_id,
        'role', NEW.role
      )::text
    );
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    PERFORM pg_notify(
      'collaboration_response',
      json_build_object(
        'request_id', NEW.id,
        'sender_id', NEW.sender_id,
        'receiver_id', NEW.receiver_id,
        'status', NEW.status
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ================================================================
-- 5. سياسات الأمان (RLS)
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_harvest ENABLE ROW LEVEL SECURITY;

-- === Profiles ===
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- === Collaboration Requests ===
DROP POLICY IF EXISTS "Send invites" ON public.collaboration_requests;
CREATE POLICY "Send invites" ON public.collaboration_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "View invites" ON public.collaboration_requests;
CREATE POLICY "View invites" ON public.collaboration_requests FOR SELECT USING (
    auth.uid() = sender_id 
    OR receiver_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_code = collaboration_requests.receiver_code 
        AND id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Respond invites" ON public.collaboration_requests;
CREATE POLICY "Respond invites" ON public.collaboration_requests FOR UPDATE USING (
    receiver_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_code = collaboration_requests.receiver_code 
        AND id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Delete own requests" ON public.collaboration_requests;
CREATE POLICY "Delete own requests" ON public.collaboration_requests FOR DELETE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Admin manage requests" ON public.collaboration_requests;
CREATE POLICY "Admin manage requests" ON public.collaboration_requests FOR ALL USING (public.is_admin());

-- === Live Harvest ===
DROP POLICY IF EXISTS "Owner full control" ON public.live_harvest;
CREATE POLICY "Owner full control" ON public.live_harvest FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Collaborator read" ON public.live_harvest;
CREATE POLICY "Collaborator read" ON public.live_harvest FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.collaboration_requests 
        WHERE sender_id = live_harvest.user_id 
        AND receiver_id = auth.uid() 
        AND status = 'accepted'
    )
);

DROP POLICY IF EXISTS "Collaborator write" ON public.live_harvest;
CREATE POLICY "Collaborator write" ON public.live_harvest FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.collaboration_requests 
        WHERE sender_id = live_harvest.user_id 
        AND receiver_id = auth.uid() 
        AND status = 'accepted' 
        AND role = 'editor'
    )
);

DROP POLICY IF EXISTS "Owner insert" ON public.live_harvest;
CREATE POLICY "Owner insert" ON public.live_harvest FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access" ON public.live_harvest;
CREATE POLICY "Admin full access" ON public.live_harvest FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ================================================================
-- 6. التريجرز
-- ================================================================

DROP TRIGGER IF EXISTS live_harvest_notify_trigger ON public.live_harvest;
CREATE TRIGGER live_harvest_notify_trigger
AFTER INSERT OR UPDATE ON public.live_harvest
FOR EACH ROW EXECUTE FUNCTION public.notify_live_harvest_change();

DROP TRIGGER IF EXISTS collaboration_notify_trigger ON public.collaboration_requests;
CREATE TRIGGER collaboration_notify_trigger
AFTER INSERT OR UPDATE ON public.collaboration_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_collaboration_change();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collab_updated_at ON public.collaboration_requests;
CREATE TRIGGER update_collab_updated_at 
BEFORE UPDATE ON public.collaboration_requests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_live_harvest_updated_at ON public.live_harvest;
CREATE TRIGGER update_live_harvest_updated_at 
BEFORE UPDATE ON public.live_harvest 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 7. الصلاحيات
-- ================================================================

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaboration_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_harvest TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.collaboration_requests TO service_role;
GRANT ALL ON public.live_harvest TO service_role;

-- ================================================================
-- نهاية الملف - جاهز للتطبيق ✅
-- ================================================================

-- للاستخدام:
-- 1. تأكد من تطبيق schema.sql أولاً
-- 2. طبّق هذا الملف
-- 3. اجعل حسابك أدمن:
--    UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';