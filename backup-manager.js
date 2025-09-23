// ========== مدير النسخ الاحتياطي ========== //

// إنشاء نسخة احتياطية من التطبيق
async function createBackup(type = 'full') {
  try {
    const config = window.AppConfig || {};
    const supabaseUrl = config.supabase?.url;
    const supabaseAnonKey = config.supabase?.anonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }

    // إنشاء بيانات النسخة الاحتياطية
    const backupData = {
      type: type,
      timestamp: new Date().toISOString(),
      version: config.app?.version || '1.0.0',
      data: {}
    };

    // الحصول على بيانات المستخدمين
    try {
      const { data: users, error: usersError } = await fetch(`${supabaseUrl}/rest/v1/users`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }).then(res => res.json());

      if (!usersError) {
        backupData.data.users = users;
      }
    } catch (e) {
      console.error('فشل نسخ المستخدمين:', e);
    }

    // الحصول على بيانات الاشتراكات
    try {
      const { data: subscriptions, error: subscriptionsError } = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }).then(res => res.json());

      if (!subscriptionsError) {
        backupData.data.subscriptions = subscriptions;
      }
    } catch (e) {
      console.error('فشل نسخ الاشتراكات:', e);
    }

    // الحصول على بيانات التحصيلات
    try {
      const { data: harvests, error: harvestsError } = await fetch(`${supabaseUrl}/rest/v1/harvests`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }).then(res => res.json());

      if (!harvestsError) {
        backupData.data.harvests = harvests;
      }
    } catch (e) {
      console.error('فشل نسخ التحصيلات:', e);
    }

    // الحصول على بيانات المدفوعات
    try {
      const { data: payments, error: paymentsError } = await fetch(`${supabaseUrl}/rest/v1/payments`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }).then(res => res.json());

      if (!paymentsError) {
        backupData.data.payments = payments;
      }
    } catch (e) {
      console.error('فشل نسخ المدفوعات:', e);
    }

    // تحويل البيانات إلى نص JSON
    const backupContent = JSON.stringify(backupData, null, 2);

    // حساب حجم النسخة الاحتياطية
    const fileSize = new Blob([backupContent]).size;

    // إنشاء اسم للملف
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `collectpro-backup-${type}-${timestamp}.json`;

    // حفظ النسخة الاحتياطية في قاعدة البيانات
    const response = await fetch(`${supabaseUrl}/rest/v1/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        backup_type: type,
        file_path: fileName,
        file_size: fileSize,
        status: 'created'
      })
    });

    if (!response.ok) {
      throw new Error('فشل حفظ سجل النسخة الاحتياطية');
    }

    // عرض تنزيل النسخة الاحتياطية
    const blob = new Blob([backupContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: 'تم إنشاء النسخة الاحتياطية بنجاح',
      fileName: fileName
    };
  } catch (error) {
    console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
    await logBackupError(error, type);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء النسخة الاحتياطية'
    };
  }
}

// استعادة النسخة الاحتياطية
async function restoreBackup(file) {
  try {
    const config = window.AppConfig || {};
    const supabaseUrl = config.supabase?.url;
    const supabaseAnonKey = config.supabase?.anonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }

    // قراءة محتوى الملف
    const reader = new FileReader();
    const fileContent = await new Promise((resolve, reject) => {
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });

    // تحليل محتوى الملف
    const backupData = JSON.parse(fileContent);

    // التحقق من صحة النسخة الاحتياطية
    if (!backupData.type || !backupData.timestamp || !backupData.data) {
      throw new Error('النسخة الاحتياطية غير صالحة');
    }

    // تأكيد الاستعادة
    if (!confirm(`هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم استبدال البيانات الحالية.`)) {
      return {
        success: false,
        message: 'تم إلغاء عملية الاستعادة'
      };
    }

    // استعادة بيانات المستخدمين
    if (backupData.data.users && backupData.data.users.length > 0) {
      for (const user of backupData.data.users) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(user)
          });
        } catch (e) {
          console.error('فشل استعادة المستخدم:', user.id, e);
        }
      }
    }

    // استعادة بيانات الاشتراكات
    if (backupData.data.subscriptions && backupData.data.subscriptions.length > 0) {
      for (const subscription of backupData.data.subscriptions) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(subscription)
          });
        } catch (e) {
          console.error('فشل استعادة الاشتراك:', subscription.id, e);
        }
      }
    }

    // استعادة بيانات التحصيلات
    if (backupData.data.harvests && backupData.data.harvests.length > 0) {
      for (const harvest of backupData.data.harvests) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/harvests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(harvest)
          });
        } catch (e) {
          console.error('فشل استعادة التحصيل:', harvest.id, e);
        }
      }
    }

    // استعادة بيانات المدفوعات
    if (backupData.data.payments && backupData.data.payments.length > 0) {
      for (const payment of backupData.data.payments) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(payment)
          });
        } catch (e) {
          console.error('فشل استعادة الدفعة:', payment.id, e);
        }
      }
    }

    // تحديث حالة النسخة الاحتياطية
    const response = await fetch(`${supabaseUrl}/rest/v1/backups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        backup_type: backupData.type,
        file_path: backupData.filePath || 'restored',
        file_size: 0,
        status: 'restored'
      })
    });

    if (!response.ok) {
      console.error('فشل تحديث حالة النسخة الاحتياطية');
    }

    return {
      success: true,
      message: 'تم استعادة النسخة الاحتياطية بنجاح'
    };
  } catch (error) {
    console.error('خطأ في استعادة النسخة الاحتياطية:', error);
    await logBackupError(error, 'restore');
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء استعادة النسخة الاحتياطية'
    };
  }
}

