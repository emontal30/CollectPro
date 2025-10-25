import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import nodemailer from "nodemailer";

export async function sendMail(subject, text, html) {
  if (
    !process.env.EMAIL_SERVICE ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS ||
    !process.env.EMAIL_FROM ||
    !process.env.EMAIL_TO
  ) {
    console.warn("⚠️ Missing email configuration in environment variables.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject,
    text,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
}