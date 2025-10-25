import { sendMail } from "../lib/mailer.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const { userData, planData, transactionId } = req.body;

  if (!userData || !planData || !transactionId) {
    return res.status(400).json({ message: "Missing required data" });
  }

  const subject = `طلب اشتراك جديد - CollectPro - ${userData.name}`;

  const html = `
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

  const text = `
طلب اشتراك جديد - CollectPro

بيانات المستخدم:
الاسم: ${userData.name}
البريد الإلكتروني: ${userData.email}
معرف المستخدم: ${userData.id}

تفاصيل الاشتراك:
نوع الخطة: ${planData.name}
السعر: ${planData.price} ج.م
المدة: ${planData.period}

معلومات الدفع:
رقم عملية التحويل: ${transactionId}
تاريخ الطلب: ${new Date().toLocaleString('ar-SA')}

يرجى مراجعة الطلب وتفعيل الاشتراك من لوحة التحكم.
  `;

  const success = await sendMail(subject, text, html);
  if (success) {
    return res.status(200).json({ message: "Subscription email sent successfully" });
  }
  return res.status(500).json({ message: "Failed to send subscription email" });
}