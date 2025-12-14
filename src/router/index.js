import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSessionManager } from '@/composables/useSessionManager'
// تمت إزالة استيراد supabase لأنه غير مستخدم هنا مباشرة، نعتمد على authStore

import MainLayout from '@/layouts/MainLayout.vue'
import logger from '@/utils/logger.js'

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
        meta: { requiresAuth: true, requiresAdmin: true }
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
  const { checkSessionValidity, getLastPage } = useSessionManager();

  logger.debug('🔍 Router Guard: Checking route:', to.path, 'from:', from.path);
  logger.debug('🔍 Auth initialized:', authStore.isInitialized, 'User:', authStore.user ? 'present' : 'null');

  // 1. Ensure Auth is Initialized
  // ننتظر التهيئة مرة واحدة فقط إذا لم تكن مكتملة
  if (!authStore.isInitialized) {
    logger.debug('🔄 Awaiting authStore.initializeAuth() in router guard...');
    try {
      await authStore.initializeAuth();
      logger.info('✅ Auth init completed. User after init:', authStore.user ? 'present' : 'null');
    } catch (error) {
      logger.error('❌ Auth init failed in router guard:', error);
      // Continue navigation even if auth init fails to avoid blocking the app.
    }
  }

  const isLoggedIn = !!authStore.user;
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  logger.debug('🔍 isLoggedIn:', isLoggedIn, 'requiresAuth:', requiresAuth);

  // 2. Logic for Logged-In Users trying to access Login page
  if (isLoggedIn && to.name === 'Login') {
    logger.info('👤 User already logged in, redirecting...');
    
    // Restore the last page if available
    const lastPage = getLastPage();
    if (lastPage && lastPage !== '/' && !lastPage.includes('login')) {
      logger.info('📍 Restoring last page:', lastPage);
      return next(lastPage);
    }
    
    return next({ name: 'Dashboard' });
  }

  // 3. Protected Routes Logic
  if (requiresAuth) {
    if (!isLoggedIn) {
      logger.warn('🛡️ Access denied. Redirecting to Login.');
      return next({ name: 'Login' });
    }

    // If user is logged in, avoid calling network-based session validity checks
    // on every navigation — this prevents navigation freezes when network/DNS
    // is flaky. We only perform explicit validity checks when user is missing
    // or when admin-only routes require an extra check below.

    // Admin-only route check
    const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
    if (requiresAdmin) {
      try {
        const user = authStore.user;
        const adminEmails = ['emontal.33@gmail.com'];
        const isAdmin = user && adminEmails.includes(user.email);
        if (!isAdmin) {
          logger.warn('⚠️ Access to admin route denied for user:', user?.email);
          return next({ name: 'Dashboard' });
        }
      } catch (err) {
        logger.error('Error checking admin permission:', err);
        return next({ name: 'Dashboard' });
      }
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
    logger.debug('📍 Page tracked:', to.fullPath);
  }
});

export default router;