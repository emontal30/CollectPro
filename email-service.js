// خدمة إرسال البريد الإلكتروني
// تهيئة EmailJS (يجب استبدال 'YOUR_PUBLIC_KEY' بـ public key من EmailJS)
emailjs.init('YOUR_PUBLIC_KEY');

async function sendEmail(subject, body, to = 'emontal.33@gmail.com') {
    try {
        // إعدادات البريد الإلكتروني
        const emailConfig = {
            service: 'gmail',
            user: 'emontal.33@gmail.com',
            pass: 'iswo jyiq crlv jkpg',
            from: 'emontal.33@gmail.com',
            to: to
        };

        // إعداد البيانات للإرسال
        const emailData = {
            to: emailConfig.to,
            subject: subject,
            html: body,
            from: emailConfig.from
        };

        console.log('إرسال بريد إلكتروني:', {
            to: emailConfig.to,
            subject: subject,
            from: emailConfig.from
        });

        // إرسال البريد الإلكتروني عبر EmailJS
        try {
            await emailjs.send(
                'service_gmail', // يجب إنشاء خدمة في EmailJS
                'template_payment_request', // يجب إنشاء قالب
                {
                    to_email: emailConfig.to,
                    subject: subject,
                    message: body,
                    from_email: emailConfig.from
                }
            );
            return { success: true };
        } catch (error) {
            console.error('خطأ في إرسال البريد عبر EmailJS:', error);
            return { success: false, error: error.message };
        }
    } catch (error) {
        console.error('خطأ في إرسال البريد الإلكتروني:', error);
        return { success: false, error: error.message };
    }
}

// دالة لإرسال بريد إلكتروني للإدارة عند طلب اشتراك جديد
async function sendSubscriptionRequestEmail(userData, planData, transactionId) {
    const subject = `طلب اشتراك جديد - CollectPro - ${userData.name}`;

    const body = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007965; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .user-info { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .plan-info { background: #e8f5e8; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .transaction-info { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>طلب اشتراك جديد</h1>
            <p>CollectPro - منصة إدارة التحصيلات</p>
        </div>

        <div class="content">
            <div class="user-info">
                <h3>بيانات المستخدم:</h3>
                <p><strong>الاسم:</strong> ${userData.name}</p>
                <p><strong>البريد الإلكتروني:</strong> ${userData.email}</p>
                <p><strong>معرف المستخدم:</strong> ${userData.id}</p>
            </div>

            <div class="plan-info">
                <h3>تفاصيل الاشتراك:</h3>
                <p><strong>نوع الخطة:</strong> ${planData.name}</p>
                <p><strong>السعر:</strong> ${planData.price} ج.م</p>
                <p><strong>المدة:</strong> ${planData.period}</p>
            </div>

            <div class="transaction-info">
                <h3>معلومات الدفع:</h3>
                <p><strong>رقم عملية التحويل:</strong> ${transactionId}</p>
                <p><strong>تاريخ الطلب:</strong> ${new Date().toLocaleString('ar-SA')}</p>
            </div>

            <p><strong>يرجى مراجعة الطلب وتفعيل الاشتراك من لوحة التحكم.</strong></p>
        </div>

        <div class="footer">
            <p>تم إرسال هذا البريد الإلكتروني تلقائياً من نظام CollectPro</p>
        </div>
    </div>
</body>
</html>
    `;

    return await sendEmail(subject, body);
}

// تصدير الدوال لاستخدامها في الملفات الأخرى
export { sendEmail, sendSubscriptionRequestEmail };
