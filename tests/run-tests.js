// ========== مشغل الاختبارات الرئيسي ========== //

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  // تشغيل جميع الاختبارات
  async runAllTests() {
    console.log('🚀 بدء تشغيل جميع الاختبارات...\n');

    const testFiles = [
      'security-tests.js',
      'performance-tests.js',
      'functional-tests.js'
    ];

    for (const testFile of testFiles) {
      await this.runTestFile(testFile);
    }

    this.printSummary();
  }

  // تشغيل ملف اختبار معين
  async runTestFile(filename) {
    const filePath = path.join(__dirname, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ملف الاختبار غير موجود: ${filename}`);
      return;
    }

    console.log(`📋 تشغيل ${filename}...`);

    try {
      const testModule = require(filePath);
      if (testModule.runTests) {
        const results = await testModule.runTests();
        this.mergeResults(results);
      }
    } catch (error) {
      console.error(`❌ خطأ في ${filename}:`, error.message);
      this.results.errors.push({
        file: filename,
        error: error.message
      });
    }
  }

  // دمج نتائج الاختبار
  mergeResults(results) {
    this.results.total += results.total || 0;
    this.results.passed += results.passed || 0;
    this.results.failed += results.failed || 0;

    if (results.errors) {
      this.results.errors.push(...results.errors);
    }
  }

  // طباعة ملخص النتائج
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 ملخص نتائج الاختبارات');
    console.log('='.repeat(50));

    console.log(`إجمالي الاختبارات: ${this.results.total}`);
    console.log(`✅ نجح: ${this.results.passed}`);
    console.log(`❌ فشل: ${this.results.failed}`);

    const successRate = this.results.total > 0 ?
      ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;

    console.log(`📈 معدل النجاح: ${successRate}%`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ الأخطاء:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.file}: ${error.error}`);
      });
    }

    console.log('\n' + (this.results.failed === 0 ? '🎉 جميع الاختبارات نجحت!' : '⚠️  بعض الاختبارات فشلت'));
  }
}

// تشغيل الاختبارات
async function main() {
  const runner = new TestRunner();
  await runner.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestRunner;