document.addEventListener('DOMContentLoaded', () => {
  // --- Supabase Client Setup ---
  // We need to initialize Supabase here to handle logout securely.
  const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';
  const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

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

  // --- Correct Logout Functionality ---
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      console.log('🔒 Logging out user...');

      // 1. Sign out from Supabase
      const { error } = await _supabase.auth.signOut();
      
      // 2. Clear all local storage for a clean slate
      localStorage.clear();

      if (error) {
        console.error('❌ Error during logout:', error.message);
        // Still redirect even if there was an error
      } else {
        console.log('✅ Logout successful.');
      }

      // 3. Redirect to the login page
      window.location.href = 'index.html';
    });
  }
});