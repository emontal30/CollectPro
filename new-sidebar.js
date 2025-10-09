
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle-btn");
    const overlay = document.getElementById("overlay");

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Stop the event from bubbling up
            sidebar.classList.toggle("active");
            overlay.classList.toggle("active");
        });

        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Assuming _supabase is available globally from supabase-client.js
            if (window._supabase) {
                window._supabase.auth.signOut()
                    .then(() => {
                        console.log('User signed out successfully.');
                        // Clear any user-related data from local storage
                        localStorage.removeItem('user-data');
                        localStorage.removeItem('token');
                        // Redirect to the login page
                        window.location.href = 'index.html'; 
                    })
                    .catch(error => {
                        console.error('Error signing out:', error.message);
                    });
            }
        });
    }

    // Set active link in sidebar
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.sidebar .nav-links a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});
