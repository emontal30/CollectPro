document.addEventListener('DOMContentLoaded', async () => {

  // --- Create and Append Sidebar Overlay ---
  // A dedicated overlay element is more robust for handling outside clicks.
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // --- Securely Populate User Data in Sidebar ---
  const populateSidebarUserData = async () => {
    const userNameEl = document.getElementById('user-name');
    const userInitialEl = document.getElementById('user-initial');
    const userEmailEl = document.getElementById('user-email');
    const userIdEl = document.getElementById('user-id');

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        console.error('Error fetching user, or no user session found. Redirecting to login.', error);
        localStorage.clear();
        // window.location.href = 'index.html';
        return;
      }

      const { user } = data;
      const fullName = user.user_metadata?.full_name;
      const email = user.email;

      if (userNameEl && fullName) userNameEl.textContent = fullName;
      if (userInitialEl && fullName) userInitialEl.textContent = fullName.charAt(0).toUpperCase();
      if (userEmailEl && email) userEmailEl.textContent = email;
      if (userIdEl && user.id) userIdEl.textContent = `ID: ${user.id.substring(0, 5)}...`;
    
    } catch (e) {
        console.error('A critical error occurred while populating user data:', e);
        // window.location.href = 'index.html';
    }
  };

  // --- Sidebar Toggle Functionality (Using Overlay) ---
  const sidebarToggle = document.querySelector('.sidebar-toggle');

  // Ensure the body starts in a collapsed state for consistency.
  document.body.classList.add('sidebar-collapsed');

  if (sidebarToggle && overlay) {
    // Event to toggle the sidebar on button click.
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the click from bubbling to the document
      document.body.classList.toggle('sidebar-collapsed');
    });

    // Event to close the sidebar when clicking the overlay.
    overlay.addEventListener('click', () => {
      document.body.classList.add('sidebar-collapsed');
    });
  }

  // --- Set Active Navigation Link ---
  try {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
      }
    });
  } catch(e) {
      console.warn('Could not set active navigation link.', e);
  }

  // --- Logout Functionality ---
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = 'جاري تسجيل الخروج...';
      const { error } = await supabase.auth.signOut();

      if (!error) {
        console.log('Logout successful');
        window.location.href = 'index.html';
      } else {
        console.error('Logout failed:', error.message);
        // Restore button state on failure
        logoutButton.disabled = false;
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>تسجيل الخروج</span>';
      }
    });
  }

  // --- Initial calls ---
  await populateSidebarUserData();

});
