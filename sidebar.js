const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggle-btn");
const overlay = document.getElementById("overlay");

// Function to open the sidebar
const openSidebar = () => {
  if (sidebar) {
    sidebar.classList.add("active");
    sidebar.style.transform = "translateX(0)";
  }
  if (overlay) overlay.classList.add("active");
};

// Function to close the sidebar
const closeSidebar = () => {
  if (sidebar) {
    sidebar.classList.remove("active");
    sidebar.style.transform = "translateX(100%)";
  }
  if (overlay) overlay.classList.remove("active");
};

// Event listeners
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        // If sidebar is open, close it. Otherwise, open it.
        if (sidebar && sidebar.classList.contains("active")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
}

if (overlay) {
    overlay.addEventListener("click", closeSidebar);
}

function showAlert(message, type = 'info', duration = 4000) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} show`;
    alert.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    
    container.prepend(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 500);
    }, duration);
}

// Populate user data in sidebar
async function populateUserData() {
    try {
        // جلب بيانات المستخدم من Supabase مباشرة مثل صفحة اشتراكي
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('No user found, trying localStorage as fallback');
            // الرجوع للبيانات المحفوظة محلياً إذا لم يكن المستخدم مسجل دخوله
            const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (!userString) return;

            const userData = JSON.parse(userString);
            updateUserDisplay(userData);
            return;
        }

        updateUserDisplay(user);

    } catch (error) {
        console.error('Failed to get user data from Supabase, trying localStorage:', error);

        // الرجوع للبيانات المحفوظة محلياً في حالة الخطأ
        const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!userString) return;

        try {
            const user = JSON.parse(userString);
            updateUserDisplay(user);
        } catch (fallbackError) {
            console.error('Failed to parse user data from storage:', fallbackError);
        }
    }
}

function updateUserDisplay(user) {
    const userNameEl = document.getElementById('user-name');
    const userInitialEl = document.getElementById('user-initial');
    const userEmailEl = document.getElementById('user-email');
    const userIdEl = document.getElementById('user-id');

    // جلب اسم المستخدم من user_metadata أو البريد الإلكتروني كبديل
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';

    if (userNameEl) userNameEl.textContent = displayName;
    if (userInitialEl) userInitialEl.textContent = displayName.charAt(0).toUpperCase();
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userIdEl) userIdEl.textContent = `ID: ${user.id.slice(-7)}`;
}

// Add active class to current page link
document.addEventListener('DOMContentLoaded', () => {
    populateUserData();
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.sidebar .nav-links a');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }

        // Save last page on navigation
        link.addEventListener('click', () => {
            const href = link.getAttribute('href');
            if (href && href !== 'index.html') { // Don't save index.html as last page
                localStorage.setItem('lastPage', href);
            }
        });
    });

    // Add event listener for logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                if (!window.supabase) {
                    console.error('Supabase client is not initialized.');
                    showAlert('خطأ فادح: لم يتم تهيئة Supabase!', 'danger');
                    return;
                }
                const { error } = await supabase.auth.signOut();
                if (error) {
                    showAlert('فشل تسجيل الخروج: ' + error.message, 'danger');
                    return;
                }
                window.location.href = 'index.html';
            } catch (err) {
                showAlert('حدث خطأ أثناء تسجيل الخروج.', 'danger');
                console.error('Logout error:', err);
            }
        });
    }
});