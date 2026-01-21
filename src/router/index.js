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
      }
    ]
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

  try {
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

  } catch (err) {
    logger.error('🚀 Router Guard Error:', err);
    next(to.meta.requiresAuth ? '/' : undefined);
  }
});

router.afterEach((to) => {
  if (to.path.startsWith('/app')) {
    localStorage.setItem('app_last_route', to.fullPath);
  }
})

export default router;
