import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore'
import logger from '@/utils/logger.js'

// استيراد المكونات الأساسية مباشرة لسرعة الفتح (Eager Loading)
import LoginView from '@/components/views/LoginView.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import DashboardView from '@/components/views/DashboardView.vue'
import HarvestView from '@/components/views/HarvestView.vue'

// الإبقاء على المكونات الثانوية كـ Lazy Loading لتقليل حجم الحزمة الأولية
const ArchiveView = () => import('@/components/views/ArchiveView.vue')
const CounterView = () => import('@/components/views/CounterView.vue')
const ReportsView = () => import('@/components/views/ReportsView.vue')
const SubscriptionsView = () => import('@/components/views/SubscriptionsView.vue')
const MySubscriptionView = () => import('@/components/views/MySubscriptionView.vue')
const PaymentView = () => import('@/components/views/PaymentView.vue')
const AdminView = () => import('@/components/views/AdminView.vue')
const ItineraryView = () => import('@/components/views/ItineraryView.vue')
const ShareHarvestView = () => import('@/components/views/ShareHarvestView.vue')
const AdminUserDetails = () => import('@/components/views/AdminUserDetails.vue')

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true }
  },
  {
    path: '/app',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'Dashboard' }
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { requiresSubscription: true }
      },
      {
        path: 'harvest',
        name: 'Harvest',
        component: HarvestView,
        meta: { requiresSubscription: true }
      },
      {
        path: 'itinerary',
        name: 'Itinerary',
        component: ItineraryView,
        meta: { requiresSubscription: true }
      },
      {
        path: 'share',
        name: 'Collaboration',
        component: ShareHarvestView,
        meta: { requiresSubscription: true }
      },
      {
        path: 'archive',
        name: 'Archive',
        component: ArchiveView,
        meta: { requiresSubscription: true }
      },
      {
        path: 'counter',
        name: 'Counter',
        component: CounterView,
        meta: { requiresSubscription: true }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: ReportsView,
        meta: { requiresSubscription: true }
      },
      {
        path: 'subscriptions',
        name: 'Subscriptions',
        component: SubscriptionsView
      },
      {
        path: 'my-subscription',
        name: 'MySubscription',
        component: MySubscriptionView
      },
      {
        path: 'payment',
        name: 'Payment',
        component: PaymentView
      },
      {
        path: 'admin',
        name: 'Admin',
        component: AdminView,
        meta: { requiresAdmin: true }
      },
      {
        path: 'admin/users/:id',
        name: 'AdminUserDetails',
        component: AdminUserDetails,
        meta: { requiresAdmin: true }
      }
    ]
  },
  {
    path: '/admin/users/:id',
    redirect: to => {
      return { path: `/app/admin/users/${to.params.id}` }
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    beforeEnter: (to, from, next) => {
      const authStore = useAuthStore();
      if (!authStore.isInitialized) {
        authStore.initializeAuth().then(() => {
          next(authStore.isAuthenticated ? { name: 'Dashboard' } : { name: 'Login' });
        });
      } else {
        next(authStore.isAuthenticated ? { name: 'Dashboard' } : { name: 'Login' });
      }
    },
    component: { template: '' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // ⚡ CRITICAL FIX: Overall timeout for entire guard (Reduced to 5s)
  const GUARD_TIMEOUT = 5000;

  try {
    await Promise.race([
      // Main guard logic
      (async () => {
        // 1. المصادقة الأولية
        if (!authStore.isInitialized) {
          await authStore.initializeAuth();
        }

        const isLoggedIn = authStore.isAuthenticated;
        const requiresAuth = to.matched.some(r => r.meta.requiresAuth);
        const requiresGuest = to.matched.some(r => r.meta.requiresGuest);

        // التعامل مع الروابط غير الموجودة
        if (to.name === 'NotFound') return next();

        // حماية المسارات التي تتطلب تسجيل دخول
        if (requiresAuth && !isLoggedIn) return next({ path: '/' });

        // توجيه الضيوف المسجلين دخولهم إلى لوحة التحكم
        if (requiresGuest && isLoggedIn) {
          const lastRoute = localStorage.getItem('app_last_route') || '/app/dashboard';
          return next(lastRoute);
        }

        // التحقق من الصلاحيات والاشتراك
        if (requiresAuth && isLoggedIn) {
          const requiresAdmin = to.matched.some(r => r.meta.requiresAdmin);
          if (requiresAdmin && !authStore.isAdmin) return next({ name: 'Dashboard' });

          const requiresSub = to.matched.some(r => r.meta.requiresSubscription);
          if (requiresSub && !authStore.isAdmin && authStore.isSubscriptionEnforced) {
            const subStore = useMySubscriptionStore();

            // التحقق من الاشتراك
            if (!subStore.isInitialized) {
              await subStore.init(authStore.user);
            }

            if (!subStore.isSubscribed) {
              return next({ name: 'MySubscription', query: { access: 'denied' } });
            }
          }
        }

        next();
      })(),

      // Timeout promise
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GUARD_TIMEOUT')), GUARD_TIMEOUT)
      )
    ]);

  } catch (err) {
    const isTimeout = err.message === 'GUARD_TIMEOUT';

    if (isTimeout) {
      logger.warn('⚠️ Router guard timed out - allowing navigation');
      // Allow navigation to proceed even on timeout
      next();
    } else {
      logger.error('🚀 Router Guard Error:', err);
      next(to.meta.requiresAuth ? '/' : undefined);
    }
  }
});

router.afterEach((to) => {
  if (to.path.startsWith('/app')) {
    localStorage.setItem('app_last_route', to.fullPath);
  }
})

// ⚡ CRITICAL: Handle ChunkLoadError (White Screen on Update)
// When a new version is deployed, old chunks are deleted. This causes navigation to fail.
// We catch this and force a reload to get new chunks.
router.onError((error, to) => {
  const pattern = /Loading chunk (\d)+ failed/g;
  const isChunkLoadFailed = error.message.match(pattern);
  const isImportFailed = error.message.includes('Failed to fetch dynamically imported module');

  if (isChunkLoadFailed || isImportFailed) {
    logger.error('🚀 dynamic import failed (New Version Deployed?), reloading...', error);

    // Prevent infinite reload loop if the error persists
    const targetPath = to.fullPath;
    const reloadKey = `reload_error_${targetPath}`;
    const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0');
    const now = Date.now();

    if (now - lastReload < 10000) {
      logger.error('❌ Reload loop detected, stopping reload.');
      return;
    }

    sessionStorage.setItem(reloadKey, String(now));
    window.location.assign(targetPath); // Hard reload to fetch new index.html
  } else {
    logger.error('Router Error:', error);
  }
});

export default router;
