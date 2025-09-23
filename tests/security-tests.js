// ========== اختبارات الأمان ========== //

class SecurityTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  // تشغيل جميع اختبارات الأمان
  async runTests() {
    console.log('🔒 اختبارات الأمان...\n');

    const tests = [
      this.testEnvironmentVariables,
      this.testCorsConfiguration,
      this.testErrorHandling,
      this.testInputValidation,
      this.testAuthenticationSecurity,
      this.testFilePermissions
    ];

    for (const test of tests) {
      await this.runTest(test);
    }

    return this.results;
  }

  // تشغيل اختبار واحد
  async runTest(testFunction) {
    try {
      const result = await testFunction.call(this);
      this.results.total++;

      if (result.passed) {
        this.results.passed++;
        console.log(`✅ ${result.name}`);
      } else {
        this.results.failed++;
        console.log(`❌ ${result.name}: ${result.message}`);
        this.results.errors.push({
          test: result.name,
          message: result.message
        });
      }
    } catch (error) {
      this.results.total++;
      this.results.failed++;
      console.log(`❌ ${testFunction.name}: ${error.message}`);
      this.results.errors.push({
        test: testFunction.name,
        message: error.message
      });
    }
  }

  // اختبار متغيرات البيئة
  async testEnvironmentVariables() {
    const fs = require('fs');
    const path = require('path');

    // التحقق من وجود .env.example
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      return { name: 'Environment Variables', passed: false, message: '.env.example file missing' };
    }

    const content = fs.readFileSync(envExamplePath, 'utf8');

    // التحقق من عدم وجود قيم حقيقية
    const hasRealValues = /YOUR_SUPABASE_URL_HERE|YOUR_SUPABASE_ANON_KEY_HERE|your_csrf_secret_here/.test(content);
    if (hasRealValues) {
      return { name: 'Environment Variables', passed: false, message: 'Contains real credentials in .env.example' };
    }

    // التحقق من وجود تحذيرات الأمان
    const hasSecurityWarning = content.includes('لا تشارك هذا الملف') || content.includes('استبدل القيم الفعلية');
    if (!hasSecurityWarning) {
      return { name: 'Environment Variables', passed: false, message: 'Missing security warnings' };
    }

    return { name: 'Environment Variables', passed: true };
  }

  // اختبار إعدادات CORS
  async testCorsConfiguration() {
    const fs = require('fs');
    const path = require('path');

    const corsPath = path.join(process.cwd(), 'cors.js');
    if (!fs.existsSync(corsPath)) {
      return { name: 'CORS Configuration', passed: false, message: 'cors.js file missing' };
    }

    const content = fs.readFileSync(corsPath, 'utf8');

    // التحقق من وجود rate limiting
    const hasRateLimit = content.includes('checkRateLimit') && content.includes('MAX_REQUESTS_PER_MINUTE');
    if (!hasRateLimit) {
      return { name: 'CORS Configuration', passed: false, message: 'Missing rate limiting' };
    }

    // التحقق من وجود التحقق من المصادر
    const hasOriginValidation = content.includes('isOriginAllowed') && content.includes('CORS_ALLOWED_ORIGINS');
    if (!hasOriginValidation) {
      return { name: 'CORS Configuration', passed: false, message: 'Missing origin validation' };
    }

    return { name: 'CORS Configuration', passed: true };
  }

  // اختبار معالجة الأخطاء
  async testErrorHandling() {
    const fs = require('fs');
    const path = require('path');

    const errorLoggerPath = path.join(process.cwd(), 'error-logger.js');
    if (!fs.existsSync(errorLoggerPath)) {
      return { name: 'Error Handling', passed: false, message: 'error-logger.js file missing' };
    }

    const content = fs.readFileSync(errorLoggerPath, 'utf8');

    // التحقق من وجود rate limiting للأخطاء
    const hasErrorRateLimit = content.includes('MAX_ERRORS_PER_MINUTE') && content.includes('errorRateMap');
    if (!hasErrorRateLimit) {
      return { name: 'Error Handling', passed: false, message: 'Missing error rate limiting' };
    }

    // التحقق من وجود التحقق من المدخلات
    const hasInputValidation = content.includes('typeof error') && content.includes('error.message');
    if (!hasInputValidation) {
      return { name: 'Error Handling', passed: false, message: 'Missing input validation' };
    }

    return { name: 'Error Handling', passed: true };
  }

  // اختبار التحقق من المدخلات
  async testInputValidation() {
    const fs = require('fs');
    const path = require('path');

    const authPath = path.join(process.cwd(), 'api', 'auth.js');
    if (!fs.existsSync(authPath)) {
      return { name: 'Input Validation', passed: false, message: 'auth.js API file missing' };
    }

    const content = fs.readFileSync(authPath, 'utf8');

    // التحقق من وجود التحقق من المدخلات في تسجيل الدخول
    const hasLoginValidation = content.includes('!email || !password') && content.includes('Email and password are required');
    if (!hasLoginValidation) {
      return { name: 'Input Validation', passed: false, message: 'Missing login input validation' };
    }

    return { name: 'Input Validation', passed: true };
  }

  // اختبار أمان المصادقة
  async testAuthenticationSecurity() {
    const fs = require('fs');
    const path = require('path');

    const serverPath = path.join(process.cwd(), 'server.js');
    if (!fs.existsSync(serverPath)) {
      return { name: 'Authentication Security', passed: false, message: 'server.js file missing' };
    }

    const content = fs.readFileSync(serverPath, 'utf8');

    // التحقق من وجود helmet
    const hasHelmet = content.includes('helmet(') && content.includes('contentSecurityPolicy');
    if (!hasHelmet) {
      return { name: 'Authentication Security', passed: false, message: 'Missing security headers (helmet)' };
    }

    return { name: 'Authentication Security', passed: true };
  }

  // اختبار صلاحيات الملفات
  async testFilePermissions() {
    const fs = require('fs');
    const path = require('path');

    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      return { name: 'File Permissions', passed: false, message: '.gitignore file missing' };
    }

    const content = fs.readFileSync(gitignorePath, 'utf8');

    // التحقق من تجاهل الملفات الحساسة (vercel.json يجب أن يكون متاحاً للنشر)
    const sensitiveFiles = ['.env', '*.log'];
    const deploymentFiles = ['vercel.json']; // هذه يجب أن تكون متاحة للنشر

    const sensitiveIgnored = sensitiveFiles.every(file => content.includes(file));
    const deploymentNotIgnored = deploymentFiles.every(file => !content.includes(file));

    if (!sensitiveIgnored || !deploymentNotIgnored) {
      return { name: 'File Permissions', passed: false, message: 'File permissions not configured correctly' };
    }

    return { name: 'File Permissions', passed: true };
  }
}

// تصدير الدالة الرئيسية
async function runTests() {
  const tester = new SecurityTester();
  return await tester.runTests();
}

module.exports = { runTests };