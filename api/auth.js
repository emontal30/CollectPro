// استدعاء مكتبة Supabase
const { createClient } = require('@supabase/supabase-js');

// إعدادات إعادة المحاولة
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
};

// دالة إعادة المحاولة مع backoff أسي
async function retryOperation(operation, config = RETRY_CONFIG) {
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < config.maxRetries && (error.code === 'PGRST301' || error.message?.includes('timeout'))) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
        console.warn(`Database operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

// إنشاء عميل Supabase مع إعدادات محسنة
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    },
    global: {
      headers: {
        'x-application-name': 'collectpro-api'
      }
    }
  }
);

// المعالج الأساسي
module.exports = async function handler(req, res) {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'login':
        return await handleLogin(req, res);
      case 'register':
        return await handleRegister(req, res);
      case 'logout':
        return await handleLogout(req, res);
      case 'reset-password':
        return await handleResetPassword(req, res);
      case 'verify-token':
        return await handleVerifyToken(req, res);
      default:
        return res.status(400).json({
          success: false,
          message: 'Action not supported'
        });
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ======================== الدوال ======================== //

// تسجيل الدخول
async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ success: false, message: error.message });

    // استخدام إعادة المحاولة لجلب بيانات المستخدم
    const userData = await retryOperation(async () => {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) throw userError;
      return userData;
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: userData?.full_name || data.user.user_metadata?.full_name || '',
        avatar_url: userData?.avatar_url || data.user.user_metadata?.avatar_url || '',
        phone: userData?.phone || data.user.user_metadata?.phone || '',
        is_verified: data.user.email_confirmed_at !== null,
        is_admin: userData?.is_admin || data.user.user_metadata?.is_admin || false,
        created_at: data.user.created_at
      },
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred during login' });
  }
}

// تسجيل مستخدم جديد
async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { email, password, fullName, phone } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '', phone: phone || '' } }
    });

    if (error) return res.status(400).json({ success: false, message: error.message });

    if (data.user) {
      // استخدام إعادة المحاولة لإدراج بيانات المستخدم
      await retryOperation(async () => {
        const { error: insertError } = await supabase.from('users').insert([{
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || '',
          phone: phone || '',
          is_verified: false,
          is_admin: false
        }]);

        if (insertError) throw insertError;
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: data.user
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred during registration' });
  }
}

// تسجيل الخروج
async function handleLogout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  try {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred during logout' });
  }
}

// إعادة تعيين كلمة المرور
async function handleResetPassword(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.HOSTING_DOMAIN || ''}/reset-password.html`
    });
    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while sending password reset email' });
  }
}

// التحقق من التوكن
async function handleVerifyToken(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return res.status(401).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, user: data.user });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred during token verification' });
  }
}
