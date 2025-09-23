-- ========== قاعدة بيانات CollectPro ========== --

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token UUID,
    reset_password_token UUID,
    reset_password_expires TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الاشتراكات
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    payment_method VARCHAR(50),
    payment_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول المدفوعات
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول التحصيلات
CREATE TABLE IF NOT EXISTS harvests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    description TEXT,
    customer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الأرشيف
CREATE TABLE IF NOT EXISTS archive (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- جدول النشاط والسجلات
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الإعدادات
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الأخطاء
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    page_url TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول النسخ الاحتياطية
CREATE TABLE IF NOT EXISTS backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرسات لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_harvests_user_id ON harvests(user_id);
CREATE INDEX IF NOT EXISTS idx_harvests_date ON harvests(date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- إنشاء سياسات أمان (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- سياسات جدول المستخدمين
-- السماح بالوصول للجميع لإنشاء مستخدم جديد (التسجيل)
CREATE POLICY "Public can create users" ON users FOR INSERT WITH CHECK (true);

-- السماح للمستخدم بالوصول إلى بياناته الخاصة فقط
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

-- السماح للمستخدم بتحديث بياناته الخاصة فقط
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- السماح للمستخدم بحذف حسابه الخاص فقط
CREATE POLICY "Users can delete own account" ON users FOR DELETE USING (auth.uid() = id);

-- سياسات جدول الاشتراكات
-- السماح للمستخدمين بعرض اشتراكاتهم فقط
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بإنشاء اشتراكات جديدة
CREATE POLICY "Users can create subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- السماح للمستخدمين بتحديث اشتراكاتهم فقط
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- السماح للمستخدمين بحذف اشتراكاتهم فقط
CREATE POLICY "Users can delete own subscriptions" ON subscriptions FOR DELETE USING (auth.uid() = user_id);

-- سياسات جدول المدفوعات
-- السماح للمستخدمين بعرض مدفوعاتهم فقط
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بإنشاء مدفوعات جديدة
CREATE POLICY "Users can create payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- سياسات جدول التحصيلات
-- السماح للمستخدمين بعرض تحصيلاتهم فقط
CREATE POLICY "Users can view own harvests" ON harvests FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بإنشاء تحصيلات جديدة
CREATE POLICY "Users can create harvests" ON harvests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- السماح للمستخدمين بتحديث تحصيلاتهم فقط
CREATE POLICY "Users can update own harvests" ON harvests FOR UPDATE USING (auth.uid() = user_id);

-- السماح للمستخدمين بحذف تحصيلاتهم فقط
CREATE POLICY "Users can delete own harvests" ON harvests FOR DELETE USING (auth.uid() = user_id);

-- سياسات جدول الأرشيف
-- السماح للمستخدمين بعرض أرشيفهم فقط
CREATE POLICY "Users can view own archive" ON archive FOR SELECT USING (auth.uid() = user_id);

-- السماح للمستخدمين بإنشاء أرشيف جديد
CREATE POLICY "Users can create archive" ON archive FOR INSERT WITH CHECK (auth.uid() = user_id);

-- سياسات جدول النشاط
-- السماح للمستخدمين بعرض سجل نشاطهم فقط
CREATE POLICY "Users can view own activity logs" ON activity_logs FOR SELECT USING (auth.uid() = user_id);

-- سياسات جدول الإعدادات
-- السماح للمسؤولين فقط بعرض الإعدادات
CREATE POLICY "Admins can view app settings" ON app_settings FOR SELECT USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- السماح للمسؤولين فقط بتحديث الإعدادات
CREATE POLICY "Admins can update app settings" ON app_settings FOR UPDATE USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- سياسات جدول الأخطاء
-- السماح للمسؤولين فقط بعرض سجل الأخطاء
CREATE POLICY "Admins can view error logs" ON error_logs FOR SELECT USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- سياسات جدول النسخ الاحتياطية
-- السماح للمسؤولين فقط بعرض النسخ الاحتياطية
CREATE POLICY "Admins can view backups" ON backups FOR SELECT USING (
  (SELECT is_admin FROM users WHERE id = auth.uid()) = true
);

-- إضافة مشغل لتحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على الجداول ذات الحقل updated_at
CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_harvests_updated_at BEFORE UPDATE ON harvests FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- إضافة مشغل لتسجيل النشاط
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, description, ip_address, user_agent)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME || ' ' || TG_OP, 
            inet_client_addr(), http_user_agent());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المشغل على الجداول التي يجب تسجيل نشاطها
CREATE TRIGGER log_users_activity AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_subscriptions_activity AFTER INSERT OR UPDATE OR DELETE ON subscriptions FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_payments_activity AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_harvests_activity AFTER INSERT OR UPDATE OR DELETE ON harvests FOR EACH ROW EXECUTE FUNCTION log_activity();

-- إضافة مشغل لتسجيل الأخطاء
CREATE OR REPLACE FUNCTION log_error()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO error_logs (error_message, error_stack, user_id, page_url, ip_address, user_agent)
    VALUES (TG_NAME, TG_ARGV[0], auth.uid(), 
            current_setting('app.page_url', true), 
            inet_client_addr(), 
            http_user_agent());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة إعدادات افتراضية
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('app_name', 'CollectPro', 'اسم التطبيق'),
('app_version', '1.0.0', 'إصدار التطبيق'),
('default_theme', 'light', 'السمة الافتراضية للتطبيق'),
('auto_save_interval', '1000', 'فوترة الحفظ التلقائي بالميلي ثانية'),
('max_login_attempts', '5', 'العدد الأقصى لمحاولات تسجيل الدخول'),
('password_expiry_days', '90', 'عدد أيام انتهاء صلاحية كلمة المرور'),
('backup_interval', '24', 'فترة النسخ الاحتياطي بالساعات'),
('session_timeout', '3600', 'مهلة الجلسة بالثواني'),
('admin_email', 'emontal.33@gmail.com', 'البريد الإلكتروني للمسؤول')
ON CONFLICT (setting_key) DO NOTHING;

-- تحديث إعدادات المسؤول
UPDATE users SET is_admin = true WHERE email = 'emontal.33@gmail.com';
