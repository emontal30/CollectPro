// ==================== إعدادات شبكة توصيل المحتوى (CDN) ==================== //

// إعدادات CDN الافتراضية
const cdnConfig = {
  enabled:
    (typeof process !== "undefined" &&
      process.env &&
      process.env.CDN_ENABLED === "true") || false,

  baseUrl:
    (typeof process !== "undefined" &&
      process.env &&
      process.env.CDN_URL) || "https://cdn.yourdomain.com",

  // قائمة الملفات التي سيتم تحميلها من CDN
  files: [
    "css/*.css",
    "js/*.js",
    "images/*",
    "fonts/*",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.svg",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.eot"
  ],

  // قائمة الملفات التي لن يتم تحميلها من CDN
  exclude: [
    "index.html",
    "login.html",
    "admin.html",
    "my-subscription.html",
    "payment.html",
    "subscriptions.html",
    "reset-password.html",
    "register.html"
  ],

  // إعدادات التخزين المؤقت
  cache: {
    maxAge: 30, // بالأيام
    longTerm: ["*.woff", "*.woff2", "*.ttf", "*.eot", "*.jpg", "*.jpeg", "*.png", "*.gif", "*.svg"],
    longTermMaxAge: 365 // بالأيام
  }
};

// ==================== دوال المساعدة ==================== //

// تحويل pattern إلى Regex
function patternToRegex(pattern) {
  return new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
}

// الحصول على رابط CDN لملف معين
function getCDNUrl(filePath) {
  if (!cdnConfig.enabled) return filePath;

  // تحقق من الاستثناءات
  const isExcluded = cdnConfig.exclude.some(pattern =>
    patternToRegex(pattern).test(filePath)
  );
  if (isExcluded) return filePath;

  // تحقق من الملفات المسموحة
  const isIncluded = cdnConfig.files.some(pattern =>
    patternToRegex(pattern).test(filePath)
  );
  if (!isIncluded) return filePath;

  const normalizedPath = filePath.startsWith("/")
    ? filePath.substring(1)
    : filePath;

  return `${cdnConfig.baseUrl}/${normalizedPath}`;
}

// تحديث الروابط في HTML لاستخدام CDN
function updateHTMLForCDN() {
  if (!cdnConfig.enabled || typeof document === "undefined") return;

  // CSS
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute("href");
    if (href && !href.includes("://") && !href.startsWith("data:")) {
      link.setAttribute("href", getCDNUrl(href));
    }
  });

  // JavaScript
  document.querySelectorAll("script[src]").forEach(script => {
    const src = script.getAttribute("src");
    if (src && !src.includes("://") && !src.startsWith("data:")) {
      script.setAttribute("src", getCDNUrl(src));
    }
  });

  // Images
  document.querySelectorAll("img[src]").forEach(img => {
    const src = img.getAttribute("src");
    if (src && !src.includes("://") && !src.startsWith("data:")) {
      img.setAttribute("src", getCDNUrl(src));
    }
  });

  // الخطوط داخل CSS لازم تتحدث من خلال build tool (زي Webpack/Vite)
}

// إنشاء رؤوس التخزين المؤقت
function getCacheHeaders(filePath) {
  if (!cdnConfig.enabled) return {};

  let headers = {
    "Cache-Control": `public, max-age=${
      cdnConfig.cache.maxAge * 24 * 60 * 60
    }`
  };

  const isLongTerm = cdnConfig.cache.longTerm.some(pattern =>
    patternToRegex(pattern).test(filePath)
  );
  if (isLongTerm) {
    headers["Cache-Control"] = `public, max-age=${
      cdnConfig.cache.longTermMaxAge * 24 * 60 * 60
    }, immutable`;
  }

  return headers;
}

// تهيئة CDN عند تحميل الصفحة
function initializeCDN() {
  if (!cdnConfig.enabled) {
    console.log("⚠️ CDN is disabled");
    return;
  }

  updateHTMLForCDN();
  console.log("✅ CDN initialized with base URL:", cdnConfig.baseUrl);
}

// ==================== تصدير ==================== //
export { cdnConfig, getCDNUrl, updateHTMLForCDN, getCacheHeaders, initializeCDN };

// للتوافق مع Node.js CommonJS
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cdnConfig,
    getCDNUrl,
    updateHTMLForCDN,
    getCacheHeaders,
    initializeCDN
  };
}

// تهيئة CDN عند تحميل الصفحة
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initializeCDN);
}
