import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSessionManager } from '@/composables/useSessionManager'
// تمت إزالة استيراد supabase لأنه غير مستخدم هنا مباشرة، نعتمد على authStore

import MainLayout from '@/layouts/MainLayout.vue'

// Lazy load components
const LoginView = () => import('@/components/views/LoginView.vue')
const DashboardView = () => import('@/components/views/DashboardView.vue')
const HarvestView = () => import('@/components/views/HarvestView.vue')
const ArchiveView = () => import('@/components/views/ArchiveView.vue')
const CounterView = () => import('@/components/views/CounterView.vue')
const AdminView = () => import('@/components/views/AdminView.vue')
const SubscriptionsView = () => import('@/components/views/SubscriptionsView.vue')
const MySubscriptionView = () => import('@/components/views/MySubscriptionView.vue')
const PaymentView = () => import('@/components/views/PaymentView.vue')

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/app',
    component: MainLayout,
    // توجيه تلقائي للداشبورد عند فتح /app فقط
    redirect: { name: 'Dashboard' },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { requiresAuth: true }
      },
      {
        path: 'harvest',
        name: 'Harvest',
        component: HarvestView,
        meta: { requiresAuth: true }
      },
      {
        path: 'archive',
        name: 'Archive',
        component: ArchiveView,
        meta: { requiresAuth: true }
      },
      {
        path: 'counter',
        name: 'Counter',
        component: CounterView,
        meta: { requiresAuth: true }
      },
      {
        path: 'subscriptions',
        name: 'Subscriptions',
        component: SubscriptionsView,
        meta: { requiresAuth: true }
      },
      {
        path: 'my-subscription',
        name: 'MySubscription',
        component: MySubscriptionView,
        meta: { requiresAuth: true }
      },
      {
        path: 'payment',
        name: 'Payment',
        component: PaymentView,
        meta: { requiresAuth: true }
      },
      {
        path: 'admin',
        name: 'Admin',
        component: AdminView,
        meta: { requiresAuth: true }
      }
    ]
  },
  // Redirect legacy routes to new structure
  { path: '/index.html', redirect: { name: 'Login' } },
  { path: '/dashboard.html', redirect: { name: 'Dashboard' } },
  { path: '/harvest.html', redirect: { name: 'Harvest' } },
  { path: '/archive.html', redirect: { name: 'Archive' } },
  { path: '/counter.html', redirect: { name: 'Counter' } },
  { path: '/admin.html', redirect: { name: 'Admin' } },
  // Catch all unknown routes
  { path: '/:pathMatch(.*)*', redirect: { name: 'Login' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// --- Enhanced Navigation Guard ---
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const { checkSessionValidity, getLastPage, shouldRestorePage } = useSessionManager();

  // 1. Ensure Auth is Initialized
  // ننتظر التهيئة مرة واحدة فقط إذا لم تكن مكتملة
  if (!authStore.isInitialized) {
    try {
      await authStore.initializeAuth();
    } catch (error) {
      console.error('❌ Auth init failed in router:', error);
    }
  }

  const isLoggedIn = !!authStore.user;
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // 2. Logic for Logged-In Users trying to access Login page
  if (isLoggedIn && to.name === 'Login') {
    console.log('👤 User already logged in, redirecting...');
    
    // Check if we should restore the last page
    // ملاحظة: تأكد أن shouldRestorePage في Composable لا تعيد true إذا كانت الصفحة الأخيرة هي Login
    const lastPage = getLastPage();
    if (shouldRestorePage() && lastPage && lastPage !== '/' && !lastPage.includes('login')) {
      console.log('📍 Restoring last page:', lastPage);
      return next(lastPage);
    }
    
    return next({ name: 'Dashboard' });
  }

  // 3. Protected Routes Logic
  if (requiresAuth) {
    if (!isLoggedIn) {
      console.log('🛡️ Access denied. Redirecting to Login.');
      return next({ name: 'Login' });
    }

    // Check session validity only for protected routes
    const isSessionValid = await checkSessionValidity();
    if (!isSessionValid) {
      console.log('⌛ Session expired. Redirecting to Login.');
      // ملاحظة: authStore.logout() قد يتم استدعاؤه داخل checkSessionValidity أو هنا
      return next({ name: 'Login' });
    }
  }

  // 4. Allow Navigation
  next();
});

// --- Page Tracking Hook ---
router.afterEach((to) => {
  // لا نحتاج لتتبع صفحة الدخول
  if (to.name !== 'Login') {
    const { saveCurrentPage } = useSessionManager();
    saveCurrentPage(to.fullPath);
    console.log('📍 Page tracked:', to.fullPath);
  }
});

export default router;