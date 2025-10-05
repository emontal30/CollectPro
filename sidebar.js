document.addEventListener('DOMContentLoaded', async () => {

  // --- Securely Populate User Data in Sidebar ---
  const populateSidebarUserData = async () => {
    const userNameEl = document.getElementById('user-name');
    const userInitialEl = document.getElementById('user-initial');
    const userEmailEl = document.getElementById('user-email');
    const userIdEl = document.getElementById('user-id');

    console.log('Fetching user data for sidebar...');
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      console.error('Error fetching user, or no user session found. Redirecting to login.', error);
      localStorage.clear();
      window.location.href = 'index.html';
      return;
    }

    const { user } = data;
    console.log('User data fetched successfully:', user);
    const fullName = user.user_metadata?.full_name;
    const email = user.email;

    if (userNameEl && fullName) userNameEl.textContent = fullName;
    if (userInitialEl && fullName) userInitialEl.textContent = fullName.charAt(0).toUpperCase();
    if (userEmailEl && email) userEmailEl.textContent = email;
    if (userIdEl && user.id) userIdEl.textContent = `ID: ${user.id.substring(0, 5)}...`;
  };

  // --- Sidebar Toggle Functionality (REVISED) ---
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.querySelector('.sidebar-toggle');

  // Ensure the body starts in a collapsed state for consistency.
  document.body.classList.add('sidebar-collapsed');

  if (sidebar && sidebarToggle) {
    // Make the button visible now that JS is controlling it.
    sidebarToggle.style.visibility = 'visible';
    sidebarToggle.style.opacity = '1';
    
    // Event to toggle the sidebar on button click.
    sidebarToggle.addEventListener('click', () => {
      // Simply toggle the class on the body. CSS handles all transitions.
      document.body.classList.toggle('sidebar-collapsed');
    });

    // Event to close the sidebar when clicking outside of it on mobile.
    document.addEventListener('click', (e) => {
      const isSidebarOpen = !document.body.classList.contains('sidebar-collapsed');
      // Execute only on smaller screens and when the sidebar is open.
      if (isSidebarOpen && window.innerWidth < 769) {
        // If the click target is not the sidebar or a child of it, and not the toggle button.
        if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
          document.body.classList.add('sidebar-collapsed');
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

  // --- Correct Logout Functionality ---
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      console.log('🔒 Logging out user...');
      const { error } = await supabase.auth.signOut();
      localStorage.clear();
      if (error) {
        console.error('❌ Error during logout:', error.message);
      } else {
        console.log('✅ Logout successful.');
      }
      window.location.href = 'index.html';
    });
  }

  // --- Initial calls ---
  await populateSidebarUserData();

});
