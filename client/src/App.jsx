import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import LoginPage from './pages/LoginPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-t-4 border-green-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/subscriptions" />} />
        <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/subscriptions" />} />
        <Route path="/reset-password" element={!user ? <ResetPasswordPage /> : <Navigate to="/subscriptions" />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        <Route
          path="/subscriptions"
          element={user ? <SubscriptionsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={user ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={user ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={user ? <Navigate to="/subscriptions" /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
