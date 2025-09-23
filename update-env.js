import fs from "fs";
import crypto from "crypto";

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

// توليد قيم جديدة
const csrfSecret = generateSecret(32);
const jwtSecret = generateSecret(32);

// قراءة ملف .env أو إنشاؤه لو مش موجود
let envContent = "";
if (fs.existsSync(".env")) {
  envContent = fs.readFileSync(".env", "utf-8");
}

// تحديث أو إضافة القيم
envContent = envContent.replace(/CSRF_SECRET=.*/g, `CSRF_SECRET=${csrfSecret}`);
if (!envContent.includes("CSRF_SECRET")) {
  envContent += `\nCSRF_SECRET=${csrfSecret}`;
}

envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${jwtSecret}`);
if (!envContent.includes("JWT_SECRET")) {
  envContent += `\nJWT_SECRET=${jwtSecret}`;
}

// كتابة التحديث في .env
fs.writeFileSync(".env", envContent.trim() + "\n");

console.log("✅ تم تحديث ملف .env بالقيم الجديدة:");
console.log("CSRF_SECRET=", csrfSecret);
console.log("JWT_SECRET=", jwtSecret);
