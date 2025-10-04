const redirectUri = window.location.origin;

/**
 * Creates a free subscription for a new user.
 * @param {Object} user The Supabase user object.
 */
async function createFreeSubscription(user) {
  if (!user) return;

  console.log(`✨ Creating free subscription for new user: ${user.id}`);
  try {
    const { data, error } = await supabase.from('subscriptions').insert([
      {
        user_id: user.id,
        email: user.email,
        subscription_type: 'free',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: null,
      },
    ]);

    if (error) {
      if (error.code === '23505') {
        console.warn(`⚠️ Free subscription might already exist for user: ${user.id}. Ignoring error.`);
      } else {
        throw error;
      }
    } else {
      console.log(`✅ Successfully created free subscription for user: ${user.id}`);
    }
  } catch (error) {
    console.error(`❌ Error creating free subscription for user ${user.id}:`, error);
  }
}


/**
 * Redirects the user based on their role and saves their data to storage.
 * @param {Object} user The Supabase user object.
 */
async function redirectUser(user) {
  if (!user) return;

  console.log('🔍 Checking user role for redirection. User ID:', user.id);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      console.log('👤 New user or no profile found. Creating free subscription...');
      await createFreeSubscription(user);
      console.log('Redirecting new user to dashboard page.');
      window.location.href = 'dashboard.html';
      return;
    }
    if (error) throw error;

    if (data && data.role === 'admin') {
      console.log('👑 Admin user detected. Redirecting to admin dashboard.');
      window.location.href = 'admin.html';
    } else {
      console.log('👤 Regular user detected. Redirecting to dashboard page.');
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    window.location.href = 'dashboard.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Initializing application for production');

  const googleLoginBtn = document.getElementById('google-login-btn');
  let sessionHandled = false;

  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`🔧 Auth state changed: Event: ${event}, Session: ${!!session}`);

    if (sessionHandled) {
      return;
    }

    if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
      sessionHandled = true;
      console.log(`✅ User session found (Event: ${event}). Processing...`);
      redirectUser(session.user);
    }
  });

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      console.log('🔧 Google login button clicked');
      try {
        const { error } = await supabase.auth.signInWithOAuth({
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
