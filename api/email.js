const nodemailer = require("nodemailer");

// إنشاء الناقل البريدي (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // مثال: smtp.gmail.com
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true", // true لو 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// دالة عامة لإرسال البريد
async function sendEmail(options) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ تم الإرسال:", info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ خطأ في الإرسال:", error);
    return { success: false, error: error.message };
  }
}

// دوال البريد المتخصصة
async function sendWelcomeEmail(userEmail, userName) {
  const subject = "مرحباً بك في CollectPro!";
  const text = `عزيزي/عزيزتي ${userName}،

شكراً لتسجيلك في تطبيق CollectPro. نحن سعداء بانضمامك إلينا.

إذا كان لديك أي استفسارات، فلا تتردد في التواصل معنا.

مع أطيب التحيات،
فريق CollectPro`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:5px;">
      <h2 style="color:#007965;">مرحباً بك في CollectPro!</h2>
      <p>عزيزي/عزيزتي <strong>${userName}</strong>،</p>
      <p>شكراً لتسجيلك في تطبيق CollectPro. نحن سعداء بانضمامك إلينا.</p>
      <p>إذا كان لديك أي استفسارات، فلا تتردد في التواصل معنا.</p>
      <p>مع أطيب التحيات،<br>فريق CollectPro</p>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;text-align:center;color:#666;font-size:12px;">
        <p>© ${new Date().getFullYear()} CollectPro. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
}

async function sendPaymentConfirmationEmail(userEmail, userName, amount, subscriptionPlan) {
  const subject = "تأكيد عملية الدفع - CollectPro";
  const text = `عزيزي/عزيزتي ${userName}،

نشكرك على عملية الدفع البالغة ${amount} ريال للاشتراك في باقة ${subscriptionPlan}.

تم تفعيل اشتراكك بنجاح. يمكنك الآن الاستفادة من جميع ميزات الباقة.

مع أطيب التحيات،
فريق CollectPro`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:5px;">
      <h2 style="color:#007965;">تأكيد عملية الدفع</h2>
      <p>عزيزي/عزيزتي <strong>${userName}</strong>،</p>
      <p>نشكرك على عملية الدفع البالغة <strong>${amount} ريال</strong> للاشتراك في باقة <strong>${subscriptionPlan}</strong>.</p>
      <p>تم تفعيل اشتراكك بنجاح. يمكنك الآن الاستفادة من جميع ميزات الباقة.</p>
      <p>مع أطيب التحيات،<br>فريق CollectPro</p>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;text-align:center;color:#666;font-size:12px;">
        <p>© ${new Date().getFullYear()} CollectPro. جميع الحقوق محفوظة.</p>
      </div>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
}

async function sendPasswordResetEmail(userEmail, resetToken) {
  const resetLink = `${process.env.HOSTING_DOMAIN}/reset-password.html?token=${resetToken}`;
  const subject = "إعادة تعيين كلمة المرور - CollectPro";
  const text = `عزيزي/عزيزتي المستخدم،

لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.

لإعادة تعيين كلمة المرور، اضغط على الرابط التالي:
${resetLink}

إذا لم تطلب ذلك، تجاهل هذا البريد.

فريق CollectPro`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:5px;">
      <h2 style="color:#007965;">إعادة تعيين كلمة المرور</h2>
      <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
      <p style="text-align:center;margin:20px 0;">
        <a href="${resetLink}" style="background:#007965;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">إعادة تعيين كلمة المرور</a>
      </p>
      <p>إذا لم تطلب ذلك، تجاهل هذا البريد.</p>
      <p>فريق CollectPro</p>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
}

async function sendSystemNotification(userEmail, title, message) {
  const subject = `إشعار من CollectPro: ${title}`;
  const text = `${message}\n\nفريق CollectPro`;

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:5px;">
      <h2 style="color:#007965;">${title}</h2>
      <p>${message}</p>
      <p>فريق CollectPro</p>
    </div>
  `;

  return sendEmail({ to: userEmail, subject, text, html });
}

// ================== API HANDLER ================== //
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { action } = req.query;

    if (action === "send-welcome") return handleSendWelcomeEmail(req, res);
    if (action === "send-payment-confirmation") return handleSendPaymentConfirmationEmail(req, res);
    if (action === "send-password-reset") return handleSendPasswordResetEmail(req, res);
    if (action === "send-notification") return handleSendSystemNotification(req, res);

    return res.status(400).json({ success: false, message: "Action not supported" });
  } catch (error) {
    console.error("Email API Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// ================== Handlers ================== //
async function handleSendWelcomeEmail(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ success: false, message: "Email and name are required" });

  const result = await sendWelcomeEmail(email, name);
  return res.status(result.success ? 200 : 500).json({ success: result.success, messageId: result.messageId, error: result.error });
}

async function handleSendPaymentConfirmationEmail(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  const { email, name, amount, plan } = req.body;
  if (!email || !name || !amount || !plan) return res.status(400).json({ success: false, message: "Missing required fields" });

  const result = await sendPaymentConfirmationEmail(email, name, amount, plan);
  return res.status(result.success ? 200 : 500).json({ success: result.success, messageId: result.messageId, error: result.error });
}

async function handleSendPasswordResetEmail(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ success: false, message: "Email and token are required" });

  const result = await sendPasswordResetEmail(email, token);
  return res.status(result.success ? 200 : 500).json({ success: result.success, messageId: result.messageId, error: result.error });
}

async function handleSendSystemNotification(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  const { email, title, message } = req.body;
  if (!email || !title || !message) return res.status(400).json({ success: false, message: "Missing required fields" });

  const result = await sendSystemNotification(email, title, message);
  return res.status(result.success ? 200 : 500).json({ success: result.success, messageId: result.messageId, error: result.error });
}
