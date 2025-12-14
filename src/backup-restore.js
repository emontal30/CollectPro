// أداة تصدير واستيراد البيانات لـ CollectPro
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import logger from './utils/logger.js';

const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_BACKUP = [
  'users',
  'subscription_plans',
  'subscriptions',
  'archive_dates',
  'archive_data',
  'statistics'
];

const BACKUP_DIR = './backups';

/**
 * إنشاء مجلد النسخ الاحتياطي إذا لم يكن موجوداً
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info('✅ تم إنشاء مجلد النسخ الاحتياطي');
  }
}

/**
 * تصدير بيانات جدول معين
 */
async function exportTable(tableName) {
  try {
    logger.info(`📤 جاري تصدير جدول: ${tableName}`);

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      logger.error(`❌ خطأ في تصدير ${tableName}:`, error);
      return null;
    }

    logger.info(`✅ تم تصدير ${data.length} سجل من ${tableName}`);
    return data;
  } catch (error) {
    logger.error(`❌ خطأ في تصدير ${tableName}:`, error);
    return null;
  }
}

/**
 * تصدير جميع البيانات
 */
async function exportAllData() {
  logger.info('🚀 بدء عملية التصدير...');

  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `collectpro-backup-${timestamp}.json`);

  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    tables: {}
  };

  for (const tableName of TABLES_TO_BACKUP) {
    const data = await exportTable(tableName);
    if (data !== null) {
      backupData.tables[tableName] = data;
    }
  }

  // حفظ الملف
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  logger.info(`💾 تم حفظ النسخة الاحتياطية في: ${backupFile}`);

  // إنشاء ملف أحدث
  const latestFile = path.join(BACKUP_DIR, 'latest-backup.json');
  fs.writeFileSync(latestFile, JSON.stringify(backupData, null, 2));
  logger.info(`🔄 تم تحديث الملف الأحدث: ${latestFile}`);

  return backupFile;
}

/**
 * استيراد بيانات جدول معين
 */
async function importTable(tableName, data) {
  if (!data || data.length === 0) {
    logger.warn(`⚠️ لا توجد بيانات للاستيراد في جدول: ${tableName}`);
    return;
  }

  try {
    logger.info(`📥 جاري استيراد ${data.length} سجل إلى جدول: ${tableName}`);

    // تقسيم البيانات إلى دفعات لتجنب مشاكل الأداء
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const { error } = await supabase
        .from(tableName)
        .insert(batch);

      if (error) {
        logger.error(`❌ خطأ في استيراد دفعة ${Math.floor(i/batchSize) + 1} من ${tableName}:`, error);
        // المتابعة مع الدفعة التالية بدلاً من التوقف
        continue;
      }

      imported += batch.length;
      logger.info(`✅ تم استيراد دفعة ${Math.floor(i/batchSize) + 1} (${batch.length} سجل)`);
    }

    logger.info(`✅ تم استيراد ${imported} سجل من أصل ${data.length} في ${tableName}`);

  } catch (error) {
    logger.error(`❌ خطأ في استيراد ${tableName}:`, error);
  }
}

/**
 * استيراد جميع البيانات
 */
async function importAllData(backupFile) {
  logger.info('🚀 بدء عملية الاستيراد...');

  if (!fs.existsSync(backupFile)) {
    logger.error(`❌ ملف النسخة الاحتياطية غير موجود: ${backupFile}`);
    return;
  }

  try {
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    logger.info(`📅 تاريخ النسخة الاحتياطية: ${backupData.timestamp}`);
    logger.info(`🏷️ الإصدار: ${backupData.version}`);

    // ترتيب الجداول حسب التبعيات
    const importOrder = [
      'subscription_plans', // أولاً
      'users',             // ثانياً
      'subscriptions',     // ثالثاً (يعتمد على الخطط والمستخدمين)
      'archive_dates',     // رابعاً
      'archive_data',      // خامساً
      'statistics'         // أخيراً
    ];

    for (const tableName of importOrder) {
      if (backupData.tables[tableName]) {
        await importTable(tableName, backupData.tables[tableName]);
        } else {
        logger.warn(`⚠️ جدول ${tableName} غير موجود في النسخة الاحتياطية`);
      }
    }

    logger.info('✅ تم الانتهاء من عملية الاستيراد');

  } catch (error) {
    logger.error('❌ خطأ في قراءة ملف النسخة الاحتياطية:', error);
  }
}

/**
 * عرض قائمة النسخ الاحتياطية المتاحة
 */
function listBackups() {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.endsWith('.json') && file.includes('backup'))
    .map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        size: (stats.size / 1024).toFixed(2) + ' KB',
        modified: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.modified) - new Date(a.modified));

  logger.info('📋 النسخ الاحتياطية المتاحة:');
  files.forEach((file, index) => {
    logger.info(`${index + 1}. ${file.name} (${file.size}) - ${file.modified}`);
  });

  return files;
}

/**
 * تنظيف النسخ الاحتياطية القديمة (احتفاظ بـ 10 أحدث فقط)
 */
function cleanupOldBackups() {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.endsWith('.json') && file.includes('backup') && !file.includes('latest'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      stats: fs.statSync(path.join(BACKUP_DIR, file))
    }))
    .sort((a, b) => b.stats.mtime - a.stats.mtime);

    if (files.length > 10) {
    const toDelete = files.slice(10);
    logger.info(`🧹 حذف ${toDelete.length} نسخة احتياطية قديمة...`);

    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      logger.info(`🗑️ تم حذف: ${file.name}`);
    });
  }
}

/**
 * الاستخدام من سطر الأوامر
 */
async function main() {
  const command = process.argv[2];
  const fileArg = process.argv[3];

  switch (command) {
    case 'export':
      await exportAllData();
      cleanupOldBackups();
      break;

    case 'import':
      const fileToImport = fileArg || path.join(BACKUP_DIR, 'latest-backup.json');
      await importAllData(fileToImport);
      break;

    case 'list':
      listBackups();
      break;

    case 'cleanup':
      cleanupOldBackups();
      break;

    default:
      logger.info('💡 استخدام:');
      logger.info('  node backup-restore.js export          # تصدير البيانات');
      logger.info('  node backup-restore.js import [file]    # استيراد البيانات');
      logger.info('  node backup-restore.js list             # عرض النسخ الاحتياطية');
      logger.info('  node backup-restore.js cleanup          # تنظيف النسخ القديمة');
      break;
  }
}

// تشغيل إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => logger.error(err));
}

export {
  exportAllData,
  importAllData,
  listBackups,
  cleanupOldBackups
};