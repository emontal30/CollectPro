-- ========== إضافة جدول الرسائل ========== --

-- جدول الرسائل
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_admin_id ON messages(admin_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- سياسات أمان (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بإنشاء رسائل جديدة
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- السماح للمستخدمين بعرض رسائلهم
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = user_id);

-- السماح للمسؤولين بعرض جميع الرسائل
CREATE POLICY "Admins can view all messages" ON messages FOR SELECT USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- السماح للمسؤولين بتحديث رسائل
CREATE POLICY "Admins can update messages" ON messages FOR UPDATE USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- إضافة مشغل لتحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION handle_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول الرسائل
CREATE TRIGGER handle_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION handle_messages_updated_at();

-- إضافة مشغل لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_messages_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME || ' ' || TG_OP, 
            inet_client_addr(), http_user_agent());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول الرسائل
CREATE TRIGGER log_messages_activity AFTER INSERT OR UPDATE OR DELETE ON messages FOR EACH ROW EXECUTE FUNCTION log_messages_activity();

-- إضافة بيانات افتراضية
INSERT INTO messages (user_id, admin_id, subject, content, status) 
SELECT 
    u.id,
    (SELECT id FROM users WHERE is_admin = true LIMIT 1),
    'رسالة ترحيبية',
    'مرحباً بك في تطبيق CollectPro. إذا كان لديك أي استفسارات، فلا تتردد في التواصل معنا.',
    'read'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.user_id = u.id
)
LIMIT 10
ON CONFLICT DO NOTHING;
