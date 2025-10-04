const { createClient } = supabase;

// Initialize Supabase with hardcoded credentials
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

// The redirect URI must match the Vercel domain exactly
const redirectUri = 'https://collect-pro.vercel.app/';

const _supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Redirects the user based on their role stored in the 'profiles' table.
 * @param {Object} user The Supabase user object.
 */
async function redirectUser(user) {
  if (!user) return;

  console.log('🔍 Checking user role for redirection. User ID:', user.id);
  try {
    const { data, error } = await _supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Handle case where profile doesn't exist (e.g., new user)
    if (error && error.code === 'PGRST116') {
      console.log('👤 New user or no profile found. Redirecting to subscription page.');
      window.location.href = 'my-subscription.html';
      return;
    }
    if (error) throw error;

    // Redirect based on role
    if (data && data.role === 'admin') {
      console.log('👑 Admin user detected. Redirecting to admin dashboard.');
      window.location.href = 'admin.html';
    } else {
      console.log('👤 Regular user detected. Redirecting to subscription page.');
      window.location.href = 'my-subscription.html';
    }
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    // Fallback redirect in case of an error
    window.location.href = 'my-subscription.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Initializing application for production');

  const googleLoginBtn = document.getElementById('google-login-btn');
  let sessionHandled = false; // Flag to prevent multiple redirections

  // onAuthStateChange handles all auth events: initial load, login, logout.
  _supabase.auth.onAuthStateChange((event, session) => {
    console.log(`🔧 Auth state changed: Event: ${event}, Session: ${!!session}`);

    if (sessionHandled) {
      return;
    }

    // 'INITIAL_SESSION' is for existing sessions on page load.
    // 'SIGNED_IN' is for after a successful login.
    if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
      sessionHandled = true; // Prevent this from running again
      console.log(`✅ User session found (Event: ${event}). Redirecting...`);
      redirectUser(session.user);
    }
  });

  // Handle Google login button click
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      console.log('🔧 Google login button clicked');
      try {
        const { error } = await _supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri,
          },
        });

        if (error) {
          console.error('❌ Error initiating Google login:', error.message);
        } else {
          console.log('✅ OAuth initiated successfully. Redirecting to Google...');
        }
      } catch (error) {
        console.error('❌ An unexpected error occurred during login initiation:', error);
      }
    });
  }
});
