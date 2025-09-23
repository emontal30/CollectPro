// ==================== إعدادات التطبيق ==================== //
const config = {
  // إعدادات Supabase
  supabase: {
    url:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.SUPABASE_URL) ||
      "https://altnvsolaqphpndyztup.supabase.co",

    // مفتاح عام (anon key) - آمن للاستخدام في المتصفح
    anonKey:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.SUPABASE_ANON_KEY) ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },

  // إعدادات التطبيق
  app: {
    name: "CollectPro",
    version: "1.0.0",
    defaultTheme: "light",
    autoSaveInterval: 1000,
    debounceInterval: 100,

    // إعدادات الأمان
    security: {
      maxLoginAttempts: 5,
      passwordExpiryDays: 90,
      sessionTimeout: 3600,
      enableTwoFactor: true,
      requirePasswordChange: false
    },

    // إعدادات الأداء
    performance: {
      enableCaching: true,
      cacheTimeout: 300000,
      enableLazyLoading: true,
      enableImageOptimization: true
    },

    // إعدادات النسخ الاحتياطي
    backup: {
      enabled: true,
      interval: 24,
      maxBackups: 30
    }
  },

  // إعدادات Google OAuth
  google: {
    enabled: true,
    clientId:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.GOOGLE_CLIENT_ID) ||
      "YOUR_GOOGLE_CLIENT_ID_HERE",
    scopes: ["email", "profile"]
  },

  // إعدادات البريد الإلكتروني
  email: {
    enabled: true,
    service:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.EMAIL_SERVICE) ||
      "YOUR_EMAIL_SERVICE_HERE",
    apiKey:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.EMAIL_API_KEY) ||
      "YOUR_EMAIL_API_KEY_HERE",
    from:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.EMAIL_FROM) ||
      "noreply@yourdomain.com"
  },

  // إعدادات الاستضافة
  hosting: {
    domain:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.HOSTING_DOMAIN) ||
      "yourdomain.com",
    apiEndpoint:
      (typeof process !== "undefined" &&
        process.env &&
        process.env.API_ENDPOINT) ||
      "/api",
    cdnEnabled: true
  }
};

// ==================== دوال مساعدة ==================== //

// الحصول على قيمة إعداد
function getConfig(key) {
  const keys = key.split(".");
  let value = config;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return value;
}

// تعديل قيمة إعداد
function setConfig(key, value) {
  const keys = key.split(".");
  const lastKey = keys.pop();
  let target = config;

  for (const k of keys) {
    if (!target[k] || typeof target[k] !== "object") {
      target[k] = {};
    }
    target = target[k];
  }

  target[lastKey] = value;
}

// ==================== تصدير ==================== //
window.config = config;
window.getConfig = getConfig;
window.setConfig = setConfig;
