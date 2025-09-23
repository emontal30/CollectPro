// ========== اختبارات الوظائف ========== //

class FunctionalTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  // تشغيل جميع الاختبارات الوظيفية
  async runTests() {
    console.log('🔧 اختبارات الوظائف...\n');

    const tests = [
      this.testServerConfiguration,
      this.testApiEndpoints,
      this.testDatabaseConnection,
      this.testStaticFiles
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

  // اختبار إعدادات الخادم
  async testServerConfiguration() {
    const fs = require('fs');
    const path = require('path');

    const serverPath = path.join(process.cwd(), 'server.js');
    if (!fs.existsSync(serverPath)) {
      return { name: 'Server Configuration', passed: false, message: 'server.js file missing' };
    }

    const content = fs.readFileSync(serverPath, 'utf8');

    // التحقق من وجود إعادة المحاولة
    const hasRetry = content.includes('retryOperation') && content.includes('maxRetries');
    if (!hasRetry) {
      return { name: 'Server Configuration', passed: false, message: 'Missing retry mechanism' };
    }

    // التحقق من وجود معالجة الأخطاء
    const hasErrorHandling = content.includes('sendError') && content.includes('error.message');
    if (!hasErrorHandling) {
      return { name: 'Server Configuration', passed: false, message: 'Missing error handling' };
    }

    return { name: 'Server Configuration', passed: true };
  }

  // اختبار نقاط النهاية للـ API
  async testApiEndpoints() {
    const fs = require('fs');
    const path = require('path');

    const apiDir = path.join(process.cwd(), 'api');
    if (!fs.existsSync(apiDir)) {
      return { name: 'API Endpoints', passed: false, message: 'api directory missing' };
    }

    const apiFiles = fs.readdirSync(apiDir).filter(file => file.endsWith('.js'));
    const requiredApis = ['auth.js', 'payments.js', 'index.js'];

    const missingApis = requiredApis.filter(api => !apiFiles.includes(api));
    if (missingApis.length > 0) {
      return { name: 'API Endpoints', passed: false, message: `Missing API files: ${missingApis.join(', ')}` };
    }

    return { name: 'API Endpoints', passed: true };
  }

  // اختبار اتصال قاعدة البيانات
  async testDatabaseConnection() {
    const fs = require('fs');
    const path = require('path');

    const apiIndexPath = path.join(process.cwd(), 'api', 'index.js');
    if (!fs.existsSync(apiIndexPath)) {
      return { name: 'Database Connection', passed: false, message: 'api/index.js file missing' };
    }

    const content = fs.readFileSync(apiIndexPath, 'utf8');

    // التحقق من وجود اختبار الاتصال
    const hasConnectionTest = content.includes('supabase.from') && content.includes('select');
    if (!hasConnectionTest) {
      return { name: 'Database Connection', passed: false, message: 'Missing database connection test' };
    }

    return { name: 'Database Connection', passed: true };
  }

  // اختبار الملفات الثابتة
  async testStaticFiles() {
    const fs = require('fs');
    const path = require('path');

    const requiredFiles = [
      'index.html',
      'login.html',
      'style.css',
      'script.js'
    ];

    const missingFiles = requiredFiles.filter(file => {
      const filePath = path.join(process.cwd(), file);
      return !fs.existsSync(filePath);
    });

    if (missingFiles.length > 0) {
      return { name: 'Static Files', passed: false, message: `Missing static files: ${missingFiles.join(', ')}` };
    }

    return { name: 'Static Files', passed: true };
  }
}

// تصدير الدالة الرئيسية
async function runTests() {
  const tester = new FunctionalTester();
  return await tester.runTests();
}

module.exports = { runTests };