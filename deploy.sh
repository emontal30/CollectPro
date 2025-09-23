#!/bin/bash

# إيقاف السكربت عند أي خطأ
set -e

# إضافة جميع الملفات المعدلة
git add .

# إنشاء رسالة commit
read -p "أدخل رسالة الcommit (أو اضغط Enter لاستخدام الرسالة الافتراضية): " commit_message

# التحقق من إدخال الرسالة
if [ -z "$commit_message" ]; then
    commit_message="تحديث المشروع - إضافة ملفات الإعداد والنشر"
fi

# تنفيذ commit
git commit -m "$commit_message"

# دفع التغييرات إلى GitHub
git push origin main

echo "✅ تم دفع التغييرات إلى GitHub بنجاح!"
