import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getProfile } from '../lib/profile';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get user profile
        const profileData = await getProfile(user.id);
        setProfile(profileData);
        
        // Get user subscriptions
        const { data: subs, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!error) {
          setSubscriptions(subs);
        }
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, []);

  // Check if subscription is about to expire (within 7 days)
  const isExpiringSoon = (endDate) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-t-4 border-green-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <img
                src="/logo-momkn.png"
                alt="CollectPro"
                className="h-10 w-10"
              />
              <p className="text-xl font-bold">CollectPro</p>
            </div>
            
            <div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="bg-white text-green-700 hover:bg-gray-100 font-bold py-2 px-4 rounded"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold w-full text-center mt-4">الملف الشخصي</h1>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">معلومات الحساب</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">الاسم</label>
              <p className="mt-1 text-lg">
                {profile ? `${profile.first_name} ${profile.last_name}` : 'غير معروف'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
              <p className="mt-1 text-lg">{user?.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">الدور</label>
              <p className="mt-1 text-lg">{profile?.role === 'admin' ? 'مدير' : 'مستخدم'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">اشتراكاتي</h2>
          
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">ليس لديك أي اشتراكات نشطة</p>
              <a 
                href="/subscriptions" 
                className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                اشترك الآن
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع الباقة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ البداية</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الانتهاء</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map(sub => (
                    <tr key={sub.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sub.plan === 'month' && 'شهري (30 جنيه)'}
                        {sub.plan === '3months' && '3 شهور (50 جنيه)'}
                        {sub.plan === 'year' && 'سنوي (360 جنيه)'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          sub.status === 'active' ? 'bg-green-100 text-green-800' : 
                          sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {sub.status === 'active' ? 'نشط' : sub.status === 'pending' ? 'قيد المراجعة' : 'منتهي'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sub.start_date ? new Date(sub.start_date).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sub.end_date ? (
                          <div>
                            {new Date(sub.end_date).toLocaleDateString('ar-EG')}
                            {isExpiringSoon(sub.end_date) && (
                              <span className="ml-2 text-xs text-red-600">(سينتهي قريباً)</span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;