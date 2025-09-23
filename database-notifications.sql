-- ========== إضافة جدول الإشعارات ========== --

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    metadata JSONB
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- سياسات أمان (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بإنشاء إشعارات (للنظام فقط)
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (false);

-- السماح للمستخدمين بعرض إشعاراتهم
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بتحديث إشعاراتهم
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- السماح للمسؤولين بعرض جميع الإشعارات
CREATE POLICY "Admins can view all notifications" ON notifications FOR SELECT USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- إضافة مشغل لتحديث حقل read_at عند تحديث الحالة
CREATE OR REPLACE FUNCTION handle_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'read' AND OLD.status = 'unread' THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول الإشعارات
CREATE TRIGGER handle_notification_read_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION handle_notification_read_at();

-- إضافة مشغل لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_notifications_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME || ' ' || TG_OP, 
            inet_client_addr(), http_user_agent());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول الإشعارات
CREATE TRIGGER log_notifications_activity AFTER INSERT OR UPDATE OR DELETE ON notifications FOR EACH ROW EXECUTE FUNCTION log_notifications_activity();

-- جدول إعدادات الإشعارات
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    channels JSONB DEFAULT '["email", "in-app"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(type);

-- سياسات أمان (RLS)
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بعرض إعدادات إشعاراتهم
CREATE POLICY "Users can view own notification settings" ON notification_settings FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بإنشاء إعدادات إشعارات
CREATE POLICY "Users can create notification settings" ON notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- السماح للمستخدمين بتحديث إعدادات إشعاراتهم
CREATE POLICY "Users can update own notification settings" ON notification_settings FOR UPDATE USING (auth.uid() = user_id);

-- السماح للمسؤولين بعرض جميع إعدادات الإشعارات
CREATE POLICY "Admins can view all notification settings" ON notification_settings FOR SELECT USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- إضافة مشغل لتحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION handle_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول إعدادات الإشعارات
CREATE TRIGGER handle_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION handle_notification_settings_updated_at();

-- إضافة مشغل لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_notification_settings_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME || ' ' || TG_OP, 
            inet_client_addr(), http_user_agent());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول إعدادات الإشعارات
CREATE TRIGGER log_notification_settings_activity AFTER INSERT OR UPDATE OR DELETE ON notification_settings FOR EACH ROW EXECUTE FUNCTION log_notification_settings_activity();

-- إضافة بيانات افتراضية لإعدادات الإشعارات
INSERT INTO notification_settings (user_id, type, enabled, channels)
SELECT 
    u.id,
    'system',
    true,
    '["email", "in-app"]'::jsonb
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM notification_settings ns WHERE ns.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- جدول رسائل البريد الإلكتروني
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);

-- سياسات أمان (RLS)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- السماح للمسؤولين فقط بإدارة قائمة انتظار البريد
CREATE POLICY "Admins can manage email queue" ON email_queue FOR ALL USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- إضافة مشغل لتحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION handle_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول قائمة انتظار البريد
CREATE TRIGGER handle_email_queue_updated_at BEFORE UPDATE ON email_queue FOR EACH ROW EXECUTE FUNCTION handle_email_queue_updated_at();

-- إضافة مشغل لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_email_queue_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME || ' ' || TG_OP, 
            inet_client_addr(), http_user_agent());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على جدول قائمة انتظار البريد
CREATE TRIGGER log_email_queue_activity AFTER INSERT OR UPDATE OR DELETE ON email_queue FOR EACH ROW EXECUTE FUNCTION log_email_queue_activity();
