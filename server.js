
// خادم محلي لمشروع CollectPro
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// إنشاء تطبيق Express
const app = express();
const PORT = process.env.PORT || 5000;

// إعدادات الوسيط
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://altnvsolaqphpndyztup.supabase.co"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname)));

// تحميل مكتبة Supabase للخادم
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-G';
const supabase = createClient(supabaseUrl, supabaseKey);

// جعل Supabase متاحاً عالمياً في بيئة الخادم
global.supabase = supabase;

// إعداد واجهات برمجة التطبيقات
const apiPath = path.join(__dirname, 'api');

// قراءة ملفات واجهات برمجة التطبيقات وتحميلها
fs.readdirSync(apiPath).forEach(file => {
  if (file.endsWith('.js')) {
    const routePath = `/api/${file.replace('.js', '')}`;

    try {
      // محاولة تحميل ملف API كوحدة Node.js
      const apiModule = require(path.join(apiPath, file));

      app.all(routePath, async (req, res) => {
        try {
          // محاكاة كائن الطلب والاستجابة لـ Vercel
          const vercelReq = {
            method: req.method,
            query: req.query,
            body: req.body,
            headers: req.headers,
            // إضافة معلومات إضافية للطلب
            url: req.url,
            path: req.path,
            params: req.params
          };

          const vercelRes = {
            status: (code) => {
              res.status(code);
              return vercelRes;
            },
            json: (data) => {
              res.json(data);
            },
            end: () => {
              res.end();
            },
            setHeader: (name, value) => {
              res.setHeader(name, value);
              return vercelRes;
            },
            // إضافة دالة لإرسال رسائل الخطأ
            sendError: (statusCode, message, error = null) => {
              const response = {
                success: false,
                message: message,
                timestamp: new Date().toISOString()
              };

              if (error && process.env.NODE_ENV !== 'production') {
                response.error = error.message || error.toString();
                response.stack = error.stack;
              }

              res.status(statusCode).json(response);
            }
          };

          await apiModule.default(vercelReq, vercelRes);
        } catch (error) {
          console.error(`API Error in ${routePath}:`, error);

          // إرسال استجابة خطأ مفصلة في بيئة التطوير ورسالة عامة في الإنتاج
          if (process.env.NODE_ENV === 'development') {
            res.status(500).json({
              success: false,
              message: 'Internal server error',
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString()
            });
          } else {
            res.status(500).json({
              success: false,
              message: 'An error occurred while processing your request',
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      console.log(`API route loaded: ${routePath}`);
    } catch (error) {
      console.error(`Error loading API route ${routePath}:`, error);
    }
  }
});

// توجيهات الصفحات الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'reset-password.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/subscriptions', (req, res) => {
  res.sendFile(path.join(__dirname, 'subscriptions.html'));
});

app.get('/my-subscription', (req, res) => {
  res.sendFile(path.join(__dirname, 'my-subscription.html'));
});

app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get('/harvest', (req, res) => {
  res.sendFile(path.join(__dirname, 'harvest.html'));
});

app.get('/archive', (req, res) => {
  res.sendFile(path.join(__dirname, 'archive.html'));
});

// معالجة المسارات غير الموجودة
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'login.html'));
});

// بدء الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CollectPro server running on http://0.0.0.0:${PORT}`);
  console.log(`Dashboard available at: http://0.0.0.0:${PORT}/dashboard`);
  console.log(`API endpoints available at: http://0.0.0.0:${PORT}/api`);
});
