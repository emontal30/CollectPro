import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sendMail } from "../../lib/mailer.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const { name, email, message } = req.body;

  const subject = `📩 رسالة جديدة من ${name}`;
  const html = `
    <h3>بيانات العميل:</h3>
    <p><b>الاسم:</b> ${name}</p>
    <p><b>الإيميل:</b> ${email}</p>
    <p><b>الرسالة:</b> ${message}</p>
  `;

  const success = await sendMail(subject, message, html);
  if (success) return res.status(200).json({ message: "Email sent successfully" });
  return res.status(500).json({ message: "Email sending failed" });
}