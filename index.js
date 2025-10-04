const { createClient } = supabase;

// Initialize Supabase
const _supabase = createClient(window.env.SUPABASE_URL, window.env.SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Debugging Google Login - Environment Variables:', {
    SUPABASE_URL: window.env?.SUPABASE_URL,
    SUPABASE_KEY: window.env?.SUPABASE_KEY ? '***configured***' : 'NOT SET',
  });

  // Validate environment variables
  if (!window.env?.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL is missing!');
  }
  if (!window.env?.SUPABASE_KEY) {
    console.error('❌ SUPABASE_KEY is missing!');
  }

  const googleLoginBtn = document.getElementById('google-login-btn');

  // Check if user is already logged in
  _supabase.auth.getSession().then(({ data: { session }, error }) => {
    console.log('🔧 Session check result:', { session: !!session, error });
    if (error) {
      console.error('❌ Session check error:', error);
    }
    if (session) {
      console.log('✅ User already logged in, redirecting to dashboard');
      window.location.href = 'dashboard.html';
    }
  });

  // Handle Google login
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      console.log('🔧 Google login button clicked');
      try {
        console.log('🔧 Attempting Google OAuth login...');
        console.log('🔧 Supabase client initialized:', !!_supabase);

        const { data, error } = await _supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.env.GOOGLE_REDIRECT_URI
          }
        });

        console.log('🔧 OAuth call completed. Data:', data);
        console.log('🔧 OAuth response:', { data: !!data, error });
        if (error) {
          console.error('❌ Error logging in with Google:', error.message);
          console.error('❌ Full error object:', error);
        } else {
          console.log('✅ OAuth initiated successfully');
        }
      } catch (error) {
        console.error('❌ An unexpected error occurred:', error);
        console.error('❌ Error stack:', error.stack);
      }
    });
  }

  // Handle the redirect from Google
  _supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔧 Auth state changed:', { event, hasSession: !!session });
    if (session) {
      console.log('✅ Session details:', {
        user: session.user?.email,
        expires_at: new Date(session.expires_at * 1000).toISOString()
      });
    }
    if (session && event === 'SIGNED_IN') {
      console.log('✅ User signed in successfully, redirecting to dashboard');
      window.location.href = 'dashboard.html';
    } else if (event === 'SIGNED_OUT') {
      console.log('ℹ️ User signed out');
    }
  });
});