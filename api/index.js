// واجهة برمجية رئيسية للتحقق من حالة الخدمة

export default async function handler(req, res) {
  try {
    // استخدام Supabase من الكائن العام
    const supabase = global.supabase;

    // التحقق من حالة الاتصال بقاعدة البيانات
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      status: 'ok',
      message: 'CollectPro API is running',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database',
      error: error.message
    });
  }
}
