// إعدادات CORS للسماح بالاتصال من مصادر مختلفة
// هذا الملف يمكن استيراده في واجهات API البرمجية

// إعدادات CORS الافتراضية
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // في بيئة الإنتاج، يجب تحديد المصادر المسموح بها
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// دالة لتطبيق إعدادات CORS على الاستجابة
function applyCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', corsOptions.origin);
  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  res.setHeader('Access-Control-Allow-Credentials', corsOptions.credentials.toString());
}

// دالة للتحقق من طلبات OPTIONS المسبقة
function handlePreflightRequest(req, res) {
  if (req.method === 'OPTIONS') {
    applyCorsHeaders(res);
    res.status(corsOptions.optionsSuccessStatus).end();
    return true;
  }
  return false;
}

// دالة للتحقق من مصدر الطلب
function isOriginAllowed(origin) {
  // إذا كان المصدر مسموحاً به للجميع
  if (corsOptions.origin === '*') {
    return true;
  }

  // إذا كان المصدر مصفوفة
  if (Array.isArray(corsOptions.origin)) {
    return corsOptions.origin.includes(origin);
  }

  // إذا كان المصدر دالة
  if (typeof corsOptions.origin === 'function') {
    return corsOptions.origin(origin);
  }

  // إذا كان المصدر نصاً
  return origin === corsOptions.origin;
}

// دالة وسيطة للتحقق من CORS
function corsMiddleware(req, res, next) {
  // التعامل مع طلبات OPTIONS المسبقة
  if (handlePreflightRequest(req, res)) {
    return;
  }

  // تطبيق إعدادات CORS
  applyCorsHeaders(res);

  // التحقق من مصدر الطلب إذا لم يكن مسموحاً به للجميع
  if (corsOptions.origin !== '*') {
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).json({
        success: false,
        message: 'Origin not allowed by CORS'
      });
    }
  }

  // المتابعة إلى المعالج التالي
  next();
}

// تصدير الدوال والخيارات
export { corsOptions, applyCorsHeaders, handlePreflightRequest, isOriginAllowed, corsMiddleware };

// للتوافق مع Node.js CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    corsOptions,
    applyCorsHeaders,
    handlePreflightRequest,
    isOriginAllowed,
    corsMiddleware
  };
}
