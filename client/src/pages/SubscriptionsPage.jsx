import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAdminStatus } from '../lib/profile';

/*
  صفحة الاشتراكات (Subscriptions Page)
  - تعرض الباقات
  - نموذج تأكيد الاشتراك (Email, UserID تلقائي, خطة، Transaction ID)
  - ترسل إشعار بريد للإدارة (يمكن تفعيل webhook عبر VITE_EMAIL_WEBHOOK_URL)
  - تخزن الطلب في subscriptions وتحتفظ بسجل في logs
  - لوحة تحكم مبسطة للمشرف لتفعيل الاشتراكات وحساب المدة تلقائياً
  ملاحظات:
  - لمنع التكرار، يتم التحقق من transaction_id قبل الإدخال
  - عند التفعيل يتم حساب start_date و end_date حسب الخطة
  - لتفعيل إرسال الإيميل تلقائياً، أنشئ Webhook وأضف قيمته في المتغير VITE_EMAIL_WEBHOOK_URL
*/

const SubscriptionsPage = () => {
  // اختيار الخطة + حقول الإدخال
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [message, setMessage] = useState('');

  // حالة المشرف + بيانات للوحة التحكم
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState([]);

  // باقات الاشتراك
  const plans = [
    { id: 'month', name: 'شهري', price: '30 جنيه', duration: 'شهر', features: ['وصول كامل للمحتوى', 'دعم فني'] },
    { id: '3months', name: '3 شهور', price: '50 جنيه', duration: '3 شهور', features: ['توفير 16%', 'كل مميزات الباقة الشهرية'] },
    { id: 'year', name: 'سنوي', price: '360 جنيه', duration: 'سنة', features: ['شهر مجاني', 'أولوية الدعم', 'خصومات حصرية'] }
  ];

  // مساعد: الحصول على اسم الباقة
  const planLabel = (id) => plans.find(p => p.id === id)?.name || id;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setUserId(user.id);
        try {
          const admin = await getAdminStatus(user.id);
          setIsAdmin(admin);
        } catch (_e) {
          setIsAdmin(false);
        }
      }
      fetchSubscriptions();
      fetchUsers();
    };
    init();
  }, []);

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase.from('subscriptions').select('*');
    if (!error && data) setSubscriptions(data);
  };

  // قد تفشل لسياسات RLS على profiles. لا تعتبر خطأً قاتلاً للواجهة.
  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setUsers(data);
  };

  // إرسال بريد إلى الإدارة عبر Edge Function آمنة في Supabase
  const sendAdminEmail = async (payload) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          to: 'emontal.33@gmail.com',
          subject: payload.subject,
          payload: payload.payload
        }),
      });

      if (!res.ok) {
        console.warn('Email function failed', await res.text());
      }
    } catch (e) {
      console.warn('Failed to call email function:', e);
    }
  };

  // تسجيل حدث في جدول logs (قد يتطلب سياسات RLS إضافية)
  const logAction = async (action, details) => {
    try {
      await supabase.from('logs').insert([{ user_id: userId || null, action, details }]);
    } catch (e) {
      console.warn('Log insert failed (probably due to RLS).');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!selectedPlan) {
      setMessage('الرجاء اختيار باقة قبل الإرسال');
      return;
    }

    // تحقق رقم العملية
    if (!/^[a-zA-Z0-9]{8,20}$/.test(transactionId)) {
      setMessage('رقم العملية غير صالح. يجب أن يكون بين 8-20 حرف/رقم');
      return;
    }

    // منع التكرار
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('transaction_id')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (existing) {
      setMessage('هذا الرقم تم استخدامه مسبقًا');
      return;
    }

    try {
      const { error } = await supabase.from('subscriptions').insert([{
        user_id: userId,
        email,
        plan: selectedPlan,
        transaction_id: transactionId,
        status: 'pending'
      }]);
      if (error) throw error;

      // أرسل إشعار بريد إلى الإدارة
      await sendAdminEmail({
        type: 'subscription_request',
        to: 'emontal.33@gmail.com',
        subject: 'طلب اشتراك جديد',
        payload: {
          user_id: userId,
          email,
          plan: selectedPlan,
          plan_label: planLabel(selectedPlan),
          transaction_id: transactionId
        }
      });

      // سجّل العملية
      await logAction('subscription_request', { user_id: userId, email, plan: selectedPlan, transaction_id: transactionId });

      setMessage('تم استلام طلبك وسيتم مراجعته فى موعد اقصاه 24 ساعة');
      setTransactionId('');
    } catch (error) {
      console.error('Error saving subscription:', error);
      setMessage('حدث خطأ أثناء حفظ بيانات الاشتراك');
    }
  };

  const activateSubscription = async (id) => {
    try {
      const sub = subscriptions.find(s => s.id === id);
      if (!sub) return;

      // حساب النهاية حسب الخطة
      const startDate = new Date();
      let endDate = new Date(startDate);
      switch (sub.plan) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case '3months':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active', start_date: startDate.toISOString(), end_date: endDate.toISOString() })
        .eq('id', id);
      if (error) throw error;

      // إشعار بريد للإدارة
      await sendAdminEmail({
        type: 'subscription_activated',
        to: 'emontal.33@gmail.com',
        subject: 'تم تفعيل اشتراك',
        payload: {
          user_id: sub.user_id,
          email: sub.email,
          plan: sub.plan,
          plan_label: planLabel(sub.plan),
          transaction_id: sub.transaction_id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      });

      // سجل العملية
      await logAction('subscription_activated', {
        subscription_id: id,
        user_id: sub.user_id,
        plan: sub.plan,
        transaction_id: sub.transaction_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      setMessage('تم تفعيل الاشتراك بنجاح');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error activating subscription:', error);
      setMessage('حدث خطأ أثناء تفعيل الاشتراك');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <img src="/logo-momkn.png" alt="CollectPro" className="h-10 w-10" />
              <p className="text-xl font-bold">CollectPro</p>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/profile" className="text-white hover:text-gray-200 font-medium">الملف الشخصي</a>
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
                className="bg-white text-green-700 hover:bg-gray-100 font-bold py-2 px-4 rounded"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold w-full text-center mt-4">باقات الاشتراك</h1>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {isAdmin ? (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6">لوحة التحكم - إدارة الاشتراكات</h2>

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">طلبات الاشتراك الجديدة</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الباقة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم العملية</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.filter(s => s.status === 'pending').map(sub => (
                      <tr key={sub.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{planLabel(sub.plan)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.transaction_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button onClick={() => activateSubscription(sub.id)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">تفعيل</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-4">جميع المشتركين</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اسم المستخدم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">البريد الإلكتروني</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع الاشتراك</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الانتهاء</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map(sub => {
                      const user = users.find(u => u.id === sub.user_id);
                      return (
                        <tr key={sub.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'غير معروف' : 'غير معروف'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{planLabel(sub.plan)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              sub.status === 'active' ? 'bg-green-100 text-green-800' :
                              sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {sub.status === 'active' ? 'نشط' : sub.status === 'pending' ? 'قيد المراجعة' : 'منتهي'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.end_date ? new Date(sub.end_date).toLocaleDateString('ar-EG') : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center my-8">اختر الباقة المناسبة لك</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-6 shadow-md transition-all duration-300 ${selectedPlan === plan.id ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-200'}`}
                >
                  <h3 className="text-xl font-bold text-center mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold text-green-600 text-center mb-4">{plan.price}</p>
                  <p className="text-gray-600 text-center mb-4">لمدة {plan.duration}</p>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button onClick={() => setSelectedPlan(plan.id)} className={`w-full py-2 px-4 rounded-md ${selectedPlan === plan.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                    {selectedPlan === plan.id ? 'تم الاختيار' : 'اختيار الباقة'}
                  </button>
                </div>
              ))}
            </div>

            {selectedPlan && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">اكمل بيانات الاشتراك</h3>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                      <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label htmlFor="transactionId" className="block text-sm font-medium text-gray-700 mb-1">رقم عملية التحويل</label>
                      <input type="text" id="transactionId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} required placeholder="مثال: TRX12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">بعد إتمام عملية التحويل، سجل رقم العملية هنا. سيتم تفعيل اشتراكك خلال 24 ساعة.</p>
                  </div>

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition duration-300">تأكيد الاشتراك</button>
                </form>

                {message && (
                  <div className={`mt-4 p-3 rounded-md ${message.includes('تم') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SubscriptionsPage;