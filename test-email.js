// اختبار إرسال البريد الإلكتروني
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sendMail } from './lib/mailer.js';

async function testEmail() {
  const subject = 'اختبار إرسال البريد من CollectPro';
  const text = 'هذا اختبار لإرسال البريد الإلكتروني.';
  const html = '<p>هذا اختبار لإرسال البريد الإلكتروني من <strong>CollectPro</strong>.</p>';

  const success = await sendMail(subject, text, html);
  if (success) {
    console.log('✅ تم إرسال البريد بنجاح!');
  } else {
    console.log('❌ فشل في إرسال البريد.');
  }
}

testEmail();