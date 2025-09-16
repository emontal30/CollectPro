import React from 'react';

// Simple dashboard (data entry) page
export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-4">لوحة إدخال البيانات</h1>
        <p className="text-gray-600">مرحبا بك! هذه الصفحة مخصصة لإدخال البيانات بعد تسجيل الدخول.</p>
        {/* TODO: Add your actual data entry form/components here */}
      </div>
    </div>
  );
}