document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.querySelector('.sidebar-toggle');

  if (sidebar && sidebarToggle) {
    // التأكد من أن الزر ظاهر دائماً
    sidebarToggle.style.visibility = 'visible';
    sidebarToggle.style.opacity = '1';
    
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-collapsed');
      document.body.classList.toggle('sidebar-collapsed');
      
      if (sidebar.classList.contains('sidebar-collapsed')) {
        // IS NOW COLLAPSED (closing)
        sidebarToggle.style.transform = 'translateX(0)';
      } else {
        // IS NOW OPEN
        const sidebarWidth = sidebar.offsetWidth;
        sidebarToggle.style.transform = `translateX(-${sidebarWidth}px)`;
      }
    });

    // Close sidebar when clicking outside on mobile
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

  // Set active link
  const currentPage = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

  // Logout functionality
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      // Clear user data from local storage
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userInitial');

      // Redirect to the login page
      window.location.href = 'index.html';
    });
  }
});