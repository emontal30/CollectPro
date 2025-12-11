#!/usr/bin/env node

/**
 * فحص نظام الرسائل الموحد
 * يتحقق من الامتثال للمعايير الموضوعة
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 بدء فحص نظام الرسائل الموحد...\n');

const srcDir = path.join(__dirname, 'src');
let violations = [];
let approved = [];

// الملفات المسموحة بالتحقق منها
const filesToCheck = [
  'components/views/HarvestView.vue',
  'components/views/DashboardView.vue',
  'components/views/CounterView.vue',
  'components/RegisteredUsers.vue',
  'components/views/AdminView.vue',
  'components/layout/Sidebar.vue'
];

// رسائل محذورة
const bannedMessages = [
  'صفحة.*جاهزة للاستخدام',
  'تم تحميل.*من صفحة',
  'تم تحميل صفحة',
];

// فحص الملفات
filesToCheck.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  الملف غير موجود: ${file}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // البحث عن رسائل محذورة
  bannedMessages.forEach(pattern => {
    const regex = new RegExp(pattern, 'gi');
    const matches = content.match(regex);
    if (matches) {
      violations.push({
        file,
        pattern,
        matches: matches.length
      });
    }
  });

  // التحقق من استخدام النظام الموحد
  if (content.includes("addNotification") || 
      content.includes("messages.") || 
      content.includes("confirm()")) {
    approved.push(file);
  }
});

// الإبلاغ
console.log('\n=== 📊 النتائج ===\n');

if (violations.length === 0) {
  console.log('✅ لا توجد رسائل محذورة!');
} else {
  console.log(`❌ تم العثور على ${violations.length} انتهاكات:\n`);
  violations.forEach(v => {
    console.log(`  📍 ${v.file}`);
    console.log(`     النمط: "${v.pattern}"`);
    console.log(`     العدد: ${v.matches}`);
  });
}

console.log(`\n✅ الملفات المتوافقة: ${approved.length}/${filesToCheck.length}\n`);

// خلاصة
if (violations.length === 0) {
  console.log('🎉 جميع الملفات متوافقة مع معايير النظام الموحد!');
} else {
  console.log('⚠️  يتطلب إصلاح بعض الانتهاكات');
}

console.log('\n✨ انتهى الفحص\n');
