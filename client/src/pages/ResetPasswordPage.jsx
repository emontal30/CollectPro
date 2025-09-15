import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password',
      });
      
      if (error) throw error;
      
      setMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    } catch (error) {
      console.error('Reset password error:', error);
      setMessage('حدث خطأ أثناء إرسال رابط إعادة التعيين. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/logo-momkn.png" 
              alt="CollectPro" 
              className="h-10 w-10" 
            />
            <p className="text-xl font-bold">CollectPro</p>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mt-4 text-center">إعادة تعيين كلمة المرور</h1>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        {loading ? (
          <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <p>جاري إرسال رابط إعادة التعيين...</p>
              <div className="mt-4 w-12 h-12 border-t-4 border-green-500 border-solid rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        ) : (
          <section className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2"
              >
                <span>إرسال رابط التعيين</span>
              </button>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-md ${
                message.includes('تم') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                <a href="/login" className="font-medium text-green-600 hover:text-green-500">
                  العودة لتسجيل الدخول
                </a>
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ResetPasswordPage;