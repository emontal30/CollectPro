import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { getAdminStatus, getProfile } from './lib/profile';
import LoginPage from './pages/LoginPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';

// Protected layout with a top navigation; hides Admin link for non-admins
function ProtectedLayout({ isAdmin, profile, user }) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 w-full">
          <Link to="/" className="text-green-700 hover:underline font-semibold">الرئيسية</Link>
          <Link to="/subscriptions" className="text-gray-700 hover:underline">الاشتراكات</Link>
          <Link to="/profile" className="text-gray-700 hover:underline">الملف الشخصي</Link>
          {isAdmin && (
            <Link to="/admin" className="text-gray-700 hover:underline">لوحة المشرف</Link>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
            {user && (
              <span className="truncate max-w-[240px]" title={`${profile?.first_name || ''} ${profile?.last_name || ''} (${user.id})`.trim()}>
                {(profile?.first_name || profile?.last_name) ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() : (profile?.email || user.email)}
                <span className="mx-2 text-gray-400">|</span>
                <span className="font-mono">{user?.id ? `${user.id.slice(0,6)}...${user.id.slice(-4)}` : ''}</span>
              </span>
            )}
            <button onClick={handleSignOut} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
              تسجيل الخروج
            </button>
          </div>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [profile, setProfile] = useState(null);

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

  // Check admin status and fetch profile whenever user changes
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (user) {
        try {
          const [admin, prof] = await Promise.all([
            getAdminStatus(user.id),
            getProfile(user.id)
          ]);
          if (active) {
            setIsAdmin(admin);
            setProfile(prof);
          }
        } catch (_) {
          if (active) {
            setIsAdmin(false);
            setProfile(null);
          }
        } finally {
          if (active) setAdminChecked(true);
        }
      } else {
        setIsAdmin(false);
        setProfile(null);
        setAdminChecked(true);
      }
    };
    run();
    return () => { active = false; };
  }, [user]);

  if (loading || !adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-t-4 border-green-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/" />} />
        <Route path="/reset-password" element={!user ? <ResetPasswordPage /> : <Navigate to="/" />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />

        {/* Protected routes with Outlet */}
        <Route element={user ? <ProtectedLayout isAdmin={isAdmin} profile={profile} user={user} /> : <Navigate to="/login" /> }>
          {/* Default route: Admin -> AdminDashboard, Others -> Data Entry (Dashboard) */}
          <Route path="/" element={isAdmin ? <AdminDashboard /> : <Dashboard />} />

          {/* Other protected routes */}
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
