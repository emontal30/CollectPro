// ========== حماية CSRF ========== //

// إنشاء رمز CSRF عشوائي
function generateCSRFToken() {
  const array = new Uint32Array(4);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => dec.toString(16).padStart(8, '0')).join('');
}

// الحصول على رمز CSRF من الكوكي
function getCSRFToken() {
  const name = 'csrf_token';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// تعيين رمز CSRF جديد في الكوكي
function setCSRFToken() {
  const token = generateCSRFToken();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 1); // انتهاء الصلاحية بعد يوم واحد

  document.cookie = `csrf_token=${token}; expires=${expiry.toUTCString()}; path=/; SameSite=Strict`;
  return token;
}

// التأكد من وجود رمز CSRF
function ensureCSRFToken() {
  return getCSRFToken() || setCSRFToken();
}

// إضافة رمز CSRF في الرؤوس
function addCSRFHeader(options = {}) {
  const token = ensureCSRFToken();
  if (!options.headers) options.headers = {};
  options.headers['X-CSRF-Token'] = token;
  return options;
}

// التحقق من صحة رمز CSRF
function validateCSRFToken(requestToken) {
  const storedToken = getCSRFToken();
  if (!storedToken || requestToken !== storedToken) {
    console.error('❌ فشل التحقق من CSRF');
    return false;
  }
  return true;
}

// ===== تعديل fetch =====
const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
  // تجاهل الروابط الخارجية
  if (url.includes('://') && !url.startsWith(window.location.origin)) {
    return originalFetch.call(this, url, options);
  }

  const securedOptions = addCSRFHeader(options);
  return originalFetch.call(this, url, securedOptions).then(response => {
    if (response.status === 403) {
      console.error('🚫 تم رفض الطلب بسبب CSRF');
    }
    return response;
  });
};

// ===== تعديل XMLHttpRequest =====
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...args) {
  this._csrfUrl = url;
  return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function (data) {
  if (
    this._csrfUrl &&
    (!this._csrfUrl.includes('://') ||
      this._csrfUrl.startsWith(window.location.origin))
  ) {
    const token = ensureCSRFToken();
    try {
      this.setRequestHeader('X-CSRF-Token', token);
    } catch (e) {
      console.warn('⚠️ لم يتمكن من تعيين رأس CSRF:', e);
    }
  }
  return originalXHRSend.apply(this, arguments);
};

// ===== تعديل FormData =====
const originalFormDataAppend = FormData.prototype.append;
FormData.prototype.append = function (name, value, filename) {
  // إضافة حقل CSRF إذا لم يكن موجود
  if (name === 'csrf_token') {
    value = ensureCSRFToken();
  }
  return originalFormDataAppend.call(this, name, value, filename);
};

// ===== تهيئة عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', () => {
  const token = ensureCSRFToken();

  // إضافة حقل مخفي CSRF لكل النماذج
  document.querySelectorAll('form').forEach(form => {
    let csrfField = form.querySelector('input[name="csrf_token"]');
    if (!csrfField) {
      csrfField = document.createElement('input');
      csrfField.type = 'hidden';
      csrfField.name = 'csrf_token';
      form.appendChild(csrfField);
    }
    csrfField.value = token;
  });
});

// تصدير الوحدة
window.CSRFProtection = {
  generateCSRFToken,
  getCSRFToken,
  setCSRFToken,
  ensureCSRFToken,
  addCSRFHeader,
  validateCSRFToken
};
