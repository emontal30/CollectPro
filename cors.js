// إعدادات CORS الآمنة لتطبيق CollectPro
// ====================================

// إعدادات CORS الآمنة
const corsOptions = {
  // في بيئة الإنتاج، يجب تحديد المصادر المسموح بها بشكل صريح
  origin: process.env.CORS_ALLOWED_ORIGINS ?
          process.env.CORS_ALLOWED_ORIGINS.split(',') :
          ['http://localhost:5000', 'https://yourdomain.com'],
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// خريطة لتتبع عدد الطلبات لكل أصل (لمنع إساءة الاستخدام)
const requestCounts = new Map();

// دالة لتطبيق إعدادات CORS على الاستجابة
function applyCorsHeaders(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  res.setHeader('Access-Control-Allow-Credentials', corsOptions.credentials.toString());
}

// دالة للتحقق من طلبات OPTIONS المسبقة
function handlePreflightRequest(req, res) {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
      applyCorsHeaders(res, origin);
      res.status(corsOptions.optionsSuccessStatus).end();
      return true;
    }
    // رفض طلبات OPTIONS من مصادر غير مسموحة
    res.status(403).end();
    return true;
  }
  return false;
}

// دالة للتحقق من مصدر الطلب
function isOriginAllowed(origin) {
  return corsOptions.origin.includes(origin);
}

// دالة للتحقق من معدل الطلبات
function checkRateLimit(origin) {
  const MAX_REQUESTS_PER_MINUTE = 100;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  if (!requestCounts.has(origin)) {
    requestCounts.set(origin, []);
  }

  const requests = requestCounts.get(origin).filter(timestamp => timestamp > oneMinuteAgo);
  requests.push(now);
  requestCounts.set(origin, requests);

  return requests.length <= MAX_REQUESTS_PER_MINUTE;
}

// دالة وسيطة للتحقق من CORS
function corsMiddleware(req, res, next) {
  // التعامل مع طلبات OPTIONS المسبقة
  if (handlePreflightRequest(req, res)) {
    return;
  }

  const origin = req.headers.origin;
  
  // التحقق من وجود مصدر الطلب
  if (!origin) {
    return res.status(400).json({
      success: false,
      message: 'Origin header is missing'
    });
  }

  // التحقق من أن المصدر مسموح به
  if (!isOriginAllowed(origin)) {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed by CORS'
    });
  }

  // التحقق من معدل الطلبات
  if (!checkRateLimit(origin)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests'
    });
  }

  // تطبيق إعدادات CORS
  applyCorsHeaders(res, origin);

  // المتابعة إلى المعالج التالي
  next();
}

// تصدير الدوال والخيارات
export { corsOptions, corsMiddleware };

// للتوافق مع Node.js CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    corsOptions,
    corsMiddleware
  };
}
