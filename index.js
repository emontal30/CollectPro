const { createClient } = supabase;

// Initialize Supabase with hardcoded credentials
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

// The redirect URI should point to the main page to handle the login
const redirectUri = 'https://collectpro.vercel.app/';

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

    if (error) {
      // If the profile doesn't exist, it might be a new user.
      // Redirect to the default non-admin page.
      if (error.code === 'PGRST116') {
        console.log('👤 New user or no profile found. Redirecting to subscription page.');
        window.location.href = 'my-subscription.html';
        return;
      }
      throw error;
    }

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

  // Handle the redirect from Google OAuth.
  // This will be triggered when the user is redirected back to the app.
  _supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔧 Auth state changed:', { event, hasSession: !!session });
    // We only care about the SIGNED_IN event.
    if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in successfully.');
        redirectUser(session.user);
    }
  });

  // Check if there's already an active session when the page loads.
  _supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        console.log('✅ User already has a session.');
        redirectUser(session.user);
    } else {
        console.log('📭 No active session found.');
    }
  });


  // Handle Google login button click.
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      console.log('🔧 Google login button clicked');
      try {
        const { error } = await _supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri
          }
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