// جدولة النسخ الاحتياطي التلقائي
function scheduleAutomaticBackups() {
  const config = window.AppConfig || {};
  const backupConfig = config.app?.backup || {};

  if (backupConfig.enabled && backupConfig.interval) {
    // تحويل الفترة من ساعات إلى مللي ثانية
    const intervalMs = backupConfig.interval * 60 * 60 * 1000;

    // تشغيل النسخة الاحتياطية الأولى بعد دقيقة واحدة
    setTimeout(() => {
      createBackup('scheduled');
    }, 60000);

    // جدولة النسخ الاحتياطية التلقائية
    setInterval(() => {
      createBackup('scheduled');
    }, intervalMs);
  }
}

// الحصول على قائمة النسخ الاحتياطية
async function getBackupList() {
  try {
    const config = window.AppConfig || {};
    const supabaseUrl = config.supabase?.url;
    const supabaseAnonKey = config.supabase?.anonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/backups?order=created_at.desc`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!response.ok) {
      throw new Error('فشل جلب قائمة النسخ الاحتياطية');
    }

    const backups = await response.json();
    return backups;
  } catch (error) {
    console.error('خطأ في جلب قائمة النسخ الاحتياطية:', error);
    return [];
  }
}

// حذف نسخة احتياطية
async function deleteBackup(backupId) {
  try {
    const config = window.AppConfig || {};
    const supabaseUrl = config.supabase?.url;
    const supabaseAnonKey = config.supabase?.anonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/backups?id=eq.${backupId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!response.ok) {
      throw new Error('فشل حذف النسخة الاحتياطية');
    }

    return {
      success: true,
      message: 'تم حذف النسخة الاحتياطية بنجاح'
    };
  } catch (error) {
    console.error('خطأ في حذف النسخة الاحتياطية:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء حذف النسخة الاحتياطية'
    };
  }
}

// تصدير وحدة النسخ الاحتياطي
window.BackupManager = {
  createBackup,
  restoreBackup,
  scheduleAutomaticBackups,
  getBackupList,
  deleteBackup
};

// بدء جدولة النسخ الاحتياطي التلقائي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  scheduleAutomaticBackups();
});
