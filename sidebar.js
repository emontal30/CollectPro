document.addEventListener('DOMContentLoaded', async () => {

  // --- New: Securely Populate User Data in Sidebar ---
  const populateSidebarUserData = async () => {
    const userNameEl = document.getElementById('user-name');
    const userInitialEl = document.getElementById('user-initial');
    const userEmailEl = document.getElementById('user-email');
    const userIdEl = document.getElementById('user-id');

    console.log('Fetching user data for sidebar...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Error fetching user, or no user session found. Redirecting to login.', error);
      // Clear any potentially corrupted local storage and redirect to login
      localStorage.clear();
      window.location.href = 'index.html';
      return;
    }

    console.log('User data fetched successfully:', user);
    const fullName = user.user_metadata?.full_name;
    const email = user.email;

    if (userNameEl && fullName) userNameEl.textContent = fullName;
    if (userInitialEl && fullName) userInitialEl.textContent = fullName.charAt(0).toUpperCase();
    if (userEmailEl && email) userEmailEl.textContent = email;
    if (userIdEl && user.id) userIdEl.textContent = `ID: ${user.id.substring(0, 5)}...`;
  };

  // --- Sidebar Toggle Functionality ---
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.querySelector('.sidebar-toggle');

  if (sidebar && sidebarToggle) {
    sidebarToggle.style.visibility = 'visible';
    sidebarToggle.style.opacity = '1';
    
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-collapsed');
      document.body.classList.toggle('sidebar-collapsed');
      
      if (sidebar.classList.contains('sidebar-collapsed')) {
        sidebarToggle.style.transform = 'translateX(0)';
      } else {
        const sidebarWidth = sidebar.offsetWidth;
        sidebarToggle.style.transform = `translateX(-${sidebarWidth}px)`;
      }
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth < 769) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
          sidebar.classList.add('sidebar-collapsed');
          document.body.classList.add('sidebar-collapsed');
          sidebarToggle.style.transform = 'translateX(0)';
        }
      }
    });
  }

  // --- Set Active Navigation Link ---
  const currentPage = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

  // --- Correct Logout Functionality (using global supabase client) ---
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      console.log('🔒 Logging out user...');

      // 1. Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // 2. Clear all local storage for a clean slate
      localStorage.clear();

      if (error) {
        console.error('❌ Error during logout:', error.message);
      } else {
        console.log('✅ Logout successful.');
      }

      // 3. Redirect to the login page
      window.location.href = 'index.html';
    });
  }

  // --- Initial calls ---
  await populateSidebarUserData();

});
