const { createClient } = supabase;

// Initialize Supabase with hardcoded credentials
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';
const redirectUri = 'https://collectpro.vercel.app/dashboard.html'; // Production redirect URI

const _supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Initializing application for static deployment');

  const googleLoginBtn = document.getElementById('google-login-btn');

  // Check if user is already logged in
  _supabase.auth.getSession().then(({ data: { session }, error }) => {
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
        const { data, error } = await _supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri
          }
        });

        if (error) {
          console.error('❌ Error logging in with Google:', error.message);
        } else {
          console.log('✅ OAuth initiated successfully');
        }
      } catch (error) {
        console.error('❌ An unexpected error occurred:', error);
      }
    });
  }

  // Handle the redirect from Google
  _supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔧 Auth state changed:', { event, hasSession: !!session });
    if (session && event === 'SIGNED_IN') {
      console.log('✅ User signed in successfully, redirecting to dashboard');
      window.location.href = 'dashboard.html';
    }
  });
});
