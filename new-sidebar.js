document.addEventListener('DOMContentLoaded', () => {
    // --- Sidebar Elements and Toggle --- //
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    const mainContent = document.querySelector('.main-content');

    // Sidebar HTML Structure
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2>القائمة</h2>
            <button class="close-sidebar">&times;</button>
        </div>
        <nav class="sidebar-nav">
            <ul>
                <li><a href="/index.html"><i class="fas fa-home"></i>الرئيسية</a></li>
                <li><a href="/harvest.html"><i class="fas fa-tractor"></i>متابعة التحصيل</a></li>
                <li><a href="/shops.html"><i class="fas fa-store"></i>المحلات</a></li>
                <li><a href="/monthly-reports.html"><i class="fas fa-chart-bar"></i>تقارير شهرية</a></li>
                <li><a href="/daily-reports.html"><i class="fas fa-chart-line"></i>تقارير يومية</a></li>
                <li><a href="/all-reports.html"><i class="fas fa-globe"></i>تقارير عامة</a></li>
                <li><a href="/settings.html"><i class="fas fa-cog"></i>الإعدادات</a></li>
                <li><a href="/profile.html"><i class="fas fa-user"></i>الملف الشخصي</a></li>
            </ul>
        </nav>
    `;

    document.body.appendChild(sidebar);

    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const closeSidebarBtn = sidebar.querySelector('.close-sidebar');

    // Function to toggle sidebar visibility
    const toggleSidebar = () => {
        sidebar.classList.toggle('show');
        mainContent.classList.toggle('sidebar-active'); // Optional: for adjusting main content
    };

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', toggleSidebar);
    }

    // --- Active Link Highlighting --- //
    const currentPath = window.location.pathname;
    const navLinks = sidebar.querySelectorAll('.sidebar-nav a');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});
