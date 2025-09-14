import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAdminStatus } from '../lib/profile';

/*
  لوحة التحكم (Admin Dashboard)
  - إدارة المستخدمين: عرض، تفعيل/إيقاف، تعديل أسماء، حذف (اختياري)
  - إدارة الاشتراكات: عرض pending وتفعيل يدويًا
  - صلاحيات: صفحة لا تُعرض إلا للمشرف
*/

const AdminDashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(await getAdminStatus(user.id));
      await Promise.all([fetchProfiles(), fetchSubscriptions()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data);
  };

  const fetchSubscriptions = async () => {
    const { data } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
    if (data) setSubscriptions(data);
  };

  const toggleActive = async (id, current) => {
    const { error } = await supabase.from('profiles').update({ active: !current }).eq('id', id);
    if (!error) { setMessage('تم تحديث حالة المستخدم'); fetchProfiles(); } else { setMessage('فشل التحديث'); }
  };

  const activateSubscription = async (id) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;
    const startDate = new Date();
    const endDate = new Date(startDate);
    switch (sub.plan) {
      case 'month': endDate.setMonth(endDate.getMonth() + 1); break;
      case '3months': endDate.setMonth(endDate.getMonth() + 3); break;
      case 'year': endDate.setFullYear(endDate.getFullYear() + 1); break;
    }
    const { error } = await supabase.from('subscriptions').update({ status: 'active', start_date: startDate.toISOString(), end_date: endDate.toISOString() }).eq('id', id);
    if (!error) { setMessage('تم تفعيل الاشتراك'); fetchSubscriptions(); } else { setMessage('فشل التفعيل'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-t-4 border-green-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded shadow">أنت لا تملك صلاحية الوصول لهذه الصفحة</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="bg-green-700 text-white p-4 shadow-md rounded mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <a href="/subscriptions" className="bg-white text-green-700 hover:bg-gray-100 font-bold py-2 px-4 rounded">رجوع</a>
        </div>
      </header>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('تم') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-4">المستخدمون</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">المعرف</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">تحكم</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-xs text-gray-500">{p.id}</td>
                    <td className="px-4 py-2">{`${p.first_name || ''} ${p.last_name || ''}`.trim() || '—'}</td>
                    <td className="px-4 py-2">{p.role}</td>
                    <td className="px-4 py-2">{p.active ? 'نشط' : 'موقوف'}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => toggleActive(p.id, p.active)} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">{p.active ? 'إيقاف' : 'تفعيل'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-4">طلبات الاشتراك (Pending)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">البريد</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الخطة</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">العملية</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">تحكم</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.filter(s => s.status === 'pending').map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-sm">{s.email}</td>
                    <td className="px-4 py-2 text-sm">{s.plan}</td>
                    <td className="px-4 py-2 text-sm">{s.transaction_id}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => activateSubscription(s.id)} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">تفعيل</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;